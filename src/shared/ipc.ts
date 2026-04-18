import type {
  CodexMode,
  CodexModel,
  CodexNotification,
  CodexResolveServerRequestInput,
  CodexServerRequest,
  CodexThread,
  CodexThreadListInput,
  CodexThreadStartInput,
  CodexTurn,
  CodexTurnStartInput,
} from './codex.js';

export type Platform = string;
export type WorkspaceSessionVersion = 1;

export type FileNode = {
  type: 'file';
  name: string;
  path: string;
};

export type DirectoryNode = {
  type: 'directory';
  name: string;
  path: string;
  children: Array<DirectoryNode | FileNode>;
};

export type ReadDirectoryResult = DirectoryNode[];

export type TerminalCreateInput = {
  projectId: string;
  cwd: string;
  shell?: string;
};

export type TerminalMeta = {
  terminalId: string;
  projectId: string;
  cwd: string;
  shell: string;
};

export type TerminalWriteInput = {
  terminalId: string;
  data: string;
};

export type TerminalResizeInput = {
  terminalId: string;
  cols: number;
  rows: number;
};

export type TerminalOutputPayload = {
  terminalId: string;
  projectId: string;
  data: string;
};

export type TerminalExitPayload = {
  terminalId: string;
  projectId: string;
  exitCode: number;
  signal?: number;
};

export type PersistedProjectSession = {
  id: string;
  name: string;
  rootPath: string;
  activeFilePath: string | null;
  openFilePaths: string[];
  hasOpenTerminal: boolean;
};

export type WorkspaceSession = {
  version: WorkspaceSessionVersion;
  activeProjectId: string | null;
  projects: PersistedProjectSession[];
};

export type IpcChannels = 'pty:data' | 'pty:exit';

export type ElectronAPI = {
  platform: Platform;
  openProjectDirectory: () => Promise<string | null>;
  pathExists: (targetPath: string) => Promise<boolean>;
  readDirectory: (rootPath: string) => Promise<ReadDirectoryResult>;
  readFile: (filePath: string) => Promise<string>;
  loadSession: () => Promise<WorkspaceSession | null>;
  saveSession: (session: WorkspaceSession) => Promise<void>;
  createTerminal: (input: TerminalCreateInput) => Promise<TerminalMeta>;
  writeTerminal: (input: TerminalWriteInput) => Promise<void>;
  resizeTerminal: (input: TerminalResizeInput) => Promise<void>;
  killTerminal: (terminalId: string) => Promise<void>;
  codexConnect: () => Promise<void>;
  codexListModels: () => Promise<CodexModel[]>;
  codexListModes: () => Promise<CodexMode[]>;
  codexListThreads: (input: CodexThreadListInput) => Promise<CodexThread[]>;
  codexReadThread: (input: { threadId: string; includeTurns?: boolean }) => Promise<CodexThread>;
  codexStartThread: (input: CodexThreadStartInput) => Promise<CodexThread>;
  codexResumeThread: (threadId: string) => Promise<CodexThread>;
  codexStartTurn: (input: CodexTurnStartInput) => Promise<CodexTurn>;
  codexInterruptTurn: (input: { threadId: string; turnId: string }) => Promise<void>;
  codexResolveServerRequest: (input: CodexResolveServerRequestInput) => Promise<void>;
  onCodexEvent: (listener: (event: CodexNotification) => void) => () => void;
  onCodexServerRequest: (listener: (request: CodexServerRequest) => void) => () => void;
  onTerminalData: (listener: (payload: TerminalOutputPayload) => void) => () => void;
  onTerminalExit: (listener: (payload: TerminalExitPayload) => void) => () => void;
};
