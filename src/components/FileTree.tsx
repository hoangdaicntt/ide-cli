import { MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DirectoryNode, FileNode } from '../shared/ipc';
import { useWorkspaceStore } from '../store/store';
import { ArrowExpandIcon, TreeAssetIcon } from './FileTreeAssetIcons';

type FileTreeProps = {
  projectId: string;
  nodes: DirectoryNode[];
  activeFilePath: string | null;
};

type TreeNodeProps = {
  projectId: string;
  node: DirectoryNode | FileNode;
  depth: number;
  activeFilePath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
};

function sortTreeNodes(nodes: Array<DirectoryNode | FileNode>): Array<DirectoryNode | FileNode> {
  return [...nodes].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'directory' ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

function TreeNode({
  projectId,
  node,
  depth,
  activeFilePath,
  expanded,
  onToggle,
}: TreeNodeProps) {
  const openFile = useWorkspaceStore((state) => state.openFile);
  const isDirectory = node.type === 'directory';
  const isExpanded = isDirectory ? expanded.has(node.path) : false;
  const isActive = node.type === 'file' && node.path === activeFilePath;

  if (node.type === 'file') {
    return (
      <button
        type="button"
        onClick={() => {
          void openFile(projectId, node);
        }}
        className={[
          'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] leading-5 transition',
          isActive ? 'bg-[var(--shell-selected)] text-black' : 'text-[var(--shell-text)] hover:bg-[var(--shell-hover)]',
        ].join(' ')}
        style={{ paddingLeft: 10 + depth * 16 }}
      >
        <span className="w-4 shrink-0" />
        <TreeAssetIcon fileName={node.name} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        className={[
          'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] transition hover:bg-[var(--shell-hover)]',
          depth === 0 ? 'font-semibold text-[var(--shell-text)]' : 'font-medium text-[var(--shell-text)]',
        ].join(' ')}
        style={{ paddingLeft: 10 + depth * 16 }}
      >
        <ArrowExpandIcon expanded={isExpanded} className="h-3 w-3 shrink-0 opacity-70" />
        <TreeAssetIcon isFolder />
        <span className="truncate">{node.name}</span>
      </button>

      {isExpanded ? (
        <div className="space-y-0.5">
          {sortTreeNodes(node.children).map((child) => (
            <TreeNode
              key={child.path}
              projectId={projectId}
              node={child}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FileTree({ projectId, nodes, activeFilePath }: FileTreeProps) {
  const sortedNodes = useMemo(() => sortTreeNodes(nodes), [nodes]);
  const defaultExpanded = useMemo(
    () => new Set(sortedNodes.filter((node) => node.type === 'directory').map((node) => node.path)),
    [sortedNodes],
  );
  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded);

  const toggle = (targetPath: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(targetPath)) {
        next.delete(targetPath);
      } else {
        next.add(targetPath);
      }

      return next;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--panel-muted-bg)]">
      <div className="app-drag-region flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">
        <span>Tập tin (Explorer)</span>
        <button
          type="button"
          aria-label="Explorer options"
          className="app-no-drag flex h-6 w-6 items-center justify-center rounded text-[var(--shell-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
        >
          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-4 text-[13px] custom-scrollbar">
        {sortedNodes.map((node) => (
          <TreeNode
            key={node.path}
            projectId={projectId}
            node={node}
            depth={0}
            activeFilePath={activeFilePath}
            expanded={expanded}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}
