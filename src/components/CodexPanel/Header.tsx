export function CodexHeader({
  rootPath,
  connectionStatus,
  connectionError,
  threadSummaries,
  activeThreadId,
  onNewChat,
  onSelectThread,
}: {
  rootPath: string;
  connectionStatus: string;
  connectionError: string | null;
  threadSummaries: Array<{ id: string; name?: string | null; preview?: string }>;
  activeThreadId: string;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
}) {
  return (
    <div className="border-b border-[#eceef2] bg-[#fafbfc] px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 truncate text-[12px] text-[#8a9099]">{rootPath}</div>
        <div className="shrink-0 text-[11px] text-[#9ba2ad]">{connectionStatus === 'ready' ? 'Connected' : connectionStatus}</div>
      </div>
      {connectionError ? <div className="mt-2 text-xs text-[#b03447]">{connectionError}</div> : null}
      <div className="mt-3 flex items-center gap-2">
        <select
          value={activeThreadId}
          onChange={(event) => onSelectThread(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-full border border-[#e1e5eb] bg-white px-3 text-[12px] text-[#5e6672]"
        >
          <option value="">Current draft</option>
          {threadSummaries.map((thread) => (
            <option key={thread.id} value={thread.id}>
              {(thread.name || thread.preview || 'Untitled chat').slice(0, 80)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-8 items-center justify-center rounded-full border border-[#e1e5eb] bg-white px-3 text-[12px] font-medium text-[#5e6672]"
        >
          New Chat
        </button>
      </div>
    </div>
  );
}
