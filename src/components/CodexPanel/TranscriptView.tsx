import { AlertCircle, Sparkles, UserRound } from 'lucide-react';
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
    <div className="w-full">
      {isLoadingHistory ? <div className="px-4 pb-3 text-[13px] text-[var(--shell-muted)]">Loading thread history...</div> : null}
      {transcript.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <div className="text-[13px] font-medium text-[var(--shell-text)]">Start a Codex conversation</div>
          <p className="mt-2 text-[13px] leading-6 text-[var(--shell-muted)]">
            Ask Codex to inspect, edit, or explain code. Use `@` to attach files into the current task context.
          </p>
        </div>
      ) : null}
      {previousMessageCount > 0 ? (
        <div className="mb-4 flex items-center gap-2 px-4 py-1 text-[12px] text-[var(--shell-subtle)]">
          <div className="text-[13px]">{previousMessageCount} previous messages</div>
          <div className="text-[18px] leading-none text-[#b4bac3]">›</div>
        </div>
      ) : null}
      {transcript.map((entry, index) => {
        const roleTone =
          entry.role === 'user'
            ? 'bg-[var(--shell-accent)] text-white'
            : entry.role === 'system'
              ? 'bg-[#fff2f2] text-[#b03447]'
              : 'bg-[#e5e5e5] text-[var(--shell-accent)]';
        const AvatarIcon = entry.role === 'user' ? UserRound : entry.role === 'system' ? AlertCircle : Sparkles;

        return (
          <section key={entry.id} className={index === 0 ? 'pb-4' : 'py-2'}>
            <div className="flex gap-3 px-4">
              <div
                className={[
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded',
                  roleTone,
                ].join(' ')}
              >
                <AvatarIcon className="h-3.5 w-3.5" strokeWidth={2.1} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
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
                        className="rounded-full border border-[#d9d9d9] bg-[#f7f7f7] px-2.5 py-1 text-[11px] text-[var(--shell-muted)]"
                      >
                        @{getDisplayNameFromPath(filePath)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}
      <div className="px-4">
        {pendingRequests.map((request) => (
          <ApprovalCard key={String(request.requestId)} projectId={projectId} request={request} />
        ))}
      </div>
    </div>
  );
}
