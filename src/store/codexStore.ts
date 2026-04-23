import { create } from 'zustand';
import type { DirectoryNode, FileNode } from '../shared/ipc';
import type {
  CodexApprovalPolicy,
  CodexConnectionStatus,
  CodexHistoryItem,
  CodexHistoryTurn,
  CodexMode,
  CodexModeKind,
  CodexModel,
  CodexNotification,
  CodexReasoningEffort,
  CodexSandboxMode,
  CodexServerRequest,
  CodexThread,
  CodexTurnStartInput,
} from '../shared/codex';
import { applyMentionMarkdown } from '../components/CodexPanel/MentionText';

export type CodexChatMessage =
  | {
      id: string;
      createdAt?: number;
      kind: 'user';
      text: string;
      attachments: string[];
      turnId: string | null;
    }
  | {
      id: string;
      createdAt?: number;
      kind: 'agent';
      itemId: string;
      turnId: string | null;
      text: string;
      status: string;
    }
  | {
      id: string;
      createdAt?: number;
      kind: 'reasoning';
      itemId: string;
      turnId: string | null;
      text: string;
      status: string;
    }
  | {
      id: string;
      createdAt?: number;
      kind: 'command';
      itemId: string;
      turnId: string | null;
      command: string[];
      cwd: string | null;
      output: string;
      status: string;
    }
  | {
      id: string;
      createdAt?: number;
      kind: 'fileChange';
      itemId: string;
      turnId: string | null;
      status: string;
      files: Array<{
        path: string;
        kind?: string;
        diff?: string;
      }>;
    }
  | {
      id: string;
      createdAt?: number;
      kind: 'system';
      text: string;
      tone: 'info' | 'error';
    };

export type PendingCodexRequest = {
  requestId: number | string;
  method: CodexServerRequest['method'];
  threadId: string;
  turnId: string | null;
  itemId: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
};

type ProjectCodexState = {
  threadId: string | null;
  runningThreadId: string | null;
  threadSummaries: CodexThread[];
  draft: string;
  attachedFilePaths: string[];
  selectedModel: string | null;
  selectedMode: CodexModeKind;
  selectedReasoningEffort: CodexReasoningEffort | null;
  selectedApprovalPolicy: CodexApprovalPolicy;
  selectedSandboxMode: CodexSandboxMode;
  activeTurnId: string | null;
  isSending: boolean;
  isLoadingHistory: boolean;
  messages: CodexChatMessage[];
  pendingRequests: PendingCodexRequest[];
};

type PersistedCodexProjectState = Pick<
  ProjectCodexState,
  | 'threadId'
  | 'draft'
  | 'attachedFilePaths'
  | 'selectedModel'
  | 'selectedMode'
  | 'selectedReasoningEffort'
  | 'selectedApprovalPolicy'
  | 'selectedSandboxMode'
>;

type PersistedCodexState = {
  version: 1;
  projectStates: Record<string, PersistedCodexProjectState>;
};

type CodexStore = {
  connectionStatus: CodexConnectionStatus;
  connectionError: string | null;
  models: CodexModel[];
  modes: CodexMode[];
  initialized: boolean;
  projectStates: Record<string, ProjectCodexState>;
  threadToProjectId: Record<string, string>;
  initialize: () => Promise<void>;
  setDraft: (projectId: string, draft: string) => void;
  toggleAttachedFile: (projectId: string, filePath: string) => void;
  removeAttachedFile: (projectId: string, filePath: string) => void;
  setSelectedModel: (projectId: string, model: string) => void;
  setSelectedMode: (projectId: string, mode: CodexModeKind) => void;
  setSelectedReasoningEffort: (projectId: string, effort: CodexReasoningEffort | null) => void;
  setSelectedApprovalPolicy: (projectId: string, policy: CodexApprovalPolicy) => void;
  setSelectedSandboxMode: (projectId: string, sandboxMode: CodexSandboxMode) => void;
  loadProjectThreads: (input: { projectId: string; rootPath: string }) => Promise<void>;
  selectThread: (input: { projectId: string; threadId: string }) => Promise<void>;
  newChat: (projectId: string) => void;
  sendPrompt: (input: { projectId: string; rootPath: string; tree: DirectoryNode[]; prompt: string }) => Promise<void>;
  interruptTurn: (projectId: string) => Promise<void>;
  resolvePendingRequest: (input: {
    projectId: string;
    requestId: number | string;
    decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel';
  }) => Promise<void>;
  handleNotification: (event: CodexNotification) => void;
  handleServerRequest: (request: CodexServerRequest) => void;
};

