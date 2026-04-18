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
    <div className="border-b border-[#eceef2] bg-[#fafbfc] px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a9099]">Codex</div>
          <div className="mt-1 truncate text-[12px] text-[#6e7784]">{rootPath}</div>
        </div>
        <div className="shrink-0 text-[11px] text-[#9ba2ad]">{connectionStatus === 'ready' ? 'Connected' : connectionStatus}</div>
      </div>
      {connectionError ? <div className="mt-2 text-xs text-[#b03447]">{connectionError}</div> : null}
    </div>
  );
}
