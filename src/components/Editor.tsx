import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { useMemo } from 'react';
import { CloseIcon, TreeAssetIcon } from './FileTreeAssetIcons';
import { getActiveEditorTab, useWorkspaceStore } from '../store/store';

type EditorProps = {
  projectId: string;
};

function getLanguageFromPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'sh':
    case 'zsh':
      return 'shell';
    default:
      return 'plaintext';
  }
}

export function Editor({ projectId }: EditorProps) {
  const project = useWorkspaceStore((state) => state.projects[projectId]);
  const updateFileContent = useWorkspaceStore((state) => state.updateFileContent);
  const setActiveFile = useWorkspaceStore((state) => state.setActiveFile);
  const closeFile = useWorkspaceStore((state) => state.closeFile);
  const activeTab = useMemo(() => getActiveEditorTab(project ?? null), [project]);
  const openTabs = useMemo(() => Object.values(project?.openFiles ?? {}), [project?.openFiles]);

  const handleMount: OnMount = (_editor, monaco) => {
    monaco.editor.defineTheme('demo-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#333333',
        'editorLineNumber.foreground': '#237893',
        'editorLineNumber.activeForeground': '#0451a5',
        'editorCursor.foreground': '#1f1f1f',
        'editor.selectionBackground': '#d8e8ff',
        'editor.inactiveSelectionBackground': '#e8f1ff',
        'editorIndentGuide.background1': '#efefef',
        'editorIndentGuide.activeBackground1': '#d9d9d9',
      },
    });

    monaco.editor.setTheme('demo-light');
  };

  if (!activeTab) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="max-w-sm text-center">
          <p className="text-lg font-medium text-[var(--shell-text)]">Select a file to start editing</p>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Open any file from the project tree to load it into the central editor pane.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="border-b border-[var(--shell-border)] bg-[var(--panel-muted-bg)]">
        <div className="flex min-w-0 overflow-x-auto no-scrollbar">
          {openTabs.map((tab) => {
            const isActive = tab.path === activeTab.path;

            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => setActiveFile(projectId, tab.path)}
                className={[
                  'group flex h-8 min-w-0 max-w-[220px] items-center gap-2 border-b-2 border-r border-[var(--shell-border)] px-3 text-left text-[13px] transition',
                  isActive
                    ? 'border-b-[var(--shell-accent)] bg-white text-black'
                    : 'border-b-transparent text-[var(--shell-muted)] hover:bg-[var(--shell-hover)]',
                ].join(' ')}
              >
                <TreeAssetIcon fileName={tab.name} className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{tab.name}</span>
                {tab.isDirty ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--shell-accent)]" /> : null}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeFile(projectId, tab.path);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      closeFile(projectId, tab.path);
                    }
                  }}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-50 transition hover:bg-[#e8e8e8] hover:opacity-100"
                >
                  <CloseIcon className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <MonacoEditor
        path={activeTab.path}
        theme="demo-light"
        language={getLanguageFromPath(activeTab.path)}
        value={activeTab.content}
        onMount={handleMount}
        onChange={(value) => {
          updateFileContent(projectId, activeTab.path, value ?? '');
        }}
        options={{
          automaticLayout: true,
          fontFamily: 'JetBrains Mono, SF Mono, Menlo, monospace',
          fontSize: 14,
          lineHeight: 22,
          minimap: { enabled: false },
          smoothScrolling: false,
          roundedSelection: true,
          cursorBlinking: 'blink',
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          padding: { top: 14, bottom: 14 },
        }}
      />
    </div>
  );
}
