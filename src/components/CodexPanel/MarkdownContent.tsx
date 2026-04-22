import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MentionText } from './MentionText';

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="my-4 overflow-hidden rounded-[10px] border border-[var(--shell-border)] bg-[#f9f9f9]">
      <div className="flex items-center justify-between border-b border-[var(--shell-border)] bg-[#eeeeee] px-2 py-1 text-[11px] text-[var(--shell-muted)]">
        <span>{language || 'text'}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            } catch {
              setCopied(false);
            }
          }}
          className="text-[11px] transition hover:text-[var(--shell-text)]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-6 text-[var(--shell-text)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownContent({ text, tone = 'default' }: { text: string; tone?: 'default' | 'system' }) {
  const proseTone = tone === 'system' ? 'text-[#7b2d33]' : 'text-[var(--shell-text)]';

  return (
    <div className={['codex-markdown text-[13px] leading-[1.7]', proseTone].join(' ')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.03em] text-[var(--shell-text)]">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--shell-text)]">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-4 text-[16px] font-semibold text-[var(--shell-text)]">{children}</h3>,
          p: ({ children }) => <p className="my-2 whitespace-pre-wrap text-[13px] leading-[1.7]">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => (
            <a href={href} className="text-[var(--shell-accent)] underline decoration-[0.08em] underline-offset-2">
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            if (!String(className ?? '').startsWith('language-')) {
              return (
                <code className="rounded-md bg-[#efefef] px-1.5 py-0.5 text-[0.92em] text-[#555555]">
                  {children}
                </code>
              );
            }

            const language = className?.replace('language-', '') ?? '';
            return <CodeBlock language={language} code={String(children).replace(/\n$/, '')} />;
          },
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-[var(--shell-border-strong)] pl-4 text-[#555555]">{children}</blockquote>
          ),
          table: ({ children }) => <table className="my-5 w-full border-collapse text-left text-sm">{children}</table>,
          thead: ({ children }) => <thead className="border-b border-[var(--shell-border)]">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 font-semibold text-[var(--shell-text)]">{children}</th>,
          td: ({ children }) => <td className="border-b border-[#f0f0f0] px-3 py-2 align-top text-[#444444]">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function UserContent({ text }: { text: string }) {
  return (
    <div className="text-[13px] leading-[1.7] text-[var(--shell-text)]">
      <p className="whitespace-pre-wrap break-words">
        <MentionText text={text} />
      </p>
    </div>
  );
}
