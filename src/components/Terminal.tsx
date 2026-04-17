import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useWorkspaceStore } from '../store/store';

type TerminalProps = {
  projectId: string;
};

export function Terminal({ projectId }: TerminalProps) {
  const terminalMeta = useWorkspaceStore((state) => state.projects[projectId]?.terminal ?? null);
  const rootPath = useWorkspaceStore((state) => state.projects[projectId]?.rootPath ?? '');
  const terminalStatus = useWorkspaceStore((state) => state.projects[projectId]?.terminalStatus ?? 'idle');
  const ensureTerminal = useWorkspaceStore((state) => state.ensureTerminal);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef('');

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
      letterSpacing: 0.4,
      lineHeight: 1.25,
      theme: {
        background: '#0c1117',
        foreground: '#d4dde9',
        cursor: '#8bd3ff',
        selectionBackground: '#294968',
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
    <div className="flex h-full flex-col overflow-hidden bg-[#0c1117]">
      <div className="flex h-12 items-center justify-between border-b border-white/6 bg-white/[0.02] px-4">
        <div>
          <div className="text-sm font-medium text-white/92">Terminal</div>
          <div className="text-xs text-white/35">{rootPath}</div>
        </div>
        <div className="rounded-full border border-emerald-400/15 bg-emerald-400/8 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200/85">
          {terminalStatus}
        </div>
      </div>
      <div
        ref={hostRef}
        className="relative flex-1 min-h-0 px-3 py-3"
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
