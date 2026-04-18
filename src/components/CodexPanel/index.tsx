import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { DirectoryNode } from '../../shared/ipc';
import { flattenFiles, getDisplayNameFromPath, getRelativePath } from '../../store/store';
import { useCodexStore } from '../../store/codexStore';
import { ApprovalCard } from './ApprovalCard';
import { CodexComposer } from './Composer';
import { CodexHeader } from './Header';
import { TranscriptView } from './TranscriptView';
import { buildTranscript } from './types';

type CodexPanelProps = {
  projectId: string;
  rootPath: string;
  tree: DirectoryNode[];
};

export function CodexPanel({ projectId, rootPath, tree }: CodexPanelProps) {
  const initialize = useCodexStore((state) => state.initialize);
  const models = useCodexStore((state) => state.models);
  const connectionStatus = useCodexStore((state) => state.connectionStatus);
  const connectionError = useCodexStore((state) => state.connectionError);
  const projectState = useCodexStore((state) => state.projectStates[projectId]);
  const setDraft = useCodexStore((state) => state.setDraft);
  const setSelectedModel = useCodexStore((state) => state.setSelectedModel);
  const setSelectedReasoningEffort = useCodexStore((state) => state.setSelectedReasoningEffort);
  const setSelectedApprovalPolicy = useCodexStore((state) => state.setSelectedApprovalPolicy);
  const toggleAttachedFile = useCodexStore((state) => state.toggleAttachedFile);
  const removeAttachedFile = useCodexStore((state) => state.removeAttachedFile);
  const loadProjectThreads = useCodexStore((state) => state.loadProjectThreads);
  const sendPrompt = useCodexStore((state) => state.sendPrompt);
  const interruptTurn = useCodexStore((state) => state.interruptTurn);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fileQuery, setFileQuery] = useState('');
  const [highlightedFileIndex, setHighlightedFileIndex] = useState(0);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void loadProjectThreads({ projectId, rootPath });
  }, [loadProjectThreads, projectId, rootPath]);

  const files = useMemo(() => flattenFiles(tree), [tree]);
  const deferredFileQuery = useDeferredValue(fileQuery);
  const filteredFiles = useMemo(() => {
    const normalizedQuery = deferredFileQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return files;
    }

    return files.filter((file) => {
      const relativePath = getRelativePath(rootPath, file.path).toLowerCase();
      return relativePath.includes(normalizedQuery) || file.name.toLowerCase().includes(normalizedQuery);
    });
  }, [deferredFileQuery, files, rootPath]);

  const selectedModel =
    projectState?.selectedModel ?? models.find((model) => model.isDefault)?.model ?? models[0]?.model ?? '';
  const selectedReasoningEffort = projectState?.selectedReasoningEffort ?? 'medium';
  const selectedApprovalPolicy = projectState?.selectedApprovalPolicy ?? 'on-request';
  const draft = projectState?.draft ?? '';
  const messages = projectState?.messages ?? [];
  const attachedFilePaths = projectState?.attachedFilePaths ?? [];
  const pendingRequests = projectState?.pendingRequests ?? [];
  const isLoadingHistory = projectState?.isLoadingHistory ?? false;
  const isSending = projectState?.isSending ?? false;
  const canInterrupt = Boolean(projectState?.threadId && projectState?.activeTurnId);
  const transcript = useMemo(() => buildTranscript(messages), [messages]);
  const previousMessageCount = Math.max(transcript.length - 1, 0);
  const attachedFiles = useMemo(
    () =>
      attachedFilePaths.map((filePath) => ({
        path: filePath,
        name: getDisplayNameFromPath(filePath),
        relativePath: getRelativePath(rootPath, filePath),
      })),
    [attachedFilePaths, rootPath],
  );

  useEffect(() => {
    if (!projectState?.selectedModel && selectedModel) {
      setSelectedModel(projectId, selectedModel);
    }
  }, [projectId, projectState?.selectedModel, selectedModel, setSelectedModel]);

  useEffect(() => {
    const host = timelineRef.current;

    if (!host) {
      return;
    }

    host.scrollTop = host.scrollHeight;
  }, [messages, pendingRequests, projectId]);

  useEffect(() => {
    if (!pickerOpen) {
      setFileQuery('');
      setHighlightedFileIndex(0);
      setMentionRange(null);
    }
  }, [pickerOpen]);

  useEffect(() => {
    setHighlightedFileIndex(0);
  }, [fileQuery]);

  const replaceMentionDraft = (currentDraft: string, nextValue: string) => {
    if (!mentionRange || !nextValue) {
      return currentDraft;
    }

    const before = currentDraft.slice(0, mentionRange.start);
    const after = currentDraft.slice(mentionRange.end);
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const needsTrailingSpace = after.length > 0 && !/^\s/.test(after);

    return `${before}${needsLeadingSpace ? ' ' : ''}${nextValue}${needsTrailingSpace ? ' ' : ''}${after}`;
  };

  const handleSelectMention = (targetPath?: string) => {
    const selectedPath = targetPath ?? filteredFiles[highlightedFileIndex]?.path;

    if (!selectedPath) {
      return;
    }

    const relativePath = selectedPath.startsWith(rootPath) ? selectedPath.slice(rootPath.length + 1) : selectedPath;

    if (!attachedFilePaths.includes(selectedPath)) {
      toggleAttachedFile(projectId, selectedPath);
    }

    setDraft(projectId, replaceMentionDraft(draft, `@${relativePath}`));
    setPickerOpen(false);
    setFileQuery('');
    setHighlightedFileIndex(0);
    setMentionRange(null);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--panel-bg)]">
      <CodexHeader
        rootPath={rootPath}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
      />

      <div ref={timelineRef} className="flex-1 overflow-auto px-4 py-4 custom-scrollbar">
        <TranscriptView
          transcript={transcript}
          pendingRequests={pendingRequests}
          projectId={projectId}
          isLoadingHistory={isLoadingHistory}
          previousMessageCount={previousMessageCount}
          ApprovalCard={ApprovalCard}
        />
      </div>

      <CodexComposer
        draft={draft}
        connectionStatus={connectionStatus}
        isSending={isSending}
        canInterrupt={canInterrupt}
        models={models}
        selectedModel={selectedModel}
        selectedReasoningEffort={selectedReasoningEffort}
        selectedApprovalPolicy={selectedApprovalPolicy}
        attachedFiles={attachedFiles}
        isMentionActive={pickerOpen}
        mentionFiles={filteredFiles}
        highlightedMentionIndex={highlightedFileIndex}
        mentionRootPath={rootPath}
        onDraftChange={(value) => setDraft(projectId, value)}
        onSubmit={() => {
          void sendPrompt({
            projectId,
            rootPath,
            prompt: draft,
          });
        }}
        onInterrupt={() => {
          void interruptTurn(projectId);
        }}
        onSelectModel={(value) => setSelectedModel(projectId, value)}
        onSelectReasoningEffort={(value) => setSelectedReasoningEffort(projectId, value)}
        onSelectApprovalPolicy={(value) => setSelectedApprovalPolicy(projectId, value)}
        onRemoveAttachment={(filePath) => removeAttachedFile(projectId, filePath)}
        onMentionQueryChange={(value) => {
          if (value === null) {
            setPickerOpen(false);
            setFileQuery('');
            setMentionRange(null);
            return;
          }

          setPickerOpen(true);
          setFileQuery(value.query);
          setMentionRange({ start: value.start, end: value.end });
        }}
        onMentionSelect={() => {
          handleSelectMention();
        }}
        onMoveMentionSelection={(direction) => {
          if (filteredFiles.length === 0) {
            return;
          }

          setHighlightedFileIndex((current) =>
            direction === 'down' ? (current + 1) % filteredFiles.length : (current - 1 + filteredFiles.length) % filteredFiles.length,
          );
        }}
        onMentionHover={setHighlightedFileIndex}
      />
    </div>
  );
}
