import type { CodexChatMessage, PendingCodexRequest } from '../../store/codexStore';
import { buildMentionMarkdownFromPaths } from './MentionText';

export type TranscriptEntry = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  attachments: string[];
  turnId?: string | null;
};

export function formatAssistantFragment(message: CodexChatMessage): string {
  switch (message.kind) {
    case 'agent':
      return message.text;
    case 'command':
      {
        const commandText = message.command.filter(Boolean).join(' ').trim() || '[command unavailable]';

      return [
        'Ran command:',
        '```sh',
        commandText,
        '```',
        message.output ? ['Output:', '```text', message.output, '```'].join('\n') : '',
      ]
        .filter(Boolean)
        .join('\n\n');
      }
    case 'fileChange':
      return [
        'Updated files:',
        ...message.files.map((file) =>
          file.diff ? ['- ' + file.path, '```diff', file.diff, '```'].join('\n') : `- ${file.path}`,
        ),
      ].join('\n\n');
    case 'reasoning':
      return '';
    case 'system':
      return message.text;
    case 'user':
      return '';
    default:
      return '';
  }
}

export function buildTranscript(messages: CodexChatMessage[]): TranscriptEntry[] {
  const transcript: TranscriptEntry[] = [];

  for (const message of messages) {
    if (message.kind === 'user') {
      const fallbackText = message.attachments.length > 0 ? buildMentionMarkdownFromPaths(message.attachments) : 'Attached files only.';
      transcript.push({
        id: message.id,
        role: 'user',
        text: message.text || fallbackText,
        attachments: message.attachments,
        turnId: message.turnId,
      });
      continue;
    }

    const fragment = formatAssistantFragment(message).trim();

    if (!fragment) {
      continue;
    }

    const role: TranscriptEntry['role'] = message.kind === 'system' ? 'system' : 'assistant';
    const candidateTurnId = 'turnId' in message ? message.turnId : null;
    let targetIndex = -1;

    if (role === 'assistant' && candidateTurnId) {
      for (let index = transcript.length - 1; index >= 0; index -= 1) {
        const entry = transcript[index];

        if (entry.role === 'assistant' && entry.turnId === candidateTurnId) {
          targetIndex = index;
          break;
        }
      }
    }

    if (targetIndex >= 0) {
      transcript[targetIndex] = {
        ...transcript[targetIndex],
        text: `${transcript[targetIndex].text}\n\n${fragment}`.trim(),
      };
      continue;
    }

    const last = transcript[transcript.length - 1];

    if (!candidateTurnId && last && last.role === role) {
      last.text = `${last.text}\n\n${fragment}`.trim();
      continue;
    }

    transcript.push({
      id: message.id,
      role,
      text: fragment,
      attachments: [],
      turnId: candidateTurnId,
    });
  }

  return transcript;
}

export type { PendingCodexRequest };
