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
          'flex w-full items-center gap-2 px-2 py-1.5 text-left text-[13px] leading-5 transition',
          isActive ? 'bg-[#dbeafe] text-[#12447f]' : 'text-[#3b4350] hover:bg-[#edf2f8] hover:text-[#1f2329]',
        ].join(' ')}
        style={{ paddingLeft: 10 + depth * 16 }}
      >
        <TreeAssetIcon fileName={node.name} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[13px] font-medium text-[#38404d] transition hover:bg-[#edf2f8] hover:text-[#1f2329]"
        style={{ paddingLeft: 10 + depth * 16 }}
      >
        <ArrowExpandIcon expanded={isExpanded} className="h-3 w-3 shrink-0 opacity-70" />
        <TreeAssetIcon isFolder />
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
    <div className="h-full overflow-auto bg-[#f5f7fa] px-2 py-2">
      <div className="mb-2 border-b border-[#d8dde6] px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6c7686]">
        Files
      </div>
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
