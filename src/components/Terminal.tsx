import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useWorkspaceStore } from '../store/store';
import { TerminalAssetIcon } from './FileTreeAssetIcons';

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
        background: '#ffffff',
        foreground: '#1f2329',
        cursor: '#1f78d1',
        selectionBackground: '#cfe8ff',
        black: '#1f2329',
        brightBlack: '#5f6b7a',
        blue: '#1f78d1',
        brightBlue: '#4d9df7',
        green: '#2f8f5b',
        brightGreen: '#4caf74',
        red: '#c75450',
        brightRed: '#e06764',
        yellow: '#b57d19',
        brightYellow: '#d19a2a',
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
    <div className="flex h-full flex-col overflow-hidden bg-[#fbfcfe]">
      <div className="flex h-9 items-center justify-between border-b border-[#d4dae3] bg-[#f7f9fc] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <TerminalAssetIcon />
          <div>
            <div className="text-[12px] font-medium text-[#1f2329]">Terminal</div>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="text-[11px] text-[#7b8594]">{rootPath}</div>
          <div className="border border-[#d2d8e1] bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#556070]">
            {terminalStatus}
          </div>
        </div>
      </div>
      <div
        ref={hostRef}
        className="relative flex-1 min-h-0 bg-white px-2 py-2"
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
