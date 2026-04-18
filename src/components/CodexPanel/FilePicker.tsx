import type { FileNode } from '../../shared/ipc';

export function FilePicker({
  rootPath,
  files,
  fileQuery,
  highlightedIndex,
  onQueryChange,
  onSelectFile,
  onHighlightFile,
}: {
  rootPath: string;
  files: FileNode[];
  fileQuery: string;
  highlightedIndex: number;
  onQueryChange: (value: string) => void;
  onSelectFile: (filePath: string) => void;
  onHighlightFile: (index: number) => void;
}) {
  return (
    <div className="absolute inset-x-5 bottom-[154px] z-10 mx-auto max-w-3xl overflow-hidden rounded-[18px] border border-[#dbe1e8] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="border-b border-[#e6ebf1] bg-[#fbfcfd] p-3">
        <input
          value={fileQuery}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search project files with @ ..."
          className="h-9 w-full rounded-xl border border-[#d9dee6] bg-white px-3 text-[13px] text-[#1f2329] outline-none placeholder:text-[#99a1ac]"
        />
      </div>
      <div className="max-h-72 overflow-auto p-2">
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
              <span className="text-[11px] uppercase tracking-[0.12em]">enter</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
