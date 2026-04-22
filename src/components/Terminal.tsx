import { useEffect, useMemo, useRef } from 'react';
import { Plus, TerminalSquare, X } from 'lucide-react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useWorkspaceStore } from '../store/store';
import type { TerminalMeta } from '../shared/ipc';

type TerminalProps = {
  projectId: string;
};

type TerminalPaneProps = {
  projectId: string;
  terminalMeta: TerminalMeta;
  isActive: boolean;
};

function getBaseName(targetPath: string): string {
  const normalized = targetPath.replace(/\\/g, '/').split('/').filter(Boolean);
  return normalized[normalized.length - 1] ?? targetPath;
}

function TerminalPane({ projectId, terminalMeta, isActive }: TerminalPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const syncSize = () => {
    if (!fitAddonRef.current || !terminalRef.current) {
      return;
    }

    fitAddonRef.current.fit();

    void window.electronAPI.resizeTerminal({
      terminalId: terminalMeta.terminalId,
      cols: terminalRef.current.cols,
      rows: terminalRef.current.rows,
    });
  };

  useEffect(() => {
    if (!hostRef.current) {
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

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const disposeDataListener = window.electronAPI.onTerminalData((payload) => {
      if (payload.projectId !== projectId || payload.terminalId !== terminalMeta.terminalId) {
        return;
      }

      terminal.write(payload.data);
    });

    const disposeExitListener = window.electronAPI.onTerminalExit((payload) => {
      if (payload.projectId !== projectId || payload.terminalId !== terminalMeta.terminalId) {
        return;
      }

      terminal.writeln(`\r\n[process exited: ${payload.exitCode}]`);
    });

    const disposeInput = terminal.onData((data) => {
      void window.electronAPI.writeTerminal({
        terminalId: terminalMeta.terminalId,
        data,
      });
    });

    const resizeObserver = new ResizeObserver(() => {
      syncSize();
    });

    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
      disposeDataListener();
      disposeExitListener();
      disposeInput.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [projectId, terminalMeta.terminalId]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    requestAnimationFrame(() => {
      syncSize();
    });
  }, [isActive, terminalMeta.terminalId]);

  return (
    <div
      className={`absolute inset-0 pl-3 pr-0 ${
        isActive ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div ref={hostRef} className="h-full min-h-0" />
    </div>
  );
}

export function Terminal({ projectId }: TerminalProps) {
  const hasBootstrappedRef = useRef(false);
  const rootPath = useWorkspaceStore((state) => state.projects[projectId]?.rootPath ?? '');
  const terminals = useWorkspaceStore((state) => state.projects[projectId]?.terminals ?? []);
  const activeTerminalId = useWorkspaceStore((state) => state.projects[projectId]?.activeTerminalId ?? null);
  const ensureTerminal = useWorkspaceStore((state) => state.ensureTerminal);
  const createTerminal = useWorkspaceStore((state) => state.createTerminal);
  const setActiveTerminal = useWorkspaceStore((state) => state.setActiveTerminal);
  const closeTerminal = useWorkspaceStore((state) => state.closeTerminal);

  const activeTerminal = useMemo(
    () => terminals.find((terminal) => terminal.terminalId === activeTerminalId) ?? terminals[0] ?? null,
    [activeTerminalId, terminals],
  );
  const workspaceLabel = useMemo(() => getBaseName(rootPath), [rootPath]);

  useEffect(() => {
    if (hasBootstrappedRef.current || !rootPath || terminals.length > 0) {
      return;
    }

    hasBootstrappedRef.current = true;
    void ensureTerminal(projectId);
  }, [ensureTerminal, projectId, rootPath, terminals.length]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-[var(--shell-border)] bg-[var(--panel-muted-bg)] text-[12px] text-[var(--shell-muted)]">
        <div className="flex h-8 min-w-0 overflow-x-auto">
          {terminals.map((terminal, index) => {
            const isActive = terminal.terminalId === activeTerminal?.terminalId;
            const label = index === 0 ? workspaceLabel || 'terminal' : `${workspaceLabel || 'terminal'} ${index + 1}`;

            return (
              <div
                key={terminal.terminalId}
                onClick={() => {
                  setActiveTerminal(projectId, terminal.terminalId);
                }}
                className={`group flex min-w-0 cursor-pointer items-center gap-2 border-b-2 border-r border-[var(--shell-border)] px-3 text-left transition ${
                  isActive
                    ? 'border-b-[var(--shell-accent)] bg-white text-black'
                    : 'border-b-transparent hover:bg-[var(--shell-hover)]'
                }`}
              >
                <TerminalSquare
                  className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[var(--shell-accent)]' : ''}`}
                  strokeWidth={2}
                />
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void closeTerminal(projectId, terminal.terminalId);
                  }}
                  className="rounded p-0.5 text-[var(--shell-muted)] transition hover:bg-[#e8e8e8] hover:text-black"
                >
                  <X className="h-3 w-3" strokeWidth={2.1} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => {
              void createTerminal(projectId);
            }}
            className="rounded p-0.5 transition hover:bg-[#e8e8e8] hover:text-black"
            aria-label="Add terminal"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.1} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 bg-white">
        {terminals.map((terminal) => (
          <TerminalPane
            key={terminal.terminalId}
            projectId={projectId}
            terminalMeta={terminal}
            isActive={terminal.terminalId === activeTerminal?.terminalId}
          />
        ))}
      </div>
    </div>
  );
}