const defaultProjectState = (): ProjectCodexState => ({
  threadId: null,
  runningThreadId: null,
  threadSummaries: [],
  draft: '',
  attachedFilePaths: [],
  selectedModel: null,
  selectedMode: 'default',
  selectedReasoningEffort: null,
  selectedApprovalPolicy: 'on-request',
  selectedSandboxMode: 'workspace-write',
  activeTurnId: null,
  isSending: false,
  isLoadingHistory: false,
  messages: [],
  pendingRequests: [],
});

let codexInitializationPromise: Promise<void> | null = null;
let codexEventBindingsInitialized = false;
let codexPersistenceInitialized = false;
const resumedThreadIds = new Set<string>();
const CODEX_PERSISTENCE_KEY = 'ide-cli.codex.state.v1';

function ensureProjectState(state: CodexStore, projectId: string): ProjectCodexState {
  return state.projectStates[projectId] ?? defaultProjectState();
}

function withProjectState(
  state: CodexStore,
  projectId: string,
  updater: (projectState: ProjectCodexState) => ProjectCodexState,
): Record<string, ProjectCodexState> {
  const current = ensureProjectState(state, projectId);

  return {
    ...state.projectStates,
    [projectId]: updater(current),
  };
}

function buildSandboxPolicy(rootPath: string, sandboxMode: CodexSandboxMode): CodexTurnStartInput['sandboxPolicy'] {
  switch (sandboxMode) {
    case 'read-only':
      return {
        type: 'readOnly',
        networkAccess: false,
      };
    case 'danger-full-access':
      return {
        type: 'dangerFullAccess',
      };
    case 'workspace-write':
    default:
      return {
        type: 'workspaceWrite',
        writableRoots: [rootPath],
        networkAccess: true,
      };
  }
}

function getProjectIdByThreadId(state: CodexStore, threadId: string): string | null {
  return state.threadToProjectId[threadId] ?? null;
}

function upsertMessage(messages: CodexChatMessage[], nextMessage: CodexChatMessage): CodexChatMessage[] {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);
  const createdAt = nextMessage.createdAt ?? (existingIndex >= 0 ? messages[existingIndex]?.createdAt : undefined) ?? Date.now();
  const normalizedMessage = {
    ...nextMessage,
    createdAt,
  } satisfies CodexChatMessage;

  if (existingIndex === -1) {
    return [...messages, normalizedMessage];
  }

  return messages.map((message, index) => {
    if (index !== existingIndex) {
      return message;
    }

    return normalizedMessage;
  });
}

function getDefaultModel(models: CodexModel[]): string | null {
  return models.find((model) => model.isDefault)?.model ?? models[0]?.model ?? null;
}

function getRelativeAttachmentLabel(rootPath: string, targetPath: string): string {
  const normalizedRoot = rootPath.replace(/\\/g, '/');
  const normalizedTarget = targetPath.replace(/\\/g, '/');

  if (normalizedTarget === normalizedRoot) {
    const segments = normalizedTarget.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? targetPath;
  }

  if (normalizedTarget.startsWith(`${normalizedRoot}/`)) {
    return normalizedTarget.slice(normalizedRoot.length + 1);
  }

  return targetPath;
}

function buildAttachedPathEntries(attachedPaths: string[], rootPath: string): Array<{ path: string; relativeLabel: string }> {
  const resolved: Array<{ path: string; relativeLabel: string }> = [];
  const seen = new Set<string>();

  for (const attachedPath of attachedPaths) {
    if (seen.has(attachedPath)) {
      continue;
    }

    seen.add(attachedPath);
    resolved.push({
      path: attachedPath,
      relativeLabel: getRelativeAttachmentLabel(rootPath, attachedPath),
    });
  }

  return resolved;
}

function buildAttachmentContextText(entries: Array<{ path: string; relativeLabel: string }>): string | null {
  if (entries.length === 0) {
    return null;
  }

  return [
    'Attached paths:',
    ...entries.map((entry) => `- ${entry.relativeLabel} | ${entry.path}`),
    'Read the attached paths from the workspace as needed. Their contents are not inlined in this message.',
  ].join('\n');
}

