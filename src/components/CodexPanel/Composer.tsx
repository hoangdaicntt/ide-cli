import { useEffect, useMemo, useRef } from 'react';
import type { CodexApprovalPolicy, CodexModel, CodexReasoningEffort } from '../../shared/codex';
import type { FileNode } from '../../shared/ipc';
import { FilePicker } from './FilePicker';

export function CodexComposer({
  draft,
  connectionStatus,
  isSending,
  canInterrupt,
  models,
  selectedModel,
  selectedReasoningEffort,
  selectedApprovalPolicy,
  isMentionActive,
  mentionFiles,
  highlightedMentionIndex,
  mentionRootPath,
  onDraftChange,
  onSubmit,
  onInterrupt,
  onSelectModel,
  onSelectReasoningEffort,
  onSelectApprovalPolicy,
  onMentionQueryChange,
  onMentionSelect,
  onMoveMentionSelection,
  onMentionHover,
}: {
  draft: string;
  connectionStatus: string;
  isSending: boolean;
  canInterrupt: boolean;
  models: CodexModel[];
  selectedModel: string;
  selectedReasoningEffort: CodexReasoningEffort | null;
  selectedApprovalPolicy: CodexApprovalPolicy;
  isMentionActive: boolean;
  mentionFiles: FileNode[];
  highlightedMentionIndex: number;
  mentionRootPath: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onInterrupt: () => void;
  onSelectModel: (value: string) => void;
  onSelectReasoningEffort: (value: CodexReasoningEffort) => void;
  onSelectApprovalPolicy: (value: CodexApprovalPolicy) => void;
  onMentionQueryChange: (value: { query: string; start: number; end: number } | null) => void;
  onMentionSelect: () => void;
  onMoveMentionSelection: (direction: 'up' | 'down') => void;
  onMentionHover: (index: number) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentModel = useMemo(
    () => models.find((model) => model.model === selectedModel) ?? models[0] ?? null,
    [models, selectedModel],
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 96), 220)}px`;
    }
  }, [draft]);

  const updateMentionState = (value: string, caretPosition: number | null | undefined) => {
    const safeCaret = typeof caretPosition === 'number' ? caretPosition : value.length;
    const beforeCaret = value.slice(0, safeCaret);
    const match = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/);

    if (match) {
      onMentionQueryChange({
        query: match[1] ?? '',
        start: safeCaret - match[0].length + match[0].lastIndexOf('@'),
        end: safeCaret,
      });
      return;
    }

    onMentionQueryChange(null);
  };

  const reasoningOptions =
    currentModel?.supportedReasoningEfforts.map((item) => item.reasoningEffort) ?? ['minimal', 'low', 'medium', 'high', 'xhigh'];

  return (
    <div className="border-t border-[#eceef2] bg-[#f7f8fa] px-4 py-3">
      <div className="relative mx-auto max-w-3xl rounded-[20px] border border-[#dde2ea] bg-white px-4 py-3 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
        {isMentionActive ? (
          <FilePicker
            rootPath={mentionRootPath}
            files={mentionFiles}
            highlightedIndex={highlightedMentionIndex}
            onSelectFile={onMentionSelect}
            onHighlightFile={onMentionHover}
          />
        ) : null}

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value);
            updateMentionState(event.target.value, event.target.selectionStart);
          }}
          onClick={(event) => {
            updateMentionState(event.currentTarget.value, event.currentTarget.selectionStart);
          }}
          onKeyDown={(event) => {
            if (event.key === '@') {
              queueMicrotask(() => {
                if (textareaRef.current) {
                  updateMentionState(textareaRef.current.value, textareaRef.current.selectionStart);
                }
              });
            }

            if (event.key === 'Escape' && isMentionActive) {
              event.preventDefault();
              onMentionQueryChange(null);
            }

            if ((event.key === 'Tab' || event.key === 'Enter') && isMentionActive) {
              event.preventDefault();
              onMentionSelect();
              return;
            }

            if (event.key === 'ArrowDown' && isMentionActive) {
              event.preventDefault();
              onMoveMentionSelection('down');
              return;
            }

            if (event.key === 'ArrowUp' && isMentionActive) {
              event.preventDefault();
              onMoveMentionSelection('up');
              return;
            }

            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Ask for follow-up changes"
          className={[
            'min-h-[96px] w-full resize-none bg-white px-1 py-2 text-[13px] leading-6 text-[#2b3038] outline-none placeholder:text-[#b0b5bd]',
            isMentionActive ? 'pt-[276px]' : '',
          ].join(' ')}
        />

        <div className="mt-3 border-t border-[#eef2f6] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedModel}
              onChange={(event) => onSelectModel(event.target.value)}
              className="h-9 min-w-[170px] rounded-xl border border-[#dce3ec] bg-[#fafbfd] px-3 text-[13px] text-[#2a3038]"
            >
              {models.map((model) => (
                <option key={model.id} value={model.model}>
                  {model.displayName}
                </option>
              ))}
            </select>

            <select
              value={selectedReasoningEffort ?? currentModel?.defaultReasoningEffort ?? 'medium'}
              onChange={(event) => onSelectReasoningEffort(event.target.value as CodexReasoningEffort)}
              className="h-9 min-w-[120px] rounded-xl border border-[#dce3ec] bg-[#fafbfd] px-3 text-[13px] text-[#2a3038]"
            >
              {reasoningOptions.map((effort) => (
                <option key={effort} value={effort}>
                  {effort}
                </option>
              ))}
            </select>

            <select
              value={selectedApprovalPolicy}
              onChange={(event) => onSelectApprovalPolicy(event.target.value as CodexApprovalPolicy)}
              className="h-9 min-w-[130px] rounded-xl border border-[#dce3ec] bg-[#fafbfd] px-3 text-[13px] text-[#2a3038]"
            >
              <option value="on-request">ask</option>
              <option value="untrusted">untrusted</option>
              <option value="on-failure">failure</option>
              <option value="never">never</option>
            </select>

            {canInterrupt ? (
              <button
                type="button"
                onClick={onInterrupt}
                className="h-9 rounded-xl border border-[#e6c8cc] bg-[#fff7f7] px-3 text-[12px] font-medium text-[#9a4851]"
              >
                Stop
              </button>
            ) : null}

            <button
              type="button"
              onClick={onSubmit}
              disabled={connectionStatus !== 'ready' || isSending}
              className="ml-auto h-9 rounded-xl bg-[#1f78d1] px-4 text-[12px] font-medium text-white transition hover:bg-[#1868b5] disabled:cursor-not-allowed disabled:bg-[#a5bfd8]"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
