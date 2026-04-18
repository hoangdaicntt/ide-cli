import { getDisplayNameFromPath } from '../../store/store';
import type {
  CodexApprovalPolicy,
  CodexMode,
  CodexModel,
  CodexReasoningEffort,
  CodexSandboxMode,
} from '../../shared/codex';
import { useEffect, useMemo, useRef } from 'react';

function toneButtonClass(isActive: boolean): string {
  return [
    'rounded-full border px-3 py-1.5 text-[12px] font-medium transition',
    isActive
      ? 'border-[#c8d9fb] bg-[#d9e8ff] text-[#2a5e9c]'
      : 'border-[#dfe5ee] bg-white text-[#6c7683] hover:border-[#cfd7e3] hover:text-[#2a313c]',
  ].join(' ');
}

export function CodexComposer({
  draft,
  attachedFilePaths,
  connectionStatus,
  isSending,
  canInterrupt,
  modes,
  models,
  selectedMode,
  selectedModel,
  selectedReasoningEffort,
  selectedSandboxMode,
  selectedApprovalPolicy,
  isMentionActive,
  onDraftChange,
  onSubmit,
  onInterrupt,
  onTogglePicker,
  onRemoveAttachedFile,
  onSelectMode,
  onSelectModel,
  onSelectReasoningEffort,
  onSelectSandboxMode,
  onSelectApprovalPolicy,
  onMentionQueryChange,
  onMentionSelect,
}: {
  draft: string;
  attachedFilePaths: string[];
  connectionStatus: string;
  isSending: boolean;
  canInterrupt: boolean;
  modes: CodexMode[];
  models: CodexModel[];
  selectedMode: string;
  selectedModel: string;
  selectedReasoningEffort: CodexReasoningEffort | null;
  selectedSandboxMode: CodexSandboxMode;
  selectedApprovalPolicy: CodexApprovalPolicy;
  isMentionActive: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onInterrupt: () => void;
  onTogglePicker: () => void;
  onRemoveAttachedFile: (filePath: string) => void;
  onSelectMode: (value: string) => void;
  onSelectModel: (value: string) => void;
  onSelectReasoningEffort: (value: CodexReasoningEffort) => void;
  onSelectSandboxMode: (value: CodexSandboxMode) => void;
  onSelectApprovalPolicy: (value: CodexApprovalPolicy) => void;
  onMentionQueryChange: (value: string | null) => void;
  onMentionSelect: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentModel = useMemo(
    () => models.find((model) => model.model === selectedModel) ?? models[0] ?? null,
    [models, selectedModel],
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 112), 220)}px`;
    }
  }, [draft]);

  const updateMentionState = (value: string, caretPosition: number | null | undefined) => {
    const safeCaret = typeof caretPosition === 'number' ? caretPosition : value.length;
    const beforeCaret = value.slice(0, safeCaret);
    const match = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/);

    if (match) {
      onMentionQueryChange(match[1] ?? '');
      return;
    }

    onMentionQueryChange(null);
  };

  return (
    <div className="border-t border-[#eceef2] bg-[#f7f8fa] px-5 py-4">
      <div className="mx-auto max-w-3xl rounded-[34px] border border-[#dde2ea] bg-white px-4 py-3 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
        {attachedFilePaths.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFilePaths.map((filePath) => (
              <button
                key={filePath}
                type="button"
                onClick={() => onRemoveAttachedFile(filePath)}
                className="rounded-full border border-[#cfdcf0] bg-[#f5f9ff] px-2.5 py-1 text-[11px] font-medium text-[#52739c]"
              >
                @{getDisplayNameFromPath(filePath)} ×
              </button>
            ))}
          </div>
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
              onMentionQueryChange(null);
            }

            if (event.key === 'Tab' && isMentionActive) {
              event.preventDefault();
              onMentionSelect();
              return;
            }

            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Ask for follow-up changes"
          className="min-h-[108px] w-full resize-none bg-white px-1 py-2 text-[15px] leading-7 text-[#2b3038] outline-none placeholder:text-[#b0b5bd]"
        />
        <div className="mt-4 border-t border-[#eef2f6] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onTogglePicker}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7dee8] bg-[#fafbfd] text-[18px] leading-none text-[#576170]"
            >
              +
            </button>
            <select
              value={selectedModel}
              onChange={(event) => onSelectModel(event.target.value)}
              className="h-10 min-w-[170px] rounded-full border border-[#dce3ec] bg-[#fafbfd] px-4 text-sm text-[#2a3038]"
            >
              {models.map((model) => (
                <option key={model.id} value={model.model}>
                  {model.displayName}
                </option>
              ))}
            </select>
            {currentModel ? (
              <div className="rounded-full border border-[#dce3ec] bg-[#fafbfd] px-4 py-2 text-[13px] text-[#707987]">
                {currentModel.supportedReasoningEfforts.length > 0 ? 'Reasoning' : 'Chat'}
              </div>
            ) : null}
            <div className="hidden h-7 w-px bg-[#e6ebf1] sm:block" />
            {canInterrupt ? (
              <button
                type="button"
                onClick={onInterrupt}
                className="rounded-full border border-[#e6c8cc] bg-[#fff7f7] px-3 py-2 text-[12px] font-medium text-[#9a4851]"
              >
                Interrupt
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {modes.map((mode) => {
              const value = mode.mode ?? mode.name.toLowerCase();

              return (
                <button
                  key={mode.name}
                  type="button"
                  onClick={() => onSelectMode(value)}
                  className={toneButtonClass(selectedMode === value)}
                >
                  {mode.name}
                </button>
              );
            })}
            <div className="hidden h-7 w-px self-center bg-[#e6ebf1] sm:block" />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {(['minimal', 'low', 'medium', 'high', 'xhigh'] as CodexReasoningEffort[]).map((effort) => (
              <button
                key={effort}
                type="button"
                onClick={() => onSelectReasoningEffort(effort)}
                className={toneButtonClass((selectedReasoningEffort ?? 'medium') === effort)}
              >
                {effort}
              </button>
            ))}
            <div className="hidden h-7 w-px self-center bg-[#e6ebf1] sm:block" />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['workspace-write', 'workspace'],
                ['read-only', 'read only'],
                ['danger-full-access', 'full access'],
              ] as Array<[CodexSandboxMode, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onSelectSandboxMode(value)}
                className={toneButtonClass(selectedSandboxMode === value)}
              >
                {label}
              </button>
            ))}
            <div className="hidden h-7 w-px self-center bg-[#e6ebf1] sm:block" />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['on-request', 'ask'],
                ['untrusted', 'untrusted'],
                ['on-failure', 'failure'],
                ['never', 'never'],
              ] as Array<[CodexApprovalPolicy, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onSelectApprovalPolicy(value)}
                className={toneButtonClass(selectedApprovalPolicy === value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-3">
            <div className="text-xs text-[#8b9098]">{attachedFilePaths.length} tag(s)</div>
            <button
              type="button"
              disabled={connectionStatus !== 'ready' || isSending}
              onClick={onSubmit}
              className="rounded-full bg-[#7295f6] px-4 py-2 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