function normalizeCommandParts(value: unknown): string[] {
  if (typeof value === 'string') {
    const command = value.trim();
    return command ? [command] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((part): part is string => typeof part === 'string')
    .map((part) => part.trim())
    .filter(Boolean);
}

function sortThreadSummaries(threads: CodexThread[]): CodexThread[] {
  return [...threads].sort((left, right) => (right.updatedAt ?? right.createdAt ?? 0) - (left.updatedAt ?? left.createdAt ?? 0));
}

function mergeThreadSummary(existing: CodexThread[], nextThread: CodexThread): CodexThread[] {
  const merged = [
    nextThread,
    ...existing.filter((thread) => thread.id !== nextThread.id),
  ];

  return sortThreadSummaries(merged);
}

function mergeThreadSummaries(existing: CodexThread[], nextThreads: CodexThread[]): CodexThread[] {
  const byId = new Map(existing.map((thread) => [thread.id, thread]));

  for (const thread of nextThreads) {
    byId.set(thread.id, {
      ...byId.get(thread.id),
      ...thread,
    });
  }

  return sortThreadSummaries(Array.from(byId.values()));
}

function stringifyUserInputContent(content: unknown[]): { text: string; attachments: string[] } {
  const textParts: string[] = [];
  const attachments: string[] = [];
  const attachedFileBlockPattern = /Attached file:\s+([^\n]+)\n```[\s\S]*?```/g;
  const attachedPathBlockPattern =
    /Attached paths:\n((?:- [^\n]+\n)+)Read the attached paths from the workspace as needed\. Their contents are not inlined in this message\.?/g;

  for (const item of content) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    const itemType = typeof candidate.type === 'string' ? candidate.type : '';

    if (itemType === 'text' && typeof candidate.text === 'string') {
      let textValue = candidate.text;
      const fileMatches = Array.from(textValue.matchAll(attachedFileBlockPattern));

      if (fileMatches.length > 0) {
        for (const match of fileMatches) {
          const attachmentLabel = match[1]?.trim();

          if (attachmentLabel) {
            attachments.push(attachmentLabel);
          }
        }

        textValue = textValue.replace(attachedFileBlockPattern, '').trim();
      }

      const pathMatches = Array.from(textValue.matchAll(attachedPathBlockPattern));

      if (pathMatches.length > 0) {
        for (const match of pathMatches) {
          const block = match[1] ?? '';

          for (const line of block.split('\n')) {
            const attachmentLabel = line.replace(/^- /, '').split('|')[0]?.trim();

            if (attachmentLabel) {
              attachments.push(attachmentLabel);
            }
          }
        }

        textValue = textValue.replace(attachedPathBlockPattern, '').trim();
      }

      if (textValue) {
        textParts.push(textValue);
      }
      continue;
    }

    if ((itemType === 'localImage' || itemType === 'mention' || itemType === 'skill') && typeof candidate.path === 'string') {
      attachments.push(candidate.path);
    }
  }

  return {
    text: textParts.join('\n\n').trim(),
    attachments,
  };
}

function mapHistoryItemToMessages(item: CodexHistoryItem, turnId: string): CodexChatMessage[] {
  switch (item.type) {
    case 'userMessage': {
      const userItem = item as Extract<CodexHistoryItem, { type: 'userMessage' }>;
      const { text, attachments } = stringifyUserInputContent(userItem.content as unknown[]);

      return [
        {
          id: `history-user-${userItem.id}`,
          kind: 'user',
          text,
          attachments,
          turnId,
        },
      ];
    }
    case 'agentMessage': {
      const agentItem = item as Extract<CodexHistoryItem, { type: 'agentMessage' }>;

      return [
        {
          id: agentItem.id,
          kind: 'agent',
          itemId: agentItem.id,
          turnId,
          text: agentItem.text,
          status: 'completed',
        },
      ];
    }
    case 'reasoning': {
      const reasoningItem = item as Extract<CodexHistoryItem, { type: 'reasoning' }>;
      const summary = Array.isArray(reasoningItem.summary)
        ? reasoningItem.summary.join('\n')
        : typeof reasoningItem.summary === 'string'
          ? reasoningItem.summary
          : '';

      return [
        {
          id: reasoningItem.id,
          kind: 'reasoning',
          itemId: reasoningItem.id,
          turnId,
          text: summary,
          status: 'completed',
        },
      ];
    }
    case 'commandExecution': {
      const commandItem = item as Extract<CodexHistoryItem, { type: 'commandExecution' }>;

      return [
        {
          id: commandItem.id,
          kind: 'command',
          itemId: commandItem.id,
          turnId,
          command: normalizeCommandParts(commandItem.command),
          cwd: commandItem.cwd ?? null,
          output: commandItem.aggregatedOutput ?? '',
          status: commandItem.status ?? 'completed',
        },
      ];
    }
    case 'fileChange': {
      const fileChangeItem = item as Extract<CodexHistoryItem, { type: 'fileChange' }>;

      return [
        {
          id: fileChangeItem.id,
          kind: 'fileChange',
          itemId: fileChangeItem.id,
          turnId,
          status: fileChangeItem.status ?? 'completed',
          files: fileChangeItem.changes ?? [],
        },
      ];
    }
    default:
      return [];
  }
}

function mapHistoryTurnsToMessages(turns: CodexHistoryTurn[] | undefined): CodexChatMessage[] {
  if (!turns) {
    return [];
  }

  const messages: CodexChatMessage[] = [];

  for (const turn of turns) {
    const items = turn.items ?? [];

    for (const item of items) {
      messages.push(...mapHistoryItemToMessages(item, turn.id));
    }

    if (turn.status === 'failed' && turn.error?.message) {
      messages.push({
        id: `history-error-${turn.id}`,
        kind: 'system',
        tone: 'error',
        text: turn.error.message,
      });
    }
  }

  return messages;
}

