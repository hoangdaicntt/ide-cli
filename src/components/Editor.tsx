import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { useMemo } from 'react';
import { CloseIcon } from './FileTreeAssetIcons';
import { getActiveEditorTab, getRelativePath, useWorkspaceStore } from '../store/store';

type EditorProps = {
  projectId: string;
};

function getLanguageFromPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'js':
      return 'javascript';
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
    monaco.editor.defineTheme('jetbrains-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1f2329',
        'editorLineNumber.foreground': '#9aa4b2',
        'editorLineNumber.activeForeground': '#5f6b7a',
        'editorCursor.foreground': '#1f78d1',
        'editor.selectionBackground': '#cfe8ff',
        'editor.inactiveSelectionBackground': '#e6f2ff',
        'editorIndentGuide.background1': '#edf1f5',
        'editorIndentGuide.activeBackground1': '#cad3dd',
      },
    });

    monaco.editor.setTheme('jetbrains-light');
  };

  if (!activeTab) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="max-w-sm text-center">
          <p className="text-lg font-medium text-[#1f2329]">Select a file to start editing</p>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Open any file from the project tree to load it into the central editor pane.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="border-b border-[#d4dae3] bg-[#f8fafc]">
        <div className="flex min-w-0 overflow-x-auto px-2 pt-2">
          {openTabs.map((tab) => {
            const isActive = tab.path === activeTab.path;

            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => setActiveFile(projectId, tab.path)}
                className={[
                  'group mr-1 flex h-9 min-w-0 max-w-[220px] items-center gap-2 border border-b-0 px-3 text-left text-[12px] transition',
                  isActive
                    ? 'border-[#d4dae3] bg-white text-[#1f2329]'
                    : 'border-transparent bg-[#eef2f7] text-[#5d6674] hover:bg-[#f3f6fa]',
                ].join(' ')}
              >
                <span className="truncate">{tab.name}</span>
                {tab.isDirty ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4d9df7]" /> : null}
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
                  className="flex h-4 w-4 shrink-0 items-center justify-center opacity-45 transition hover:opacity-100"
                >
                  <CloseIcon className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex h-8 items-center justify-between border-t border-[#edf1f5] px-3">
          <div className="truncate text-[11px] text-[#7b8594]">
            {getRelativePath(project?.rootPath ?? '', activeTab.path)}
          </div>
          <div className="border border-[#d2d8e1] bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#6b7280]">
            {getLanguageFromPath(activeTab.path)}
          </div>
        </div>
      </div>

      <MonacoEditor
        path={activeTab.path}
        theme="jetbrains-light"
        language={getLanguageFromPath(activeTab.path)}
        value={activeTab.content}
        onMount={handleMount}
        onChange={(value) => {
          updateFileContent(projectId, activeTab.path, value ?? '');
        }}
        options={{
          automaticLayout: true,
          fontFamily: 'JetBrains Mono, SF Mono, Menlo, monospace',
          fontSize: 13,
          minimap: { enabled: false },
          smoothScrolling: false,
          roundedSelection: true,
          cursorBlinking: 'blink',
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
