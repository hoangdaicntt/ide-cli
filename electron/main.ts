import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import pty, { type IPty } from 'node-pty';
import { CodexAppServerManager } from './codexAppServer.js';
import type {
  DirectoryNode,
  FileNode,
  IpcChannels,
  PersistedProjectSession,
  ReadDirectoryResult,
  TerminalCreateInput,
  TerminalExitPayload,
  TerminalMeta,
  TerminalOutputPayload,
  TerminalResizeInput,
  TerminalWriteInput,
  WorkspaceSession,
} from '../src/shared/ipc.js';
import type { CodexMode, CodexModel } from '../src/shared/codex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

const IGNORED_NAMES = new Set([
  '.DS_Store',
  '.git',
  'dist',
  'dist-electron',
  'node_modules',
]);
const SESSION_FILE_NAME = 'workspace-session.json';

type TerminalSession = {
  meta: TerminalMeta;
  process: IPty;
};

const terminalSessions = new Map<string, TerminalSession>();
let mainWindow: BrowserWindow | null = null;
const codexAppServer = new CodexAppServerManager(() => mainWindow);

async function createDirectoryNode(targetPath: string): Promise<DirectoryNode | FileNode | null> {
  const stats = await fs.lstat(targetPath);

  if (stats.isSymbolicLink()) {
    return null;
  }

  const name = path.basename(targetPath);

  if (stats.isDirectory()) {
    const children = await fs.readdir(targetPath);
    const nested = await Promise.all(
      children
        .filter((entry) => !IGNORED_NAMES.has(entry))
        .map((entry) => createDirectoryNode(path.join(targetPath, entry))),
    );

    const sortedChildren = nested
      .filter((entry): entry is DirectoryNode | FileNode => Boolean(entry))
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === 'directory' ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      });

    return {
      type: 'directory',
      name,
      path: targetPath,
      children: sortedChildren,
    };
  }

  return {
    type: 'file',
    name,
    path: targetPath,
  };
}

function sendToRenderer(channel: IpcChannels, payload: unknown): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function destroyTerminal(terminalId: string): void {
  const session = terminalSessions.get(terminalId);

  if (!session) {
    return;
  }

  try {
    session.process.kill();
  } catch {
    // PTY may already be dead.
  }

  terminalSessions.delete(terminalId);
}

function destroyAllTerminals(): void {
  for (const terminalId of terminalSessions.keys()) {
    destroyTerminal(terminalId);
  }
}

function resolveShell(preferredShell?: string): string {
  const candidates = [
    preferredShell,
    process.env.SHELL,
    os.userInfo().shell,
    '/bin/zsh',
    '/bin/bash',
    '/bin/sh',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      return candidate;
    }

    if (candidate === 'zsh' || candidate === 'bash' || candidate === 'sh') {
      return `/bin/${candidate}`;
    }
  }

  return '/bin/zsh';
}

function getSessionFilePath(): string {
  return path.join(app.getPath('userData'), SESSION_FILE_NAME);
}

function isPersistedProjectSession(value: unknown): value is PersistedProjectSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as PersistedProjectSession;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.rootPath === 'string' &&
    (typeof candidate.activeFilePath === 'string' || candidate.activeFilePath === null) &&
    Array.isArray(candidate.openFilePaths) &&
    candidate.openFilePaths.every((entry) => typeof entry === 'string') &&
    typeof candidate.hasOpenTerminal === 'boolean' &&
    (candidate.openTerminalCount === undefined ||
      (typeof candidate.openTerminalCount === 'number' &&
        Number.isInteger(candidate.openTerminalCount) &&
        candidate.openTerminalCount >= 0))
  );
}

function isWorkspaceSession(value: unknown): value is WorkspaceSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as WorkspaceSession;

  return (
    candidate.version === 1 &&
    (typeof candidate.activeProjectId === 'string' || candidate.activeProjectId === null) &&
    Array.isArray(candidate.projects) &&
    candidate.projects.every((project) => isPersistedProjectSession(project))
  );
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: '#0b0f14',
    show: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  destroyAllTerminals();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  destroyAllTerminals();
});

ipcMain.handle('dialog:open-project', async () => {
  const dialogOptions: OpenDialogOptions = {
    properties: ['openDirectory'],
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0] ?? null;
});

ipcMain.handle('fs:read-directory', async (_, rootPath: string) => {
  const rootNode = await createDirectoryNode(rootPath);

  if (!rootNode || rootNode.type !== 'directory') {
    return [];
  }

  return [rootNode] satisfies ReadDirectoryResult;
});

ipcMain.handle('fs:read-file', async (_, filePath: string) => {
  return fs.readFile(filePath, 'utf8');
});

