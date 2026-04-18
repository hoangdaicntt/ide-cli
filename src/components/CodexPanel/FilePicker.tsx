import type { FileNode } from '../../shared/ipc';

export function FilePicker({
  rootPath,
  files,
  attachedFilePaths,
  fileQuery,
  onQueryChange,
  onToggleFile,
}: {
  rootPath: string;
  files: FileNode[];
  attachedFilePaths: string[];
  fileQuery: string;
  onQueryChange: (value: string) => void;
  onToggleFile: (filePath: string) => void;
}) {
  return (
    <div className="absolute inset-x-5 bottom-[176px] z-10 mx-auto max-w-3xl overflow-hidden rounded-[22px] border border-[#dbe1e8] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="border-b border-[#e6ebf1] bg-[#fbfcfd] p-3">
        <input
          value={fileQuery}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search project files with @ ..."
          className="h-10 w-full rounded-full border border-[#d9dee6] bg-white px-3 text-sm text-[#1f2329] outline-none placeholder:text-[#99a1ac]"
        />
      </div>
      <div className="max-h-72 overflow-auto p-2">
        {files.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-[#7c8591]">No matching files.</div>
        ) : null}
        {files.map((file) => {
          const isSelected = attachedFilePaths.includes(file.path);

          return (
            <button
              key={file.path}
              type="button"
              onClick={() => onToggleFile(file.path)}
              className={[
                'mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm',
                isSelected ? 'bg-[#edf5ff] text-[#1d4f89]' : 'text-[#2a313c] hover:bg-[#f6f8fb]',
              ].join(' ')}
            >
              <span className="truncate">{file.path.replace(`${rootPath}/`, '')}</span>
              <span className="text-[11px] uppercase tracking-[0.12em]">{isSelected ? 'added' : 'add'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
