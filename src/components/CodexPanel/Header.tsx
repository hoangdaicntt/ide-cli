import { Cpu, MoreHorizontal, X } from 'lucide-react';

export function CodexHeader({
  rootPath,
  connectionStatus,
  connectionError,
}: {
  rootPath: string;
  connectionStatus: string;
  connectionError: string | null;
}) {
  return (
    <div className="app-drag-region border-b border-[var(--shell-border)] bg-[var(--panel-muted-bg)] px-4 py-2">
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4 text-[var(--shell-accent)]" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-[var(--shell-text)]">Codex AI</div>
        </div>
        <div className="app-no-drag flex items-center gap-1">
          <div className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-[var(--shell-muted)]">
            {connectionStatus === 'ready' ? 'Connected' : connectionStatus}
          </div>
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
      {connectionError ? <div className="mt-1 truncate text-[11px] text-[#b03447]">{connectionError}</div> : null}
      {!connectionError && rootPath ? <div className="truncate text-[11px] text-[var(--shell-subtle)]">{rootPath}</div> : null}
    </div>
  );
}