ipcMain.handle('fs:path-exists', async (_, targetPath: string) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('session:load', async () => {
  const sessionFilePath = getSessionFilePath();

  try {
    const raw = await fs.readFile(sessionFilePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    if (!isWorkspaceSession(parsed)) {
      console.warn('[session:load] Ignoring invalid workspace session payload.');
      return null;
    }

    return parsed;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      return null;
    }

    console.error('[session:load] Failed to read workspace session.', error);
    return null;
  }
});

ipcMain.handle('session:save', async (_, session: WorkspaceSession) => {
  if (!isWorkspaceSession(session)) {
    throw new Error('Invalid workspace session payload.');
  }

  const sessionFilePath = getSessionFilePath();
  const directoryPath = path.dirname(sessionFilePath);
  const tempFilePath = `${sessionFilePath}.tmp`;

  await fs.mkdir(directoryPath, { recursive: true });
  await fs.writeFile(tempFilePath, JSON.stringify(session, null, 2), 'utf8');
  await fs.rename(tempFilePath, sessionFilePath);
});

ipcMain.handle('pty:create', async (_, input: TerminalCreateInput) => {
  const shell = resolveShell(input.shell);
  const shellName = path.basename(shell);
  const shellArgs =
    shellName === 'bash' || shellName === 'zsh'
      ? ['-il']
      : shellName === 'fish'
        ? ['-i']
        : [];
  const terminalId = crypto.randomUUID();
  let cwd = input.cwd || os.homedir();

  try {
    const cwdStats = await fs.stat(cwd);

    if (!cwdStats.isDirectory()) {
      cwd = os.homedir();
    }
  } catch {
    cwd = os.homedir();
  }
  let processHandle: IPty;

  try {
    processHandle = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: 120,
      rows: 32,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        TERM_PROGRAM: 'ide-cli',
      },
    });
  } catch (error) {
    console.error(
      `[pty:create:error] shell=${shell} cwd=${cwd} preferredShell=${input.shell ?? 'none'} envShell=${process.env.SHELL ?? 'none'}`,
      error,
    );

    // Fall back to a minimal shell if the preferred login shell cannot be spawned.
    processHandle = pty.spawn('/bin/sh', ['-i'], {
      name: 'xterm-256color',
      cols: 120,
      rows: 32,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        TERM_PROGRAM: 'ide-cli',
      },
    });
  }

  terminalSessions.set(terminalId, {
    meta: {
      terminalId,
      cwd,
      projectId: input.projectId,
      shell,
    },
    process: processHandle,
  });

  processHandle.onData((data) => {
    sendToRenderer('pty:data', {
      terminalId,
      projectId: input.projectId,
      data,
    } satisfies TerminalOutputPayload);
  });

  processHandle.onExit(({ exitCode, signal }) => {
    terminalSessions.delete(terminalId);

    sendToRenderer('pty:exit', {
      terminalId,
      projectId: input.projectId,
      exitCode,
      signal,
    } satisfies TerminalExitPayload);
  });

  return {
    terminalId,
    cwd,
    projectId: input.projectId,
    shell,
  } satisfies TerminalMeta;
});

ipcMain.handle('pty:write', async (_, input: TerminalWriteInput) => {
  terminalSessions.get(input.terminalId)?.process.write(input.data);
});

ipcMain.handle('pty:resize', async (_, input: TerminalResizeInput) => {
  terminalSessions.get(input.terminalId)?.process.resize(input.cols, input.rows);
});

ipcMain.handle('pty:kill', async (_, terminalId: string) => {
  destroyTerminal(terminalId);
});

ipcMain.handle('codex:connect', async () => {
  await codexAppServer.connect();
});

ipcMain.handle('codex:list-models', async () => {
  const models = await codexAppServer.listModels();
  return models as CodexModel[];
});

ipcMain.handle('codex:list-modes', async () => {
  const modes = await codexAppServer.listModes();
  return modes as CodexMode[];
});

ipcMain.handle('codex:list-threads', async (_, input) => {
  return codexAppServer.listThreads(input);
});

ipcMain.handle('codex:thread-read', async (_, input) => {
  return codexAppServer.readThread(input);
});

ipcMain.handle('codex:thread-start', async (_, input) => {
  return codexAppServer.startThread(input);
});

ipcMain.handle('codex:thread-resume', async (_, threadId: string) => {
  return codexAppServer.resumeThread(threadId);
});

ipcMain.handle('codex:turn-start', async (_, input) => {
  return codexAppServer.startTurn(input);
});

ipcMain.handle('codex:turn-interrupt', async (_, input) => {
  await codexAppServer.interruptTurn(input);
});

ipcMain.handle('codex:server-request-resolve', async (_, input) => {
  await codexAppServer.resolveServerRequest(input);
});
