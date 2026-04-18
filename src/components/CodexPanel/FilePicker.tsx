import type { FileNode } from '../../shared/ipc';

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
    <div className="absolute inset-x-4 top-4 z-10 overflow-hidden rounded-[16px] border border-[#dbe1e8] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="border-b border-[#e6ebf1] bg-[#fbfcfd] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#7f8895]">
        Project files
      </div>
      <div className="max-h-64 overflow-auto p-2">
        {files.length === 0 ? (
          <div className="px-3 py-8 text-center text-[13px] text-[#7c8591]">No matching files.</div>
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
                'mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px]',
                isHighlighted ? 'bg-[#edf5ff] text-[#1d4f89]' : 'text-[#2a313c] hover:bg-[#f6f8fb]',
              ].join(' ')}
            >
              <span className="truncate">{file.path.replace(`${rootPath}/`, '')}</span>
              <span className="text-[11px] uppercase tracking-[0.12em] text-[#8fa0b5]">enter</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
