import type { ComponentType } from 'react';
import { getDisplayNameFromPath } from '../../store/store';
import { MarkdownContent, UserContent } from './MarkdownContent';
import type { TranscriptEntry } from './types';

export function TranscriptView({
  transcript,
  pendingRequests,
  projectId,
  isLoadingHistory,
  previousMessageCount,
  ApprovalCard,
}: {
  transcript: TranscriptEntry[];
  pendingRequests: Array<any>;
  projectId: string;
  isLoadingHistory: boolean;
  previousMessageCount: number;
  ApprovalCard: ComponentType<{ projectId: string; request: any }>;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      {isLoadingHistory ? <div className="text-sm text-[#7c8591]">Loading thread history...</div> : null}
      {transcript.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <div className="text-sm font-medium text-[#243040]">Start a Codex conversation</div>
          <p className="mt-2 text-sm leading-6 text-[#677383]">
            Select an agent, model, permission policy, attach files if needed, then send your prompt.
          </p>
        </div>
      ) : null}
      {previousMessageCount > 0 ? (
        <div className="mb-6 flex items-center gap-2 py-1 text-sm text-[#8b9098]">
          <div className="text-[13px]">{previousMessageCount} previous messages</div>
          <div className="text-[18px] leading-none text-[#b4bac3]">›</div>
        </div>
      ) : null}
      {transcript.map((entry, index) => {
        const previousRole = index > 0 ? transcript[index - 1]?.role : null;
        const showRoleLabel = previousRole !== entry.role;
        const roleName = entry.role === 'user' ? 'You' : entry.role === 'assistant' ? 'Codex' : 'System';

        return (
          <section key={entry.id} className={showRoleLabel ? 'pb-3 pt-7' : 'pb-3'}>
            {showRoleLabel ? (
              <div className="mb-2 text-[12px] font-medium text-[#8c939d]">
                {roleName}
              </div>
            ) : null}
            <div className={entry.role === 'user' ? 'pl-4' : ''}>
              {entry.role === 'user' ? (
                <UserContent text={entry.text} />
              ) : (
                <MarkdownContent text={entry.text} tone={entry.role === 'system' ? 'system' : 'default'} />
              )}
              {entry.role === 'user' && entry.attachments.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.attachments.map((filePath) => (
                    <span
                      key={filePath}
                      className="rounded-full border border-[#d7e3f3] bg-[#f4f8fd] px-2.5 py-1 text-[11px] text-[#3a5f8e]"
                    >
                      @{getDisplayNameFromPath(filePath)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
      {pendingRequests.map((request) => (
        <ApprovalCard key={String(request.requestId)} projectId={projectId} request={request} />
      ))}
    </div>
  );
}
