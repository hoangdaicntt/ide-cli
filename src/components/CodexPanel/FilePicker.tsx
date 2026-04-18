import type { FileNode } from '../../shared/ipc';
import { TreeAssetIcon } from '../FileTreeAssetIcons';

export function FilePicker({
  rootPath,
  files,
  highlightedIndex,
  onSelectFile,
  onHighlightFile,
}: {
  rootPath: string;
  files: FileNode[];
  highlightedIndex: number;
  onSelectFile: (filePath: string) => void;
  onHighlightFile: (index: number) => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-[100%] z-10 mb-3 overflow-hidden rounded-[16px] border border-[var(--shell-border)] bg-white shadow-[var(--shell-shadow)]">
      <div className="border-b border-[var(--shell-border)] bg-[#fbfcfd] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
        Project files
      </div>
      <div className="max-h-64 overflow-auto p-2 custom-scrollbar">
        {files.length === 0 ? (
          <div className="px-3 py-8 text-center text-[13px] text-[var(--shell-muted)]">No matching files.</div>
        ) : null}
        {files.map((file, index) => {
          const isHighlighted = index === highlightedIndex;

          return (
            <button
              key={file.path}
              type="button"
              onMouseEnter={() => onHighlightFile(index)}
              onClick={() => onSelectFile(file.path)}
              className={[
                'mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[13px]',
                isHighlighted ? 'bg-[var(--shell-selected)] text-[var(--shell-text)]' : 'text-[var(--shell-text)] hover:bg-[#f6f6f6]',
              ].join(' ')}
            >
              <div className="flex min-w-0 items-center gap-2">
                <TreeAssetIcon fileName={file.name} className="h-4 w-4 shrink-0" />
                <span className="truncate">{file.path.replace(`${rootPath}/`, '')}</span>
              </div>
              <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--shell-subtle)]">enter</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