function readPersistedCodexState(): PersistedCodexState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CODEX_PERSISTENCE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedCodexState;

    if (parsed.version !== 1 || !parsed.projectStates || typeof parsed.projectStates !== 'object') {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[codex:persist] Failed to read persisted Codex state.', error);
    return null;
  }
}

function buildPersistedCodexState(projectStates: Record<string, ProjectCodexState>): PersistedCodexState {
  const serializedProjectStates = Object.fromEntries(
    Object.entries(projectStates).map(([projectId, projectState]) => [
      projectId,
      {
        threadId: projectState.threadId,
        draft: projectState.draft,
        attachedFilePaths: projectState.attachedFilePaths,
        selectedModel: projectState.selectedModel,
        selectedMode: projectState.selectedMode,
        selectedReasoningEffort: projectState.selectedReasoningEffort,
        selectedApprovalPolicy: projectState.selectedApprovalPolicy,
        selectedSandboxMode: projectState.selectedSandboxMode,
      } satisfies PersistedCodexProjectState,
    ]),
  );

  return {
    version: 1,
    projectStates: serializedProjectStates,
  };
}

function hydratePersistedProjectStates(): Record<string, ProjectCodexState> {
  const persistedState = readPersistedCodexState();

  if (!persistedState) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(persistedState.projectStates).map(([projectId, projectState]) => [
      projectId,
      {
        ...defaultProjectState(),
        ...projectState,
        runningThreadId: null,
        pendingRequests: [],
        activeTurnId: null,
        isSending: false,
      } satisfies ProjectCodexState,
    ]),
  );
}

