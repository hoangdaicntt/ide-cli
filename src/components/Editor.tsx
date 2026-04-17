import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { useMemo } from 'react';
import { getActiveEditorTab, useWorkspaceStore } from '../store/store';

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
  const activeTab = useMemo(() => getActiveEditorTab(project ?? null), [project]);

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
      <div className="flex h-9 items-center justify-between border-b border-[#d4dae3] bg-[#f7f9fc] px-3">
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium text-[#1f2329]">{activeTab.name}</div>
          <div className="truncate text-[11px] text-[#7b8594]">{activeTab.path}</div>
        </div>
        <div className="border border-[#d2d8e1] bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#6b7280]">
          {getLanguageFromPath(activeTab.path)}
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
