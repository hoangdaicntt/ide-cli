import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownContent({ text, tone = 'default' }: { text: string; tone?: 'default' | 'system' }) {
  const proseTone = tone === 'system' ? 'text-[#7b2d33]' : 'text-[#1f2329]';

  return (
    <div className={['codex-markdown text-[15px] leading-[1.75]', proseTone].join(' ')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.03em] text-[#20242b]">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-6 text-[22px] font-semibold tracking-[-0.02em] text-[#20242b]">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-5 text-[17px] font-semibold text-[#20242b]">{children}</h3>,
          p: ({ children }) => <p className="my-3 whitespace-pre-wrap text-[15px] leading-[1.75]">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => (
            <a href={href} className="text-[#0d67c2] underline decoration-[0.08em] underline-offset-2">
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            if (!String(className ?? '').startsWith('language-')) {
              return (
                <code className="rounded-full bg-[#eef1f5] px-2 py-0.5 text-[0.92em] text-[#4b5563]">
                  {children}
                </code>
              );
            }

            const language = className?.replace('language-', '') ?? '';

            return (
              <div className="my-4 overflow-hidden rounded-[16px] border border-[#d8dee8] bg-[#10151c]">
                {language ? (
                  <div className="border-b border-[#202b37] px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-[#8fa3b8]">
                    {language}
                  </div>
                ) : null}
                <pre className="overflow-auto p-4 text-[12px] leading-6 text-[#d9e4ef]">
                  <code {...props}>{children}</code>
                </pre>
              </div>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-5 border-l-2 border-[#d5dde8] pl-4 text-[#556070]">{children}</blockquote>
          ),
          table: ({ children }) => <table className="my-5 w-full border-collapse text-left text-sm">{children}</table>,
          thead: ({ children }) => <thead className="border-b border-[#d5dde8]">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 font-semibold text-[#39414d]">{children}</th>,
          td: ({ children }) => <td className="border-b border-[#eef2f7] px-3 py-2 align-top text-[#3d4653]">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function UserContent({ text }: { text: string }) {
  return (
    <div className="text-[15px] leading-[1.75] text-[#2a3038]">
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}