async function resumePersistedThreads(
  projectStates: Record<string, ProjectCodexState>,
  set: (
    partial:
      | Partial<CodexStore>
      | ((state: CodexStore) => Partial<CodexStore> | CodexStore),
  ) => void,
): Promise<void> {
  const entries = Object.entries(projectStates).filter(([, projectState]) => Boolean(projectState.threadId));

  await Promise.all(
    entries.map(async ([projectId, projectState]) => {
      if (!projectState.threadId || resumedThreadIds.has(projectState.threadId)) {
        return;
      }

      try {
        await window.electronAPI.codexResumeThread(projectState.threadId);
        resumedThreadIds.add(projectState.threadId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to resume previous Codex thread.';

        set((state) => ({
          threadToProjectId: Object.fromEntries(
            Object.entries(state.threadToProjectId).filter(([threadId]) => threadId !== projectState.threadId),
          ),
          projectStates: withProjectState(state, projectId, (currentProjectState) => ({
            ...currentProjectState,
            threadId: null,
            runningThreadId: null,
            messages: [
              ...currentProjectState.messages,
              {
                id: `resume-error-${projectId}`,
                kind: 'system',
                tone: 'error',
                text: errorMessage,
              },
            ],
          })),
        }));
      }
    }),
  );
}

const initialPersistedProjectStates = hydratePersistedProjectStates();
const initialThreadToProjectId = Object.fromEntries(
  Object.entries(initialPersistedProjectStates)
    .filter(([, projectState]) => Boolean(projectState.threadId))
    .map(([projectId, projectState]) => [projectState.threadId as string, projectId]),
);

export const useCodexStore = create<CodexStore>((set, get) => ({
  connectionStatus: 'disconnected',
  connectionError: null,
  models: [],
  modes: [],
  initialized: false,
  projectStates: initialPersistedProjectStates,
  threadToProjectId: initialThreadToProjectId,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    if (codexInitializationPromise) {
      return codexInitializationPromise;
    }

    codexInitializationPromise = (async () => {
      set({
        connectionStatus: 'connecting',
        connectionError: null,
      });

      await window.electronAPI.codexConnect();
      const [models, modes] = await Promise.all([
        window.electronAPI.codexListModels(),
        window.electronAPI.codexListModes(),
      ]);

      set((state) => {
        const defaultModel = getDefaultModel(models);
        const projectStates = Object.fromEntries(
          Object.entries(state.projectStates).map(([projectId, projectState]) => [
            projectId,
            {
              ...projectState,
              selectedModel: projectState.selectedModel ?? defaultModel,
            },
          ]),
        );

        return {
          initialized: true,
          models,
          modes,
          connectionStatus: 'ready' as const,
          connectionError: null,
          projectStates,
        };
      });

      await resumePersistedThreads(get().projectStates, set);
    })().finally(() => {
      codexInitializationPromise = null;
    });

    return codexInitializationPromise;
  },

  setDraft: (projectId, draft) => {
    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => ({
        ...projectState,
        draft,
      })),
    }));
  },

  toggleAttachedFile: (projectId, filePath) => {
    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => {
        const exists = projectState.attachedFilePaths.includes(filePath);

        return {
          ...projectState,
          attachedFilePaths: exists
            ? projectState.attachedFilePaths.filter((path) => path !== filePath)
            : [...projectState.attachedFilePaths, filePath],
        };
      }),
    }));
  },

  removeAttachedFile: (projectId, filePath) => {
    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => ({
        ...projectState,
        attachedFilePaths: projectState.attachedFilePaths.filter((path) => path !== filePath),
      })),
    }));
  },

  setSelectedModel: (projectId, model) => {
    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => ({
        ...projectState,
        selectedModel: model,
      })),
    }));
  },

  setSelectedMode: (projectId, mode) => {
    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => ({
        ...projectState,
        selectedMode: mode,
      })),
    }));
  },

  setSelectedReasoningEffort: (projectId, effort) => {
    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => ({
        ...projectState,
        selectedReasoningEffort: effort,
      })),
    }));
  },

  setSelectedApprovalPolicy: (projectId, policy) => {
    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => ({
        ...projectState,
        selectedApprovalPolicy: policy,
      })),
    }));
  },

  setSelectedSandboxMode: (projectId, sandboxMode) => {
    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => ({
        ...projectState,
        selectedSandboxMode: sandboxMode,
      })),
    }));
  },

  loadProjectThreads: async ({ projectId, rootPath }) => {
    await get().initialize();
    const projectState = ensureProjectState(get(), projectId);

    set((state) => ({
      projectStates: withProjectState(state, projectId, (currentProjectState) => ({
        ...currentProjectState,
        isLoadingHistory: true,
      })),
    }));

    try {
      const threads = await window.electronAPI.codexListThreads({
        cwd: rootPath,
        limit: 50,
      });
      const mergedThreads = mergeThreadSummaries(projectState.threadSummaries, threads);
      const nextThreadId =
        projectState.threadId && mergedThreads.some((thread) => thread.id === projectState.threadId)
          ? projectState.threadId
          : null;

      set((state) => ({
        threadToProjectId: {
          ...state.threadToProjectId,
          ...Object.fromEntries(mergedThreads.map((thread) => [thread.id, projectId])),
        },
        projectStates: withProjectState(state, projectId, (currentProjectState) => ({
          ...currentProjectState,
          threadId: nextThreadId,
          threadSummaries: mergedThreads,
          isLoadingHistory: Boolean(nextThreadId),
          messages: nextThreadId ? currentProjectState.messages : [],
        })),
      }));

      if (nextThreadId) {
        await get().selectThread({ projectId, threadId: nextThreadId });
      } else {
        set((state) => ({
          projectStates: withProjectState(state, projectId, (currentProjectState) => ({
            ...currentProjectState,
            isLoadingHistory: false,
            messages: [],
          })),
        }));
      }
    } catch (error) {
      set((state) => ({
        projectStates: withProjectState(state, projectId, (currentProjectState) => ({
          ...currentProjectState,
          isLoadingHistory: false,
          messages: [
            ...currentProjectState.messages,
            {
              id: `thread-list-error-${projectId}`,
              kind: 'system',
              tone: 'error',
              text: error instanceof Error ? error.message : 'Failed to load Codex threads.',
            },
          ],
        })),
      }));
    }
  },

  selectThread: async ({ projectId, threadId }) => {
    await get().initialize();

    set((state) => ({
      projectStates: withProjectState(state, projectId, (currentProjectState) => ({
        ...currentProjectState,
        threadId,
        isLoadingHistory: true,
        pendingRequests: [],
      })),
      threadToProjectId: {
        ...state.threadToProjectId,
        [threadId]: projectId,
      },
    }));

    try {
      const thread = await window.electronAPI.codexReadThread({
        threadId,
        includeTurns: true,
      });
      const messages = mapHistoryTurnsToMessages(thread.turns);

      set((state) => ({
        projectStates: withProjectState(state, projectId, (currentProjectState) => ({
          ...currentProjectState,
          threadId,
          isLoadingHistory: false,
          messages,
          threadSummaries: mergeThreadSummary(currentProjectState.threadSummaries, thread),
        })),
        threadToProjectId: {
          ...state.threadToProjectId,
          [threadId]: projectId,
        },
      }));
    } catch (error) {
      set((state) => ({
        projectStates: withProjectState(state, projectId, (currentProjectState) => ({
          ...currentProjectState,
          isLoadingHistory: false,
          messages: [
            ...currentProjectState.messages,
            {
              id: `thread-read-error-${threadId}`,
              kind: 'system',
              tone: 'error',
              text: error instanceof Error ? error.message : 'Failed to load thread history.',
            },
          ],
        })),
      }));
    }
  },

  newChat: (projectId) => {
    set((state) => ({
        projectStates: withProjectState(state, projectId, (projectState) => ({
          ...projectState,
          threadId: null,
          runningThreadId: null,
          activeTurnId: null,
        isSending: false,
        isLoadingHistory: false,
        pendingRequests: [],
        messages: [],
      })),
    }));
  },

  sendPrompt: async ({ projectId, rootPath, tree, prompt }) => {
    await get().initialize();

    const projectState = ensureProjectState(get(), projectId);
    const trimmedPrompt = prompt.trim();

    if ((!trimmedPrompt && projectState.attachedFilePaths.length === 0) || projectState.isSending) {
      return;
    }

    set((state) => ({
      projectStates: withProjectState(state, projectId, (currentProjectState) => ({
        ...currentProjectState,
        isSending: true,
      })),
    }));

    try {
      let threadId = projectState.threadId;

      if (!threadId) {
        const thread = await window.electronAPI.codexStartThread({
          cwd: rootPath,
          model: projectState.selectedModel,
          approvalPolicy: projectState.selectedApprovalPolicy,
          sandbox: projectState.selectedSandboxMode,
        });

        threadId = thread.id;
        resumedThreadIds.add(thread.id);

        set((state) => ({
          threadToProjectId: {
            ...state.threadToProjectId,
            [thread.id]: projectId,
          },
          projectStates: withProjectState(state, projectId, (currentProjectState) => ({
            ...currentProjectState,
            threadId: thread.id,
            threadSummaries: mergeThreadSummary(currentProjectState.threadSummaries, thread),
          })),
        }));
      } else if (!resumedThreadIds.has(threadId)) {
        await window.electronAPI.codexResumeThread(threadId);
        resumedThreadIds.add(threadId);
      }

      const attachedPathEntries = buildAttachedPathEntries(projectState.attachedFilePaths, rootPath);
      const attachmentContext = buildAttachmentContextText(attachedPathEntries);
      const formattedPrompt = applyMentionMarkdown(trimmedPrompt, projectState.attachedFilePaths);

      const turn = await window.electronAPI.codexStartTurn({
        threadId,
        cwd: rootPath,
        model: projectState.selectedModel,
        approvalPolicy: projectState.selectedApprovalPolicy,
        sandboxPolicy: buildSandboxPolicy(rootPath, projectState.selectedSandboxMode),
        collaborationMode: projectState.selectedMode
          ? {
              mode: projectState.selectedMode,
              settings: {
                model: projectState.selectedModel ?? getDefaultModel(get().models) ?? 'gpt-5.4',
                reasoning_effort: projectState.selectedReasoningEffort,
                developer_instructions: null,
              },
            }
          : null,
        effort: projectState.selectedReasoningEffort,
        input: [
          {
            type: 'text',
            text: formattedPrompt || 'Use the attached files as context and continue.',
          },
          ...(attachmentContext
            ? [
                {
                  type: 'text' as const,
                  text: attachmentContext,
                },
              ]
            : []),
        ],
      });

      const optimisticMessage: CodexChatMessage = {
        id: `user-${turn.id}`,
        kind: 'user',
        text: formattedPrompt,
        attachments: projectState.attachedFilePaths,
        turnId: turn.id,
      };

      set((state) => ({
        projectStates: withProjectState(state, projectId, (currentProjectState) => ({
          ...currentProjectState,
          runningThreadId: threadId,
          activeTurnId: turn.id,
          draft: '',
          attachedFilePaths: [],
          isSending: false,
          messages: [...currentProjectState.messages, optimisticMessage],
        })),
      }));
    } catch (error) {
      set((state) => ({
        connectionStatus: 'failed',
        connectionError: error instanceof Error ? error.message : 'Failed to send prompt.',
        projectStates: withProjectState(state, projectId, (currentProjectState) => ({
          ...currentProjectState,
          isSending: false,
          messages: [
            ...currentProjectState.messages,
            {
              id: `error-${Date.now()}`,
              kind: 'system',
              tone: 'error',
              text: error instanceof Error ? error.message : 'Failed to send prompt.',
            },
          ],
        })),
      }));
    }
  },

  interruptTurn: async (projectId) => {
    const projectState = ensureProjectState(get(), projectId);

    if (!projectState.threadId || !projectState.activeTurnId) {
      return;
    }

    await window.electronAPI.codexInterruptTurn({
      threadId: projectState.threadId,
      turnId: projectState.activeTurnId,
    });
  },

  resolvePendingRequest: async ({ projectId, requestId, decision }) => {
    const projectState = ensureProjectState(get(), projectId);
    const pending = projectState.pendingRequests.find((request) => request.requestId === requestId);

    if (!pending) {
      return;
    }

    if (pending.method === 'item/permissions/requestApproval') {
      const scope = decision === 'acceptForSession' ? 'session' : 'turn';

      await window.electronAPI.codexResolveServerRequest({
        requestId,
        result:
          decision === 'decline' || decision === 'cancel'
            ? {
                scope,
                permissions: {},
              }
            : {
                scope,
                permissions: pending.payload.permissions ?? {},
              },
      });
    } else {
      await window.electronAPI.codexResolveServerRequest({
        requestId,
        result: {
          decision,
        },
      });
    }

    set((state) => ({
      projectStates: withProjectState(state, projectId, (currentProjectState) => ({
        ...currentProjectState,
        pendingRequests: currentProjectState.pendingRequests.filter((request) => request.requestId !== requestId),
      })),
    }));
  },

  handleNotification: (event) => {
    if (event.method === 'codex/connection-status') {
      const params = event.params as { status: CodexConnectionStatus; error: string | null };

      if (params.status !== 'ready') {
        resumedThreadIds.clear();
      }

      set({
        connectionStatus: params.status,
        connectionError: params.error,
      });
      return;
    }

    if (event.method === 'thread/started') {
      const params = event.params as { thread: CodexThread };
      const thread = params.thread;
      const projectId = thread.cwd ? getProjectIdByThreadId(get(), thread.id) ?? null : null;

      if (!projectId) {
        return;
      }

      set((state) => ({
        projectStates: withProjectState(state, projectId, (projectState) => ({
          ...projectState,
          threadSummaries: mergeThreadSummary(projectState.threadSummaries, thread),
        })),
      }));
      return;
    }

    if (event.method === 'turn/started' || event.method === 'turn/completed') {
      const params = event.params as {
        turn: {
          id: string;
          status: string;
          error?: {
            message?: string;
          } | null;
        };
      };
      const turnId = params.turn.id;

      set((state) => {
        const matchingProjectEntry = Object.entries(state.projectStates).find(
          ([, projectState]) => projectState.activeTurnId === turnId,
        );

        if (!matchingProjectEntry) {
          return state;
        }

        const [projectId, projectState] = matchingProjectEntry;

        return {
          projectStates: {
            ...state.projectStates,
            [projectId]: {
              ...projectState,
              runningThreadId:
                event.method === 'turn/completed' ? null : projectState.runningThreadId,
              activeTurnId:
                event.method === 'turn/completed' ? null : projectState.activeTurnId,
              isSending: false,
              messages:
                event.method === 'turn/completed' && params.turn.status === 'failed'
                  ? [
                      ...projectState.messages,
                      {
                        id: `turn-error-${turnId}`,
                        kind: 'system',
                        tone: 'error',
                        text: params.turn.error?.message ?? 'Codex turn failed.',
                      },
                    ]
                  : projectState.messages,
            },
          },
        };
      });

      return;
    }

    if (event.method === 'serverRequest/resolved') {
      const params = event.params as {
        threadId: string;
        requestId: number | string;
      };

      set((state) => {
        const projectId = getProjectIdByThreadId(state, params.threadId);

        if (!projectId) {
          return state;
        }

        const projectState = ensureProjectState(state, projectId);

        return {
          projectStates: {
            ...state.projectStates,
            [projectId]: {
              ...projectState,
              pendingRequests: projectState.pendingRequests.filter(
                (request) => request.requestId !== params.requestId,
              ),
            },
          },
        };
      });

      return;
    }

    if (
      event.method === 'item/started' ||
      event.method === 'item/completed' ||
      event.method === 'item/agentMessage/delta' ||
      event.method === 'item/reasoning/summaryTextDelta'
    ) {
      const params = event.params as Record<string, unknown>;
      const threadId = String(params.threadId ?? '');

      if (!threadId) {
        return;
      }

      const projectId = getProjectIdByThreadId(get(), threadId);

      if (!projectId) {
        return;
      }

      set((state) => {
        const projectState = ensureProjectState(state, projectId);
        let messages = projectState.messages;

        if (event.method === 'item/started' || event.method === 'item/completed') {
          const item = params.item as Record<string, unknown>;
          const turnId = typeof params.turnId === 'string' ? params.turnId : null;
          const itemType = String(item.type ?? '');

          if (itemType === 'userMessage') {
            return state;
          }

          if (itemType === 'agentMessage') {
            messages = upsertMessage(messages, {
              id: String(item.id),
              kind: 'agent',
              itemId: String(item.id),
              turnId,
              text: typeof item.text === 'string' ? item.text : '',
              status: event.method === 'item/completed' ? 'completed' : 'inProgress',
            });
          } else if (itemType === 'reasoning') {
            messages = upsertMessage(messages, {
              id: String(item.id),
              kind: 'reasoning',
              itemId: String(item.id),
              turnId,
              text: typeof item.summary === 'string' ? item.summary : '',
              status: event.method === 'item/completed' ? 'completed' : 'inProgress',
            });
          } else if (itemType === 'commandExecution') {
            messages = upsertMessage(messages, {
              id: String(item.id),
              kind: 'command',
              itemId: String(item.id),
              turnId,
              command: normalizeCommandParts(item.command),
              cwd: typeof item.cwd === 'string' ? item.cwd : null,
              output: typeof item.aggregatedOutput === 'string' ? item.aggregatedOutput : '',
              status:
                typeof item.status === 'string'
                  ? item.status
                  : event.method === 'item/completed'
                    ? 'completed'
                    : 'inProgress',
            });
          } else if (itemType === 'fileChange') {
            messages = upsertMessage(messages, {
              id: String(item.id),
              kind: 'fileChange',
              itemId: String(item.id),
              turnId,
              status:
                typeof item.status === 'string'
                  ? item.status
                  : event.method === 'item/completed'
                    ? 'completed'
                    : 'inProgress',
              files: Array.isArray(item.changes)
                ? (item.changes as Array<{ path: string; kind?: string; diff?: string }>)
                : [],
            });
          }
        }

        if (event.method === 'item/agentMessage/delta') {
          const itemId = String(params.itemId ?? '');
          const delta = typeof params.delta === 'string' ? params.delta : '';

          messages = messages.map((message) => {
            if (message.kind !== 'agent' || message.itemId !== itemId) {
              return message;
            }

            return {
              ...message,
              text: message.text + delta,
              status: 'inProgress',
            };
          });
        }

        if (event.method === 'item/reasoning/summaryTextDelta') {
          const itemId = String(params.itemId ?? '');
          const delta = typeof params.delta === 'string' ? params.delta : '';
          const turnId = typeof params.turnId === 'string' ? params.turnId : null;
          const existing = messages.find(
            (message) => message.kind === 'reasoning' && message.itemId === itemId,
          );

          if (!existing) {
            messages = [
              ...messages,
              {
                id: itemId,
                kind: 'reasoning',
                itemId,
                turnId,
                text: delta,
                status: 'inProgress',
              },
            ];
          } else {
            messages = messages.map((message) => {
              if (message.kind !== 'reasoning' || message.itemId !== itemId) {
                return message;
              }

              return {
                ...message,
                text: message.text + delta,
                status: 'inProgress',
              };
            });
          }
        }

        return {
          projectStates: {
            ...state.projectStates,
            [projectId]: {
              ...projectState,
              messages,
            },
          },
        };
      });
    }
  },

  handleServerRequest: (request) => {
    const threadId = String(request.params.threadId);
    const projectId = getProjectIdByThreadId(get(), threadId);

    if (!projectId) {
      return;
    }

    set((state) => ({
      projectStates: withProjectState(state, projectId, (projectState) => ({
        ...projectState,
        pendingRequests: [
          ...projectState.pendingRequests.filter((entry) => entry.requestId !== request.id),
          {
            requestId: request.id,
            method: request.method,
            threadId,
            turnId:
              'turnId' in request.params && typeof request.params.turnId === 'string'
                ? request.params.turnId
                : null,
            itemId:
              'itemId' in request.params && typeof request.params.itemId === 'string'
                ? request.params.itemId
                : null,
            reason:
              'reason' in request.params && typeof request.params.reason === 'string'
                ? request.params.reason
                : null,
            payload: request.params,
          },
        ],
      })),
    }));
  },
}));

export function initializeCodexEventBindings(): void {
  if (codexEventBindingsInitialized) {
    return;
  }

  codexEventBindingsInitialized = true;

  window.electronAPI.onCodexEvent((event) => {
    useCodexStore.getState().handleNotification(event);
  });

  window.electronAPI.onCodexServerRequest((request) => {
    useCodexStore.getState().handleServerRequest(request);
  });
}

export function initializeCodexPersistence(): void {
  if (codexPersistenceInitialized || typeof window === 'undefined') {
    return;
  }

  codexPersistenceInitialized = true;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastSerializedState = '';

  useCodexStore.subscribe((state) => {
    const snapshot = buildPersistedCodexState(state.projectStates);
    const serialized = JSON.stringify(snapshot);

    if (serialized === lastSerializedState) {
      return;
    }

    lastSerializedState = serialized;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      try {
        window.localStorage.setItem(CODEX_PERSISTENCE_KEY, serialized);
      } catch (error) {
        console.warn('[codex:persist] Failed to persist Codex state.', error);
      }
    }, 200);
  });
}
