import { useLayoutEffect, useMemo, useRef } from 'react';
import { AlertCircle, ArrowUp, ChevronDown, Plus } from 'lucide-react';
import type { CodexApprovalPolicy, CodexModel, CodexReasoningEffort } from '../../shared/codex';
import type { ContextPickerItem } from './FilePicker';
import { FilePicker } from './FilePicker';
import { TreeAssetIcon } from '../FileTreeAssetIcons';

function formatOptionLabel(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function trimLeadingMentionMarker(value: string): string {
  return value.replace(/^@+/, '');
}

export function CodexComposer({
  draft,
  connectionStatus,
  isSending,
  canInterrupt,
  models,
  selectedModel,
  selectedReasoningEffort,
  selectedApprovalPolicy,
  attachedItems,
  isMentionActive,
  mentionItems,
  highlightedMentionIndex,
  onDraftChange,
  onSubmit,
  onInterrupt,
  onSelectModel,
  onSelectReasoningEffort,
  onSelectApprovalPolicy,
  onRemoveAttachment,
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
  attachedItems: ContextPickerItem[];
  isMentionActive: boolean;
  mentionItems: ContextPickerItem[];
  highlightedMentionIndex: number;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onInterrupt: () => void;
  onSelectModel: (value: string) => void;
  onSelectReasoningEffort: (value: CodexReasoningEffort) => void;
  onSelectApprovalPolicy: (value: CodexApprovalPolicy) => void;
  onRemoveAttachment: (filePath: string) => void;
  onMentionQueryChange: (value: { query: string; start: number; end: number } | null) => void;
  onMentionSelect: (itemPath?: string) => void;
  onMoveMentionSelection: (direction: 'up' | 'down') => void;
  onMentionHover: (index: number) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentModel = useMemo(
    () => models.find((model) => model.model === selectedModel) ?? models[0] ?? null,
    [models, selectedModel],
  );

  const adjustTextareaHeight = () => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 86), 220);
    textareaRef.current.style.height = `${nextHeight}px`;
    textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > 220 ? 'auto' : 'hidden';
  };

  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [draft]);

  const updateMentionState = (value: string, caretPosition: number | null | undefined) => {
    const safeCaret = typeof caretPosition === 'number' ? caretPosition : value.length;
    const beforeCaret = value.slice(0, safeCaret);
    const match = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/);

    if (match) {
      onMentionQueryChange({
        query: trimLeadingMentionMarker(match[1] ?? ''),
        start: safeCaret - match[0].length + match[0].lastIndexOf('@'),
        end: safeCaret,
      });
      return;
    }

    onMentionQueryChange(null);
  };

  const reasoningOptions =
    currentModel?.supportedReasoningEfforts.map((item) => item.reasoningEffort) ?? ['minimal', 'low', 'medium', 'high', 'xhigh'];
  const showFloatingPanel = isMentionActive || attachedItems.length > 0;

  return (
    <div className="border-t border-[var(--shell-border)] bg-[var(--panel-bg)] px-4 py-3">
      <div className="relative">
        {showFloatingPanel ? (
          <div className="pointer-events-auto absolute inset-x-2 bottom-[calc(100%-1px)] z-10 overflow-hidden rounded-t-[18px] border border-[var(--shell-border-strong)] border-b-0 bg-white shadow-[var(--shell-shadow)] transition-all duration-150">
            {isMentionActive ? (
              <FilePicker
                items={mentionItems}
                highlightedIndex={highlightedMentionIndex}
                onSelectItem={onMentionSelect}
                onHighlightItem={onMentionHover}
              />
            ) : (
              <div className="flex max-h-44 flex-col">
                <div className="border-b border-[var(--shell-border)] bg-[#fbfcfd] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--shell-muted)]">
                  Selected context
                </div>
                <div className="overflow-auto px-2 py-1.5 custom-scrollbar">
                  {attachedItems.map((item) => (
                    <div
                      key={item.path}
                      className="group mb-1 flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] text-[var(--shell-text)] transition hover:bg-[#f5f5f5]"
                    >
                      <TreeAssetIcon fileName={item.name} isFolder={item.type === 'directory'} className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate text-[var(--shell-muted)]">{item.relativePath}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(item.path)}
                        className="ml-auto shrink-0 text-[11px] text-[var(--shell-subtle)] opacity-0 transition hover:text-[var(--shell-text)] group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="relative rounded-[18px] border border-[var(--shell-border-strong)] bg-white px-3 py-3 shadow-[var(--shell-shadow)]">
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
            placeholder="Type a prompt or @mention files"
            className="min-h-[86px] w-full resize-none bg-transparent px-1 py-1 text-[15px] leading-6 text-[var(--shell-text)] outline-none placeholder:text-[#a8a8a8]"
          />

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--shell-border)] px-1 pt-3">
            <div className="flex items-center gap-2 text-[13px] text-[var(--shell-muted)]">
              <button
                type="button"
                aria-label="Add context"
                className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[#f4f4f4] hover:text-[var(--shell-text)]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.1} />
              </button>

              <div className="relative pl-5">
                <AlertCircle className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b48600]" strokeWidth={2} />
                <select
                  value={selectedApprovalPolicy}
                  onChange={(event) => onSelectApprovalPolicy(event.target.value as CodexApprovalPolicy)}
                  className="h-8 appearance-none bg-transparent pr-5 text-[13px] font-medium text-[#b48600] outline-none"
                >
                  <option value="on-request">Full access</option>
                  <option value="untrusted">Restricted</option>
                  <option value="on-failure">On failure</option>
                  <option value="never">Never</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" strokeWidth={2} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(event) => onSelectModel(event.target.value)}
                  className="h-8 appearance-none bg-transparent pr-5 text-[13px] font-medium text-[var(--shell-muted)] outline-none"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.model}>
                      {model.displayName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" strokeWidth={2} />
              </div>

              <div className="relative">
                <select
                  value={selectedReasoningEffort ?? currentModel?.defaultReasoningEffort ?? 'medium'}
                  onChange={(event) => onSelectReasoningEffort(event.target.value as CodexReasoningEffort)}
                  className="h-8 appearance-none bg-transparent pr-5 text-[13px] font-medium text-[var(--shell-muted)] outline-none"
                >
                  {reasoningOptions.map((effort) => (
                    <option key={effort} value={effort}>
                      {formatOptionLabel(effort)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" strokeWidth={2} />
              </div>

              {canInterrupt ? (
                <button
                  type="button"
                  onClick={onInterrupt}
                  className="h-8 rounded-full border border-[#f0caca] bg-[#fff4f4] px-3 text-[12px] font-medium text-[#9a4851] transition hover:bg-[#ffeded]"
                >
                  Stop
                </button>
              ) : null}

              <button
                type="button"
                onClick={onSubmit}
                disabled={connectionStatus !== 'ready' || isSending}
                aria-label={isSending ? 'Sending' : 'Send prompt'}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#a5a5a5]"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
