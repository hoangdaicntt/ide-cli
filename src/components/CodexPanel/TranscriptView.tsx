import { Check, Copy } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { MarkdownContent, UserContent } from './MarkdownContent';
import type { TranscriptEntry } from './types';

function formatMessageTimestamp(timestamp?: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp ?? Date.now());
}

function MessageCopyButton({
  text,
  variant,
}: {
  text: string;
  variant: 'inline' | 'footer';
}) {
  const [copied, setCopied] = useState(false);

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          } catch {
            setCopied(false);
          }
        }}
        className="inline-flex shrink-0 items-center justify-center self-end text-[1em] leading-none text-[var(--shell-muted)] transition hover:text-[var(--shell-text)]"
        aria-label={copied ? 'Copied message' : 'Copy message'}
        title={copied ? 'Copied' : 'Copy message'}
      >
        {copied ? <Check className="h-[1em] w-[1em]" strokeWidth={2.2} /> : <Copy className="h-[1em] w-[1em]" strokeWidth={2.1} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center text-[12px] leading-none text-[var(--shell-muted)] transition hover:text-[var(--shell-text)]"
      aria-label={copied ? 'Copied message' : 'Copy message'}
      title={copied ? 'Copied' : 'Copy message'}
    >
      {copied ? <Check className="h-[1em] w-[1em]" strokeWidth={2.2} /> : <Copy className="h-[1em] w-[1em]" strokeWidth={2.1} />}
    </button>
  );
}

export function TranscriptView({
  transcript,
  pendingRequests,
  projectId,
  isLoadingHistory,
  previousMessageCount,
  activeTurnId,
  ApprovalCard,
}: {
  transcript: TranscriptEntry[];
  pendingRequests: Array<any>;
  projectId: string;
  isLoadingHistory: boolean;
  previousMessageCount: number;
  activeTurnId: string | null;
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
        const isThinking = entry.role === 'assistant' && entry.turnId != null && entry.turnId === activeTurnId;
        const timestampLabel = entry.role === 'user' ? null : formatMessageTimestamp(entry.createdAt);
        const containerClass =
          entry.role === 'user'
            ? 'rounded-2xl bg-[#f1f3f5] px-4 py-3.5'
            : entry.role === 'system'
              ? 'rounded-2xl border border-[#f3d5d9] bg-[#fff6f7] px-4 py-3.5'
              : 'py-3.5';
        const wrapperClass = 'px-4';

        return (
          <section key={entry.id} className={index === 0 ? 'pb-4' : 'py-2'}>
            <div className={wrapperClass}>
              <div className={containerClass}>
                {entry.role === 'user' ? (
                  <div className="flex items-start gap-1.5 text-[13px] leading-[1.7]">
                    <div className="min-w-0 flex-1">
                      <UserContent text={entry.text} />
                    </div>
                    <MessageCopyButton text={entry.text} variant="inline" />
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <MarkdownContent text={entry.text} tone={entry.role === 'system' ? 'system' : 'default'} />
                    </div>
                    {isThinking ? (
                      <div className="mt-3 inline-flex items-center gap-2 text-[12px] text-[var(--shell-subtle)]">
                        <span>Thinking</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
                          <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                          <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-3 text-[12px] text-[var(--shell-subtle)]">
                        <MessageCopyButton text={entry.text} variant="footer" />
                        <div>{timestampLabel ?? ''}</div>
                      </div>
                    )}
                  </>
                )}
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
