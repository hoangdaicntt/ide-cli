import { useEffect, useMemo, useRef } from 'react';
import { Plus, TerminalSquare, X } from 'lucide-react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useWorkspaceStore } from '../store/store';

type TerminalProps = {
  projectId: string;
};

function getBaseName(targetPath: string): string {
  const normalized = targetPath.replace(/\\/g, '/').split('/').filter(Boolean);
  return normalized[normalized.length - 1] ?? targetPath;
}

export function Terminal({ projectId }: TerminalProps) {
  const terminalMeta = useWorkspaceStore((state) => state.projects[projectId]?.terminal ?? null);
  const rootPath = useWorkspaceStore((state) => state.projects[projectId]?.rootPath ?? '');
  const terminalStatus = useWorkspaceStore((state) => state.projects[projectId]?.terminalStatus ?? 'idle');
  const ensureTerminal = useWorkspaceStore((state) => state.ensureTerminal);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef('');

  const shellLabel = useMemo(() => {
    const shell = terminalMeta?.shell?.split('/').pop();
    return shell || 'bash';
  }, [terminalMeta?.shell]);

  const workspaceLabel = useMemo(() => getBaseName(rootPath), [rootPath]);

  const focusTerminal = () => {
    if (!hostRef.current) {
      return;
    }

    const helperTextarea = hostRef.current.querySelector<HTMLTextAreaElement>('.xterm-helper-textarea');

    if (helperTextarea) {
      helperTextarea.focus();
      return;
    }

    terminalRef.current?.focus();
  };

  useEffect(() => {
    if (!hostRef.current || !rootPath) {
      return;
    }

    const terminal = new XTerm({
      convertEol: true,
      cursorBlink: true,
      disableStdin: false,
      fontFamily: 'JetBrains Mono, SF Mono, Menlo, monospace',
      fontSize: 12.5,
      letterSpacing: 0.2,
      lineHeight: 1.28,
      theme: {
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#333333',
        selectionBackground: '#d8e8ff',
        black: '#1f2329',
        brightBlack: '#5f6b7a',
        blue: '#0451a5',
        brightBlue: '#0451a5',
        green: '#008000',
        brightGreen: '#008000',
        red: '#c75450',
        brightRed: '#c75450',
        yellow: '#b57d19',
        brightYellow: '#b57d19',
      },
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(hostRef.current);
    fitAddon.fit();
    requestAnimationFrame(() => {
      focusTerminal();
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    terminalIdRef.current = terminalMeta?.terminalId ?? '';

    void ensureTerminal(projectId).then((meta) => {
      if (!meta) {
        return;
      }

      terminalIdRef.current = meta.terminalId;
      fitAddon.fit();
      requestAnimationFrame(() => {
        focusTerminal();
      });
      void window.electronAPI.resizeTerminal({
        terminalId: meta.terminalId,
        cols: terminal.cols,
        rows: terminal.rows,
      });
    });

    const disposeDataListener = window.electronAPI.onTerminalData((payload) => {
      if (payload.projectId !== projectId || payload.terminalId !== terminalIdRef.current) {
        return;
      }

      terminal.write(payload.data);
    });

    const disposeExitListener = window.electronAPI.onTerminalExit((payload) => {
      if (payload.projectId !== projectId || payload.terminalId !== terminalIdRef.current) {
        return;
      }

      terminal.writeln(`\r\n[process exited: ${payload.exitCode}]`);
    });

    const disposeInput = terminal.onData((data) => {
      if (!terminalIdRef.current) {
        return;
      }

      void window.electronAPI.writeTerminal({
        terminalId: terminalIdRef.current,
        data,
      });
    });

    const handleResize = () => {
      if (!terminalIdRef.current || !fitAddonRef.current || !terminalRef.current) {
        return;
      }

      fitAddonRef.current.fit();

      void window.electronAPI.resizeTerminal({
        terminalId: terminalIdRef.current,
        cols: terminalRef.current.cols,
        rows: terminalRef.current.rows,
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
      disposeDataListener();
      disposeExitListener();
      disposeInput.dispose();
      terminal.dispose();
      terminalIdRef.current = '';
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [ensureTerminal, projectId, rootPath, terminalMeta?.terminalId]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-[var(--shell-border)] bg-[var(--panel-muted-bg)] text-[12px] text-[var(--shell-muted)]">
        <div className="flex h-9 min-w-0">
          <div className="flex items-center gap-2 border-r border-[var(--shell-border)] border-t-2 border-t-[var(--shell-accent)] bg-white px-3 text-black">
            <TerminalSquare className="h-3.5 w-3.5 text-[var(--shell-accent)]" strokeWidth={2} />
            <span className="truncate">{workspaceLabel || 'terminal'}</span>
            <button type="button" className="rounded p-0.5 text-[var(--shell-muted)] transition hover:bg-[#e8e8e8] hover:text-black">
              <X className="h-3 w-3" strokeWidth={2.1} />
            </button>
          </div>
          <div className="flex items-center gap-2 border-r border-[var(--shell-border)] px-3 hover:bg-[var(--shell-hover)]">
            <TerminalSquare className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="truncate">{shellLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 px-3">
          <span className="hidden text-[11px] text-[var(--shell-subtle)] sm:inline">{terminalStatus}</span>
          <button type="button" className="rounded p-0.5 transition hover:bg-[#e8e8e8] hover:text-black">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.1} />
          </button>
          <button type="button" className="rounded p-0.5 transition hover:bg-[#e8e8e8] hover:text-black">
            <X className="h-3.5 w-3.5" strokeWidth={2.1} />
          </button>
        </div>
      </div>

      <div
        ref={hostRef}
        className="relative flex-1 min-h-0 bg-white px-3 py-3"
        onMouseDown={() => {
          requestAnimationFrame(() => {
            focusTerminal();
          });
        }}
        onClick={() => {
          focusTerminal();
        }}
      />
    </div>
  );
}
