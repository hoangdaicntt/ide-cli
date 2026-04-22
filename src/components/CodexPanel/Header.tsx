import { Cpu, MoreHorizontal, X } from 'lucide-react';

export function CodexHeader({
  rootPath: _rootPath,
  connectionStatus: _connectionStatus,
  connectionError: _connectionError,
}: {
  rootPath: string;
  connectionStatus: string;
  connectionError: string | null;
}) {
  return (
    <div className="app-drag-region flex h-9 items-center gap-2 border-b border-[var(--shell-border)] bg-[var(--panel-muted-bg)] px-4">
      <Cpu className="h-4 w-4 text-[var(--shell-accent)]" strokeWidth={2} />
      <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--shell-text)]">Codex AI</div>
      <div className="app-no-drag flex items-center gap-1">
        <button
          type="button"
          aria-label="Panel options"
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--shell-muted)] transition hover:bg-white hover:text-[var(--shell-text)]"
        >
          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Close panel"
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--shell-muted)] transition hover:bg-white hover:text-[var(--shell-text)]"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.1} />
        </button>
      </div>
    </div>
  );
}
