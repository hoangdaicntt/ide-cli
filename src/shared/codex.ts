export type CodexConnectionStatus = 'disconnected' | 'connecting' | 'ready' | 'failed';

export type CodexModeKind = 'default' | 'plan' | (string & {});

export type CodexApprovalPolicy = 'untrusted' | 'on-failure' | 'on-request' | 'never';

export type CodexSandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';

export type CodexReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export type CodexServiceTier = 'fast' | 'flex';

export type CodexUserInput =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image';
      url: string;
    }
  | {
      type: 'localImage';
      path: string;
    }
  | {
      type: 'skill';
      name: string;
      path: string;
    }
  | {
      type: 'mention';
      name: string;
      path: string;
    };

export type CodexModel = {
  id: string;
  model: string;
  displayName: string;
  description: string;
  hidden: boolean;
  supportsPersonality: boolean;
  defaultReasoningEffort: CodexReasoningEffort | null;
  supportedReasoningEfforts: Array<{
    reasoningEffort: CodexReasoningEffort;
    description: string;
  }>;
  isDefault: boolean;
};

export type CodexMode = {
  name: string;
  mode: CodexModeKind | null;
  model: string | null;
  reasoning_effort: CodexReasoningEffort | null;
};

export type CodexThread = {
  id: string;
  preview?: string;
  name?: string | null;
  title?: string | null;
  cwd?: string | null;
  createdAt?: number;
  updatedAt?: number;
  status?: string;
  model?: string | null;
  approvalPolicy?: CodexApprovalPolicy | null;
  turns?: CodexHistoryTurn[];
};

export type CodexHistoryTurn = {
  id: string;
  status?: string;
  items?: CodexHistoryItem[];
  error?: {
    message?: string;
  } | null;
};

export type CodexHistoryItem =
  | {
      type: 'userMessage';
      id: string;
      content: Array<CodexUserInput>;
    }
  | {
      type: 'agentMessage';
      id: string;
      text: string;
    }
  | {
      type: 'reasoning';
      id: string;
      summary: string[] | string;
      content?: string[] | string;
    }
  | {
      type: 'commandExecution';
      id: string;
      command: string;
      cwd?: string | null;
      status?: string;
      aggregatedOutput?: string | null;
    }
  | {
      type: 'fileChange';
      id: string;
      status?: string;
      changes: Array<{
        path: string;
        kind?: string;
        diff?: string;
      }>;
    }
  | {
      type: string;
      id: string;
      [key: string]: unknown;
    };

export type CodexTurn = {
  id: string;
  status: 'pending' | 'inProgress' | 'completed' | 'interrupted' | 'failed' | string;
  items: unknown[];
  error?: {
    message?: string;
    additionalDetails?: unknown;
    codexErrorInfo?: unknown;
  } | null;
};

export type CodexItem =
  | {
      id: string;
      type: 'userMessage';
      content: Array<CodexUserInput>;
    }
  | {
      id: string;
      type: 'agentMessage';
      text: string;
    }
  | {
      id: string;
      type: 'reasoning';
      summary?: string;
      content?: string;
    }
  | {
      id: string;
      type: 'commandExecution';
      command: string[];
      cwd?: string | null;
      status: 'inProgress' | 'completed' | 'failed' | 'declined' | string;
      aggregatedOutput?: string;
      exitCode?: number;
      durationMs?: number;
    }
  | {
      id: string;
      type: 'fileChange';
      status: 'inProgress' | 'completed' | 'failed' | 'declined' | string;
      changes: Array<{
        path: string;
        kind?: string;
        diff?: string;
      }>;
    }
  | {
      id: string;
      type: 'plan';
      text: string;
    }
  | {
      id: string;
      type: string;
      [key: string]: unknown;
    };

export type CodexNotification =
  | {
      method: 'thread/started';
      params: { thread: CodexThread };
    }
  | {
      method: 'turn/started' | 'turn/completed';
      params: { turn: CodexTurn };
    }
  | {
      method: 'item/started' | 'item/completed';
      params: { threadId: string; turnId?: string | null; item: CodexItem };
    }
  | {
      method: 'item/agentMessage/delta';
      params: { threadId: string; turnId?: string | null; itemId: string; delta: string };
    }
  | {
      method: 'item/reasoning/summaryTextDelta';
      params: { threadId: string; turnId?: string | null; itemId: string; delta: string; summaryIndex?: number };
    }
  | {
      method: 'item/reasoning/summaryPartAdded';
      params: { threadId: string; turnId?: string | null; itemId: string; summaryIndex?: number };
    }
  | {
      method: 'serverRequest/resolved';
      params: { threadId: string; requestId: number | string };
    }
  | {
      method: 'thread/status/changed';
      params: { threadId: string; status: string };
    }
  | {
      method: 'codex/connection-status';
      params: { status: CodexConnectionStatus; error: string | null };
    }
  | {
      method: string;
      params?: Record<string, unknown>;
    };

export type CodexServerRequest =
  | {
      id: number | string;
      method: 'item/commandExecution/requestApproval';
      params: {
        threadId: string;
        turnId?: string | null;
        itemId: string;
        reason?: string;
        command?: string[];
        cwd?: string | null;
        availableDecisions?: Array<string | Record<string, unknown>>;
      };
    }
  | {
      id: number | string;
      method: 'item/fileChange/requestApproval';
      params: {
        threadId: string;
        turnId?: string | null;
        itemId: string;
        reason?: string;
        availableDecisions?: Array<string | Record<string, unknown>>;
      };
    }
  | {
      id: number | string;
      method: 'item/permissions/requestApproval';
      params: {
        threadId: string;
        turnId?: string | null;
        itemId: string;
        reason?: string;
        permissions?: Record<string, unknown>;
      };
    }
  | {
      id: number | string;
      method: string;
      params: Record<string, unknown>;
    };

export type CodexSandboxPolicy =
  | {
      type: 'readOnly';
      networkAccess?: boolean;
    }
  | {
      type: 'workspaceWrite';
      writableRoots?: string[];
      networkAccess?: boolean;
    }
  | {
      type: 'dangerFullAccess';
    };

export type CodexThreadStartInput = {
  cwd: string;
  model?: string | null;
  approvalPolicy?: CodexApprovalPolicy;
  sandbox?: CodexSandboxMode;
};

export type CodexTurnStartInput = {
  threadId: string;
  cwd: string;
  input: CodexUserInput[];
  model?: string | null;
  effort?: CodexReasoningEffort | null;
  approvalPolicy?: CodexApprovalPolicy;
  sandboxPolicy?: CodexSandboxPolicy;
  collaborationMode?: {
    mode: CodexModeKind;
    settings: {
      model: string;
      reasoning_effort: CodexReasoningEffort | null;
      developer_instructions: string | null;
    };
  } | null;
};

export type CodexResolveServerRequestInput = {
  requestId: number | string;
  result: Record<string, unknown>;
};

export type CodexThreadListInput = {
  cwd?: string | null;
  limit?: number | null;
};
