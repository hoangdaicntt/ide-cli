import { FileCode2, GitBranch, MessageSquareMore, Search, Settings } from 'lucide-react';

const items = [
  { id: 'files', label: 'Files', icon: FileCode2 },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'git', label: 'Source control', icon: GitBranch },
  { id: 'codex', label: 'Codex', icon: MessageSquareMore },
] as const;

export function ActivityBar() {
  return (
    <aside className="flex h-full w-10 flex-col justify-between border-l border-[var(--shell-border)] bg-[var(--rail-bg)]">
      <div className="flex flex-col items-center gap-1 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'codex';

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              className={[
                'relative flex h-9 w-full items-center justify-center text-[var(--shell-muted)] transition hover:text-[var(--shell-text)]',
                isActive ? 'bg-[var(--rail-active-bg)] text-[var(--shell-text)]' : '',
              ].join(' ')}
            >
              {isActive ? <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--shell-accent)]" /> : null}
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1 py-2">
        <button
          type="button"
          aria-label="Settings"
          className="flex h-9 w-full items-center justify-center text-[var(--shell-muted)] transition hover:text-[var(--shell-text)]"
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
      </div>
    </aside>
  );
}
