export type Platform = string;

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

export type IpcChannels = 'pty:data' | 'pty:exit';

export type ElectronAPI = {
  platform: Platform;
  openProjectDirectory: () => Promise<string | null>;
  readDirectory: (rootPath: string) => Promise<ReadDirectoryResult>;
  readFile: (filePath: string) => Promise<string>;
  createTerminal: (input: TerminalCreateInput) => Promise<TerminalMeta>;
  writeTerminal: (input: TerminalWriteInput) => Promise<void>;
  resizeTerminal: (input: TerminalResizeInput) => Promise<void>;
  killTerminal: (terminalId: string) => Promise<void>;
  onTerminalData: (listener: (payload: TerminalOutputPayload) => void) => () => void;
  onTerminalExit: (listener: (payload: TerminalExitPayload) => void) => () => void;
};
