import { Fragment } from 'react';

type MentionSegment =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'mention';
      label: string;
      path: string;
    };

const mentionPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

export function parseMentionSegments(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(mentionPattern)) {
    const fullMatch = match[0] ?? '';
    const label = match[1] ?? '';
    const path = match[2] ?? '';
    const matchIndex = match.index ?? -1;

    if (matchIndex < 0) {
      continue;
    }

    if (matchIndex > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, matchIndex),
      });
    }

    segments.push({
      type: 'mention',
      label,
      path,
    });

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return segments;
}

export function buildMentionMarkdown(label: string, path: string): string {
  return `[${label}](${path})`;
}

export function buildMentionMarkdownFromPaths(paths: string[]): string {
  return paths
    .map((path) => {
      const normalizedPath = path.replace(/\\/g, '/');
      const parts = normalizedPath.split('/').filter(Boolean);
      const label = parts[parts.length - 1] ?? path;
      return buildMentionMarkdown(label, path);
    })
    .join(' ');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyMentionMarkdown(text: string, paths: string[]): string {
  let nextText = text;

  for (const path of paths) {
    const normalizedPath = path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(Boolean);
    const label = parts[parts.length - 1] ?? path;
    const markdown = buildMentionMarkdown(label, path);
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(label)}(?=\\s|$)`);

    if (pattern.test(nextText)) {
      nextText = nextText.replace(pattern, (_match, leadingSpace: string) => `${leadingSpace}${markdown}`);
      continue;
    }

    nextText = [nextText, markdown].filter(Boolean).join(nextText ? '\n\n' : '');
  }

  return nextText;
}

export function MentionText({
  text,
  linkClassName = 'text-[var(--shell-accent)]',
}: {
  text: string;
  linkClassName?: string;
}) {
  const segments = parseMentionSegments(text);

  if (segments.length === 0) {
    return null;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <Fragment key={`text-${index}`}>{segment.value}</Fragment>;
        }

        return (
          <span
            key={`mention-${segment.path}-${index}`}
            className={['font-medium', linkClassName].join(' ')}
            title={segment.path}
          >
            {segment.label}
          </span>
        );
      })}
    </>
  );
}
