import { useCodexStore } from '../../store/codexStore';
import type { PendingCodexRequest } from './types';

export function ApprovalCard({ projectId, request }: { projectId: string; request: PendingCodexRequest }) {
  const resolvePendingRequest = useCodexStore((state) => state.resolvePendingRequest);

  return (
    <div className="my-6 rounded-[14px] border border-[#f1dcc0] bg-[#fff9f1] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f5c1d]">Approval</div>
          <div className="mt-1 text-sm font-medium text-[#3a2c1e]">{request.method}</div>
        </div>
        <div className="rounded-full border border-[#efcf9e] bg-white px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#8f5c1d]">
          pending
        </div>
      </div>
      {request.reason ? <p className="mt-2 text-sm leading-6 text-[#6f583f]">{request.reason}</p> : null}
      {'command' in request.payload && Array.isArray(request.payload.command) ? (
        <pre className="mt-3 overflow-auto border border-[#f1dcc0] bg-white p-2 text-xs text-[#5b4634]">
          {(request.payload.command as string[]).join(' ')}
        </pre>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void resolvePendingRequest({ projectId, requestId: request.requestId, decision: 'accept' });
          }}
          className="border border-[#b7d8bf] bg-[#edf8f0] px-3 py-1.5 text-xs font-medium text-[#215f39]"
        >
          Allow
        </button>
        <button
          type="button"
          onClick={() => {
            void resolvePendingRequest({ projectId, requestId: request.requestId, decision: 'acceptForSession' });
          }}
          className="border border-[#c5d7ef] bg-[#eef5ff] px-3 py-1.5 text-xs font-medium text-[#295a9e]"
        >
          Allow Session
        </button>
        <button
          type="button"
          onClick={() => {
            void resolvePendingRequest({ projectId, requestId: request.requestId, decision: 'decline' });
          }}
          className="border border-[#e2c0c4] bg-[#fff3f4] px-3 py-1.5 text-xs font-medium text-[#98383f]"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => {
            void resolvePendingRequest({ projectId, requestId: request.requestId, decision: 'cancel' });
          }}
          className="border border-[#d2d8e1] bg-white px-3 py-1.5 text-xs font-medium text-[#566273]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
