import { useEffect, useRef } from 'react';
import { TreeAssetIcon } from '../FileTreeAssetIcons';

export type ContextPickerItem = {
  type: 'file' | 'directory';
  path: string;
  name: string;
  relativePath: string;
};

export function FilePicker({
  items,
  highlightedIndex,
  onSelectItem,
  onHighlightItem,
}: {
  items: ContextPickerItem[];
  highlightedIndex: number;
  onSelectItem: (itemPath: string) => void;
  onHighlightItem: (index: number) => void;
}) {
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const target = rowRefs.current[highlightedIndex];

    if (!target) {
      return;
    }

    target.scrollIntoView({
      block: 'nearest',
    });
  }, [highlightedIndex]);

  return (
    <div className="flex max-h-64 flex-col">
      <div className="border-b border-[var(--shell-border)] bg-[#fbfcfd] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
        Project files and folders
      </div>

      <div className="overflow-auto px-2 py-1.5 custom-scrollbar">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-[13px] text-[var(--shell-muted)]">No matching items.</div>
        ) : null}

        {items.map((item, index) => {
          const isHighlighted = index === highlightedIndex;

          return (
            <button
              key={item.path}
              ref={(element) => {
                rowRefs.current[index] = element;
              }}
              type="button"
              onMouseEnter={() => onHighlightItem(index)}
              onClick={() => onSelectItem(item.path)}
              className={[
                'mb-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-[13px]',
                isHighlighted ? 'bg-[var(--shell-selected)] text-[var(--shell-text)]' : 'text-[var(--shell-text)] hover:bg-[#f6f6f6]',
              ].join(' ')}
            >
              <div className="flex min-w-0 items-center gap-2">
                <TreeAssetIcon fileName={item.name} isFolder={item.type === 'directory'} className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.relativePath}</span>
              </div>
              <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[var(--shell-subtle)]">
                {item.type === 'directory' ? 'folder' : 'enter'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
