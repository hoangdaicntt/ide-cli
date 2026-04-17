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
    monaco.editor.defineTheme('ide-noctis', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0f141b',
        'editor.foreground': '#d8e1ec',
        'editorLineNumber.foreground': '#4f5c6d',
        'editorLineNumber.activeForeground': '#7f93ad',
        'editorCursor.foreground': '#8bd3ff',
        'editor.selectionBackground': '#264f784d',
        'editor.inactiveSelectionBackground': '#2232457a',
      },
    });

    monaco.editor.setTheme('ide-noctis');
  };

  if (!activeTab) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f141b]">
        <div className="max-w-sm text-center">
          <p className="text-lg font-medium text-white/92">Select a file to start editing</p>
          <p className="mt-2 text-sm leading-6 text-white/42">
            The editor stays scoped to the active project workspace and preserves its open buffers when you switch tabs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0f141b]">
      <div className="flex h-12 items-center justify-between border-b border-white/6 bg-white/[0.02] px-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white/92">{activeTab.name}</div>
          <div className="truncate text-xs text-white/35">{activeTab.path}</div>
        </div>
        <div className="rounded-full border border-white/8 bg-white/[0.05] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/42">
          {getLanguageFromPath(activeTab.path)}
        </div>
      </div>

      <MonacoEditor
        path={activeTab.path}
        theme="ide-noctis"
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
          smoothScrolling: true,
          roundedSelection: true,
          cursorBlinking: 'smooth',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 18, bottom: 18 },
        }}
      />
    </div>
  );
}
