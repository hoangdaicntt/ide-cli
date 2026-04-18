import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { DirectoryNode } from '../../shared/ipc';
import { flattenFiles } from '../../store/store';
import { useCodexStore } from '../../store/codexStore';
import { ApprovalCard } from './ApprovalCard';
import { CodexComposer } from './Composer';
import { FilePicker } from './FilePicker';
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
  const modes = useCodexStore((state) => state.modes);
  const connectionStatus = useCodexStore((state) => state.connectionStatus);
  const connectionError = useCodexStore((state) => state.connectionError);
  const projectState = useCodexStore((state) => state.projectStates[projectId]);
  const setDraft = useCodexStore((state) => state.setDraft);
  const setSelectedModel = useCodexStore((state) => state.setSelectedModel);
  const setSelectedMode = useCodexStore((state) => state.setSelectedMode);
  const setSelectedReasoningEffort = useCodexStore((state) => state.setSelectedReasoningEffort);
  const setSelectedApprovalPolicy = useCodexStore((state) => state.setSelectedApprovalPolicy);
  const setSelectedSandboxMode = useCodexStore((state) => state.setSelectedSandboxMode);
  const loadProjectThreads = useCodexStore((state) => state.loadProjectThreads);
  const sendPrompt = useCodexStore((state) => state.sendPrompt);
  const interruptTurn = useCodexStore((state) => state.interruptTurn);
  const toggleAttachedFile = useCodexStore((state) => state.toggleAttachedFile);
  const removeAttachedFile = useCodexStore((state) => state.removeAttachedFile);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fileQuery, setFileQuery] = useState('');
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

    return files.filter((file) => file.path.toLowerCase().includes(normalizedQuery));
  }, [deferredFileQuery, files]);

  const selectedModel =
    projectState?.selectedModel ?? models.find((model) => model.isDefault)?.model ?? models[0]?.model ?? '';
  const selectedMode = projectState?.selectedMode ?? 'default';
  const selectedReasoningEffort = projectState?.selectedReasoningEffort ?? 'medium';
  const selectedApprovalPolicy = projectState?.selectedApprovalPolicy ?? 'on-request';
  const selectedSandboxMode = projectState?.selectedSandboxMode ?? 'workspace-write';
  const draft = projectState?.draft ?? '';
  const attachedFilePaths = projectState?.attachedFilePaths ?? [];
  const messages = projectState?.messages ?? [];
  const pendingRequests = projectState?.pendingRequests ?? [];
  const isLoadingHistory = projectState?.isLoadingHistory ?? false;
  const isSending = projectState?.isSending ?? false;
  const canInterrupt = Boolean(projectState?.threadId && projectState?.activeTurnId);
  const transcript = useMemo(() => buildTranscript(messages), [messages]);
  const previousMessageCount = Math.max(transcript.length - 1, 0);

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
    }
  }, [pickerOpen]);

  const replaceMentionDraft = (currentDraft: string, nextValue: string) => {
    const match = currentDraft.match(/(^|\s)@([^\s@]*)$/);

    if (!match || !nextValue) {
      return currentDraft;
    }

    return currentDraft.replace(/(^|\s)@([^\s@]*)$/, '$1').replace(/\s+$/, ' ');
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#fcfcfd]">
      <CodexHeader
        rootPath={rootPath}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
      />

      <div ref={timelineRef} className="flex-1 overflow-auto px-8 py-6">
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
        attachedFilePaths={attachedFilePaths}
        connectionStatus={connectionStatus}
        isSending={isSending}
        canInterrupt={canInterrupt}
        modes={modes}
        models={models}
        selectedMode={selectedMode}
        selectedModel={selectedModel}
        selectedReasoningEffort={selectedReasoningEffort}
        selectedSandboxMode={selectedSandboxMode}
        selectedApprovalPolicy={selectedApprovalPolicy}
        isMentionActive={pickerOpen}
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
        onTogglePicker={() => setPickerOpen((current) => !current)}
        onRemoveAttachedFile={(filePath) => removeAttachedFile(projectId, filePath)}
        onSelectMode={(value) => setSelectedMode(projectId, value)}
        onSelectModel={(value) => setSelectedModel(projectId, value)}
        onSelectReasoningEffort={(value) => setSelectedReasoningEffort(projectId, value)}
        onSelectSandboxMode={(value) => setSelectedSandboxMode(projectId, value)}
        onSelectApprovalPolicy={(value) => setSelectedApprovalPolicy(projectId, value)}
        onMentionQueryChange={(value) => {
          if (value === null) {
            setPickerOpen(false);
            setFileQuery('');
            return;
          }

          setPickerOpen(true);
          setFileQuery(value);
        }}
        onMentionSelect={() => {
          const firstFile = filteredFiles[0];

          if (!firstFile) {
            return;
          }

          toggleAttachedFile(projectId, firstFile.path);
          setDraft(projectId, replaceMentionDraft(draft, firstFile.path));
          setPickerOpen(false);
          setFileQuery('');
        }}
      />

      {pickerOpen ? (
        <FilePicker
          rootPath={rootPath}
          files={filteredFiles}
          attachedFilePaths={attachedFilePaths}
          fileQuery={fileQuery}
          onQueryChange={setFileQuery}
          onToggleFile={(filePath) => {
            toggleAttachedFile(projectId, filePath);
            setDraft(projectId, replaceMentionDraft(draft, filePath));
            setPickerOpen(false);
            setFileQuery('');
          }}
        />
      ) : null}
    </div>
  );
}
