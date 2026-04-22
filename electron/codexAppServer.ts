import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { BrowserWindow } from 'electron';
import type {
  CodexConnectionStatus,
  CodexNotification,
  CodexResolveServerRequestInput,
  CodexServerRequest,
  CodexThread,
  CodexThreadStartInput,
  CodexTurn,
  CodexTurnStartInput,
} from '../src/shared/codex.js';

type JsonRpcMessage = {
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : 'Unknown Codex app-server error.';
}

export class CodexAppServerManager {
  private static readonly MAX_TURN_INPUT_TEXT_LENGTH = 1_048_576;

  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private nextRequestId = 1;
  private pendingRequests = new Map<number | string, PendingRequest>();
  private status: CodexConnectionStatus = 'disconnected';
  private readyPromise: Promise<void> | null = null;

  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  private sendConnectionStatus(status: CodexConnectionStatus, error: string | null = null): void {
    this.status = status;
    this.sendNotification({
      method: 'codex/connection-status',
      params: {
        status,
        error,
      },
    });
  }

  private sendNotification(notification: CodexNotification): void {
    const window = this.getWindow();

    if (!window || window.isDestroyed()) {
      return;
    }

    window.webContents.send('codex:event', notification);
  }

  private sendServerRequest(request: CodexServerRequest): void {
    const window = this.getWindow();

    if (!window || window.isDestroyed()) {
      return;
    }

    window.webContents.send('codex:server-request', request);
  }

  private write(message: Record<string, unknown>): void {
    if (!this.child) {
      throw new Error('Codex app-server is not running.');
    }

    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private handleStdoutChunk(chunk: string): void {
    this.buffer += chunk;

    let newlineIndex = this.buffer.indexOf('\n');

    while (newlineIndex >= 0) {
      const rawLine = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (rawLine) {
        this.handleMessage(rawLine);
      }

      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  private handleMessage(rawLine: string): void {
    let message: JsonRpcMessage;

    try {
      message = JSON.parse(rawLine) as JsonRpcMessage;
    } catch (error) {
      this.sendConnectionStatus('failed', `Failed to parse Codex app-server message: ${toErrorMessage(error)}`);
      return;
    }

    if (typeof message.id !== 'undefined' && !message.method) {
      const pending = this.pendingRequests.get(message.id);

      if (!pending) {
        return;
      }

      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message ?? 'Codex request failed.'));
        return;
      }

      pending.resolve(message.result);
      return;
    }

    if (typeof message.id !== 'undefined' && message.method) {
      this.sendServerRequest({
        id: message.id,
        method: message.method,
        params: message.params ?? {},
      } as CodexServerRequest);
      return;
    }

    if (message.method) {
      this.sendNotification({
        method: message.method,
        params: message.params,
      } as CodexNotification);
    }
  }

  private cleanupPendingRequests(reason: unknown): void {
    for (const pending of this.pendingRequests.values()) {
      pending.reject(reason);
    }

    this.pendingRequests.clear();
  }

  private async initializeConnection(): Promise<void> {
    const result = await this.requestInternal<{
      userAgent: string;
      codexHome: string;
      platformFamily: string;
      platformOs: string;
    }>('initialize', {
      clientInfo: {
        name: 'ide-cli',
        title: 'ide-cli',
        version: '0.1.0',
      },
      capabilities: {
        experimentalApi: true,
      },
    });

    if (!result.userAgent) {
      throw new Error('Codex initialize returned an invalid payload.');
    }

    this.write({
      method: 'initialized',
      params: {},
    });
  }

  private async requestInternal<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const requestId = this.nextRequestId++;

