import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { DirectoryNode, FileNode } from '../../shared/ipc';
import { getDisplayNameFromPath, getRelativePath } from '../../store/store';
import { useCodexStore } from '../../store/codexStore';
import { ApprovalCard } from './ApprovalCard';
import { CodexComposer } from './Composer';
import type { ContextPickerItem } from './FilePicker';
import { CodexHeader } from './Header';
import { TranscriptView } from './TranscriptView';
import { buildTranscript } from './types';

type CodexPanelProps = {
  projectId: string;
  rootPath: string;
  tree: DirectoryNode[];
};

function getContextRelativePath(rootPath: string, targetPath: string, name: string): string {
  const normalizedRoot = rootPath.replace(/\\/g, '/');
  const normalizedTarget = targetPath.replace(/\\/g, '/');

  if (normalizedTarget === normalizedRoot) {
    return name;
  }

  if (normalizedTarget.startsWith(`${normalizedRoot}/`)) {
    return normalizedTarget.slice(normalizedRoot.length + 1);
  }

  return targetPath;
}

function flattenContextItems(nodes: Array<DirectoryNode | FileNode>, rootPath: string): ContextPickerItem[] {
  const items: ContextPickerItem[] = [];

  for (const node of nodes) {
    if (node.type === 'directory') {
      items.push({
        type: 'directory',
        path: node.path,
        name: node.name,
        relativePath: getContextRelativePath(rootPath, node.path, node.name),
      });
      items.push(...flattenContextItems(node.children, rootPath));
      continue;
    }

    items.push({
      type: 'file',
      path: node.path,
      name: node.name,
      relativePath: getContextRelativePath(rootPath, node.path, node.name),
    });
  }

  return items;
}

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

  const contextItems = useMemo(() => flattenContextItems(tree, rootPath), [tree, rootPath]);
  const contextItemByPath = useMemo(() => new Map(contextItems.map((item) => [item.path, item])), [contextItems]);
  const deferredFileQuery = useDeferredValue(fileQuery);
  const filteredItems = useMemo(() => {
    const normalizedQuery = deferredFileQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return contextItems;
    }

    return contextItems.filter((item) => {
      return item.relativePath.toLowerCase().includes(normalizedQuery) || item.name.toLowerCase().includes(normalizedQuery);
    });
  }, [contextItems, deferredFileQuery]);

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
  const attachedItems = useMemo(
    () =>
      attachedFilePaths.map((targetPath) => {
        const fallback: ContextPickerItem = {
          type: 'file',
          path: targetPath,
          name: getDisplayNameFromPath(targetPath),
          relativePath: getRelativePath(rootPath, targetPath),
        };

        return contextItemByPath.get(targetPath) ?? fallback;
      }),
    [attachedFilePaths, contextItemByPath, rootPath],
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

    let replaceStart = mentionRange.start;
    let replaceEnd = mentionRange.end;

    while (replaceStart > 0 && currentDraft[replaceStart - 1] === '@') {
      replaceStart -= 1;
    }

    while (replaceEnd < currentDraft.length && /[^\s]/.test(currentDraft[replaceEnd] ?? '') && currentDraft[replaceEnd] !== '@') {
      replaceEnd += 1;
    }

    const before = currentDraft.slice(0, replaceStart).replace(/@+$/, '');
    const after = currentDraft.slice(replaceEnd);
    const normalizedValue = nextValue.replace(/^@+/, '');
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const needsTrailingSpace = after.length > 0 && !/^\s/.test(after);

    return `${before}${needsLeadingSpace ? ' ' : ''}${normalizedValue}${needsTrailingSpace ? ' ' : ''}${after}`;
  };

  const handleSelectMention = (targetPath?: string) => {
    const selectedItem = targetPath
      ? filteredItems.find((item) => item.path === targetPath) ?? contextItemByPath.get(targetPath)
      : filteredItems[highlightedFileIndex];

    if (!selectedItem) {
      return;
    }

    if (!attachedFilePaths.includes(selectedItem.path)) {
      toggleAttachedFile(projectId, selectedItem.path);
    }

    const mentionLabel =
      selectedItem.type === 'directory' && !selectedItem.relativePath.endsWith('/')
        ? `${selectedItem.relativePath}/`
        : selectedItem.relativePath;

    setDraft(projectId, replaceMentionDraft(draft, mentionLabel));
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
        attachedItems={attachedItems}
        isMentionActive={pickerOpen}
        mentionItems={filteredItems}
        highlightedMentionIndex={highlightedFileIndex}
        onDraftChange={(value) => setDraft(projectId, value)}
        onSubmit={() => {
          void sendPrompt({
            projectId,
            rootPath,
            tree,
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
        onMentionSelect={(path) => {
          handleSelectMention(path);
        }}
        onMoveMentionSelection={(direction) => {
          if (filteredItems.length === 0) {
            return;
          }

          setHighlightedFileIndex((current) =>
            direction === 'down' ? (current + 1) % filteredItems.length : (current - 1 + filteredItems.length) % filteredItems.length,
          );
        }}
        onMentionHover={setHighlightedFileIndex}
      />
    </div>
  );
}

export type { ContextPickerItem };
