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
} from '../src/shared/ipc.js';

const electronAPI: ElectronAPI = {
  platform: process.platform,
  openProjectDirectory: () => ipcRenderer.invoke('dialog:open-project'),
  readDirectory: (rootPath: string): Promise<DirectoryNode[]> => ipcRenderer.invoke('fs:read-directory', rootPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  createTerminal: (input: TerminalCreateInput): Promise<TerminalMeta> => ipcRenderer.invoke('pty:create', input),
  writeTerminal: (input: TerminalWriteInput) => ipcRenderer.invoke('pty:write', input),
  resizeTerminal: (input: TerminalResizeInput) => ipcRenderer.invoke('pty:resize', input),
  killTerminal: (terminalId: string) => ipcRenderer.invoke('pty:kill', terminalId),
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