    const result = await new Promise<unknown>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      try {
        this.write({
          method,
          id: requestId,
          params,
        });
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });

    return result as T;
  }

  async connect(): Promise<void> {
    if (this.status === 'ready') {
      return;
    }

    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = (async () => {
      this.sendConnectionStatus('connecting');

      this.child = spawn('codex', ['app-server'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.buffer = '';

      this.child.stdout.setEncoding('utf8');
      this.child.stdout.on('data', (chunk: string) => {
        this.handleStdoutChunk(chunk);
      });

      this.child.stderr.setEncoding('utf8');
      this.child.stderr.on('data', (chunk: string) => {
        const trimmed = chunk.trim();

        if (trimmed) {
          console.warn('[codex-app-server:stderr]', trimmed);
        }
      });

      this.child.on('error', (error) => {
        this.sendConnectionStatus('failed', toErrorMessage(error));
      });

      this.child.on('exit', (code, signal) => {
        this.child = null;
        this.buffer = '';
        const reason = `Codex app-server exited (${code ?? 'null'}${signal ? `, ${signal}` : ''}).`;
        this.cleanupPendingRequests(new Error(reason));
        this.sendConnectionStatus(code === 0 ? 'disconnected' : 'failed', reason);
      });

      try {
        await this.initializeConnection();
        this.sendConnectionStatus('ready');
      } catch (error) {
        this.sendConnectionStatus('failed', toErrorMessage(error));
        this.child.kill();
        throw error;
      }
    })().finally(() => {
      this.readyPromise = null;
    });

    return this.readyPromise;
  }

  async request<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.connect();
    return this.requestInternal<T>(method, params);
  }

  async listModels(): Promise<unknown[]> {
    const result = await this.request<{ data: unknown[] }>('model/list', {});
    return result.data ?? [];
  }

  async listModes(): Promise<unknown[]> {
    const result = await this.request<{ data: unknown[] }>('collaborationMode/list', {});
    return result.data ?? [];
  }

  async listThreads(input: { cwd?: string | null; limit?: number | null }): Promise<CodexThread[]> {
    const result = await this.request<{ data: CodexThread[] }>('thread/list', {
      cwd: input.cwd ?? null,
      limit: input.limit ?? 50,
    });

    return result.data ?? [];
  }

  async readThread(input: { threadId: string; includeTurns?: boolean }): Promise<CodexThread> {
    const result = await this.request<{ thread: CodexThread }>('thread/read', {
      threadId: input.threadId,
      includeTurns: Boolean(input.includeTurns),
    });

    return result.thread;
  }

  async startThread(input: CodexThreadStartInput): Promise<CodexThread> {
    const result = await this.request<{ thread: CodexThread }>('thread/start', {
      cwd: input.cwd,
      model: input.model ?? null,
      approvalPolicy: input.approvalPolicy ?? 'on-request',
      sandbox: input.sandbox ?? 'workspace-write',
    });

    return result.thread;
  }

  async resumeThread(threadId: string): Promise<CodexThread> {
    const result = await this.request<{ thread: CodexThread }>('thread/resume', {
      threadId,
    });

    return result.thread;
  }

  async startTurn(input: CodexTurnStartInput): Promise<CodexTurn> {
    const estimatedInputLength = input.input.reduce((total, item) => {
      if (item.type === 'text') {
        return total + item.text.length;
      }

      if (item.type === 'image') {
        return total + item.url.length;
      }

      if (item.type === 'localImage') {
        return total + item.path.length;
      }

      if (item.type === 'skill' || item.type === 'mention') {
        return total + item.path.length + item.name.length;
      }

      return total;
    }, 0);

    if (estimatedInputLength > CodexAppServerManager.MAX_TURN_INPUT_TEXT_LENGTH) {
      throw new Error(
        `Turn input exceeds the maximum length of ${CodexAppServerManager.MAX_TURN_INPUT_TEXT_LENGTH} characters. Reduce the prompt or attached context.`,
      );
    }

    const result = await this.request<{ turn: CodexTurn }>('turn/start', input as unknown as Record<string, unknown>);
    return result.turn;
  }

  async interruptTurn(input: { threadId: string; turnId: string }): Promise<void> {
    await this.request('turn/interrupt', input);
  }

  async resolveServerRequest(input: CodexResolveServerRequestInput): Promise<void> {
    this.write({
      id: input.requestId,
      result: input.result,
    });
  }
}
