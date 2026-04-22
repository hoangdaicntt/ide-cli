import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, ArrowUp, Check, ChevronDown, Plus, Square } from 'lucide-react';
import type { CodexApprovalPolicy, CodexModel, CodexReasoningEffort } from '../../shared/codex';
import type { ContextPickerItem } from './FilePicker';
import { FilePicker } from './FilePicker';

function formatOptionLabel(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function formatModelLabel(value: string): string {
  return value
    .split('-')
    .map((part) => {
      if (!part) {
        return part;
      }

      if (part.toLowerCase() === 'gpt') {
        return 'GPT';
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('-');
}

function trimLeadingMentionMarker(value: string): string {
  return value.replace(/^@+/, '');
}

function ComposerDropdown({
  value,
  items,
  onSelect,
  className = '',
  labelClassName = '',
  icon,
  align = 'right',
}: {
  value: string;
  items: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  className?: string;
  labelClassName?: string;
  icon?: ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectedItem = items.find((item) => item.value === value) ?? items[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={hostRef} className={['relative inline-flex shrink-0', className].join(' ')}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 items-center gap-1.5 rounded-md bg-transparent px-2 pr-6 text-[13px] font-medium outline-none transition hover:bg-[#f4f4f4] hover:text-[var(--shell-text)]"
      >
        {icon ? <span className="pointer-events-none shrink-0">{icon}</span> : null}
        <span className={['whitespace-nowrap', labelClassName].join(' ')}>{selectedItem?.label ?? value}</span>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--shell-muted)]" strokeWidth={2} />
      </button>

      {open ? (
        <div
          className={[
            'absolute bottom-[calc(100%+10px)] z-30 min-w-full overflow-hidden rounded-[14px] border border-[var(--shell-border-strong)] bg-white py-1 shadow-[var(--shell-shadow)]',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {items.map((item) => {
            const isSelected = item.value === value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onSelect(item.value);
                  setOpen(false);
                }}
                className={[
                  'flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] font-medium transition',
                  isSelected ? 'bg-[var(--shell-selected)] text-[var(--shell-text)]' : 'text-[var(--shell-muted)] hover:bg-[#f6f6f6] hover:text-[var(--shell-text)]',
                ].join(' ')}
              >
                <span className="whitespace-nowrap">{item.label}</span>
                <Check className={['h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0'].join(' ')} strokeWidth={2.2} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
  isMentionActive,
  mentionItems,
  highlightedMentionIndex,
  pendingCaretPosition,
  onPendingCaretApplied,
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
  mentionItems: ContextPickerItem[];
  highlightedMentionIndex: number;
  pendingCaretPosition: number | null;
  onPendingCaretApplied: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onInterrupt: () => void;
  onSelectModel: (value: string) => void;
  onSelectReasoningEffort: (value: CodexReasoningEffort) => void;
  onSelectApprovalPolicy: (value: CodexApprovalPolicy) => void;
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
    const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 76), 220);
    textareaRef.current.style.height = `${nextHeight}px`;
    textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > 220 ? 'auto' : 'hidden';
  };

  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [draft]);

  useLayoutEffect(() => {
    if (!textareaRef.current || pendingCaretPosition === null) {
      return;
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pendingCaretPosition, pendingCaretPosition);
    onPendingCaretApplied();
  }, [onPendingCaretApplied, pendingCaretPosition]);

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
  const showStopButton = canInterrupt || isSending;
  const approvalOptions: Array<{ value: CodexApprovalPolicy; label: string }> = [
    { value: 'on-request', label: 'Full access' },
    { value: 'untrusted', label: 'Restricted' },
    { value: 'on-failure', label: 'On failure' },
    { value: 'never', label: 'Never' },
  ];
  const modelOptions = models.map((model) => ({
    value: model.model,
    label: formatModelLabel(model.displayName),
  }));
  const reasoningDropdownOptions = reasoningOptions.map((effort) => ({
    value: effort,
    label: formatOptionLabel(effort),
  }));

  return (
    <div className="border-t border-[var(--shell-border)] bg-[var(--panel-bg)] px-4 py-3">
      <div className="relative">
        {isMentionActive ? (
          <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(100%+12px)] z-20 transition-all duration-150">
            <FilePicker
              items={mentionItems}
              highlightedIndex={highlightedMentionIndex}
              onSelectItem={onMentionSelect}
              onHighlightItem={onMentionHover}
            />
          </div>
        ) : null}

        <div className="relative rounded-[18px] border border-[var(--shell-border-strong)] bg-white p-[9px] shadow-[var(--shell-shadow)]">
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
            spellCheck={false}
            placeholder="Type a prompt or @mention files"
            className="no-scrollbar min-h-[76px] w-full resize-none bg-transparent px-0 py-0 text-[13px] leading-5 text-[var(--shell-text)] outline-none placeholder:text-[#a8a8a8]"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center text-[13px] text-[var(--shell-muted)]">
              <button
                type="button"
                aria-label="Add context"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-[#f4f4f4] hover:text-[var(--shell-text)]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.1} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-[var(--shell-muted)]">
              <ComposerDropdown
                value={selectedApprovalPolicy}
                items={approvalOptions}
                onSelect={(value) => onSelectApprovalPolicy(value as CodexApprovalPolicy)}
                labelClassName="text-[#b48600]"
                icon={<AlertCircle className="h-3.5 w-3.5 text-[#b48600]" strokeWidth={2} />}
              />

              <ComposerDropdown
                value={selectedModel}
                items={modelOptions}
                onSelect={onSelectModel}
              />

              <ComposerDropdown
                value={selectedReasoningEffort ?? currentModel?.defaultReasoningEffort ?? 'medium'}
                items={reasoningDropdownOptions}
                onSelect={(value) => onSelectReasoningEffort(value as CodexReasoningEffort)}
              />

              <button
                type="button"
                onClick={showStopButton ? onInterrupt : onSubmit}
                disabled={!showStopButton && connectionStatus !== 'ready'}
                aria-label={showStopButton ? 'Stop response' : 'Send prompt'}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full transition',
                  showStopButton
                    ? 'border border-[#f0caca] bg-[#fff4f4] text-[#9a4851] hover:bg-[#ffeded]'
                    : 'bg-[#1a1a1a] text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-[#a5a5a5]',
                ].join(' ')}
              >
                {showStopButton ? <Square className="h-3.5 w-3.5 fill-current" strokeWidth={2.2} /> : <ArrowUp className="h-4 w-4" strokeWidth={2.2} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
