import { useMemo, useState } from 'react';
import type { DirectoryNode, FileNode } from '../shared/ipc';
import { useWorkspaceStore } from '../store/store';

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
          'flex w-full items-center rounded-xl px-3 py-2 text-left text-[13px] transition',
          isActive ? 'bg-sky-500/16 text-sky-100' : 'text-white/60 hover:bg-white/[0.04] hover:text-white/95',
        ].join(' ')}
        style={{ paddingLeft: 12 + depth * 14 }}
      >
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-white/78 transition hover:bg-white/[0.04] hover:text-white"
        style={{ paddingLeft: 12 + depth * 14 }}
      >
        <span className="text-[11px] text-white/40">{isExpanded ? '▾' : '▸'}</span>
        <span className="truncate font-medium">{node.name}</span>
      </button>

      {isExpanded && (
        <div className="space-y-1">
          {node.children.map((child) => (
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
      )}
    </div>
  );
}

export function FileTree({ projectId, nodes, activeFilePath }: FileTreeProps) {
  const defaultExpanded = useMemo(() => new Set(nodes.map((node) => node.path)), [nodes]);
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
    <div className="h-full overflow-auto px-3 py-4">
      <div className="mb-4 px-3 text-[11px] font-medium uppercase tracking-[0.24em] text-white/28">Explorer</div>
      <div className="space-y-1">
        {nodes.map((node) => (
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
