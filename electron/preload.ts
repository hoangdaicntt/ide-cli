import { contextBridge, ipcRenderer } from 'electron';
import type {
  DirectoryNode,
  ElectronAPI,
  TerminalCreateInput,
  TerminalExitPayload,
  TerminalMeta,
  TerminalOutputPayload,
  TerminalResizeInput,
  TerminalWriteInput,
  WorkspaceSession,
} from '../src/shared/ipc.js';
import type {
  CodexMode,
  CodexModel,
  CodexNotification,
  CodexResolveServerRequestInput,
  CodexServerRequest,
  CodexThread,
  CodexThreadStartInput,
  CodexTurn,
  CodexTurnStartInput,
} from '../src/shared/codex.js';

const electronAPI: ElectronAPI = {
  platform: process.platform,
  openProjectDirectory: () => ipcRenderer.invoke('dialog:open-project'),
  pathExists: (targetPath: string): Promise<boolean> => ipcRenderer.invoke('fs:path-exists', targetPath),
  readDirectory: (rootPath: string): Promise<DirectoryNode[]> => ipcRenderer.invoke('fs:read-directory', rootPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  loadSession: (): Promise<WorkspaceSession | null> => ipcRenderer.invoke('session:load'),
  saveSession: (session: WorkspaceSession) => ipcRenderer.invoke('session:save', session),
  createTerminal: (input: TerminalCreateInput): Promise<TerminalMeta> => ipcRenderer.invoke('pty:create', input),
  writeTerminal: (input: TerminalWriteInput) => ipcRenderer.invoke('pty:write', input),
  resizeTerminal: (input: TerminalResizeInput) => ipcRenderer.invoke('pty:resize', input),
  killTerminal: (terminalId: string) => ipcRenderer.invoke('pty:kill', terminalId),
  codexConnect: () => ipcRenderer.invoke('codex:connect'),
  codexListModels: (): Promise<CodexModel[]> => ipcRenderer.invoke('codex:list-models'),
  codexListModes: (): Promise<CodexMode[]> => ipcRenderer.invoke('codex:list-modes'),
  codexListThreads: (input) => ipcRenderer.invoke('codex:list-threads', input),
  codexReadThread: (input) => ipcRenderer.invoke('codex:thread-read', input),
  codexStartThread: (input: CodexThreadStartInput): Promise<CodexThread> => ipcRenderer.invoke('codex:thread-start', input),
  codexResumeThread: (threadId: string): Promise<CodexThread> => ipcRenderer.invoke('codex:thread-resume', threadId),
  codexStartTurn: (input: CodexTurnStartInput): Promise<CodexTurn> => ipcRenderer.invoke('codex:turn-start', input),
  codexInterruptTurn: (input: { threadId: string; turnId: string }) => ipcRenderer.invoke('codex:turn-interrupt', input),
  codexResolveServerRequest: (input: CodexResolveServerRequestInput) =>
    ipcRenderer.invoke('codex:server-request-resolve', input),
  onCodexEvent: (listener: (event: CodexNotification) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: CodexNotification) => {
      listener(payload);
    };

    ipcRenderer.on('codex:event', wrapped);

    return () => {
      ipcRenderer.removeListener('codex:event', wrapped);
    };
  },
  onCodexServerRequest: (listener: (request: CodexServerRequest) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: CodexServerRequest) => {
      listener(payload);
    };

    ipcRenderer.on('codex:server-request', wrapped);

    return () => {
      ipcRenderer.removeListener('codex:server-request', wrapped);
    };
  },
  onTerminalData: (listener: (payload: TerminalOutputPayload) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: TerminalOutputPayload) => {
      listener(payload);
    };

    ipcRenderer.on('pty:data', wrapped);

    return () => {
      ipcRenderer.removeListener('pty:data', wrapped);
    };
  },
  onTerminalExit: (listener: (payload: TerminalExitPayload) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: TerminalExitPayload) => {
      listener(payload);
    };

    ipcRenderer.on('pty:exit', wrapped);

    return () => {
      ipcRenderer.removeListener('pty:exit', wrapped);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
