import { useEffect, useMemo, useRef, useState } from 'react';
import { EyeOff, LoaderCircle, MessageSquareText, MoreHorizontal, Plus, SquarePen, Trash2 } from 'lucide-react';
import { useCodexStore } from '../store/codexStore';
import { useWorkspaceStore } from '../store/store';

type WorkspaceSidebarProps = {
  projectId: string;
};

function getTaskLabel(task: { name?: string | null; title?: string | null; preview?: string }): string {
  return task.title || task.name || task.preview || 'Untitled chat';
}

function formatTaskTimestamp(timestamp?: number): string {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (diffMinutes < 60) {
    if (diffMinutes <= 1) {
      return 'just now';
    }

    return `${diffMinutes}m ago`;
  }

  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  if (isSameDay) {
    return timeLabel;
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
  }).format(date);

  return `${timeLabel} ${dateLabel}`;
}

export function WorkspaceSidebar({ projectId: _projectId }: WorkspaceSidebarProps) {
  const projectIds = useWorkspaceStore((state) => state.projectIds);
  const projects = useWorkspaceStore((state) => state.projects);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const openProject = useWorkspaceStore((state) => state.openProject);
  const closeProject = useWorkspaceStore((state) => state.closeProject);
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject);
  const isOpeningProject = useWorkspaceStore((state) => state.isOpeningProject);
  const projectStates = useCodexStore((state) => state.projectStates);
  const selectThread = useCodexStore((state) => state.selectThread);
  const newChat = useCodexStore((state) => state.newChat);
  const loadProjectThreads = useCodexStore((state) => state.loadProjectThreads);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [hiddenProjectIds, setHiddenProjectIds] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibleProjectIds = useMemo(
    () => projectIds.filter((id) => !hiddenProjectIds.includes(id)),
    [hiddenProjectIds, projectIds],
  );

  useEffect(() => {
    for (const id of projectIds) {
      const workspace = projects[id];

      if (!workspace) {
        continue;
      }

      void loadProjectThreads({ projectId: id, rootPath: workspace.rootPath });
    }
  }, [loadProjectThreads, projectIds, projects]);

  useEffect(() => {
    setHiddenProjectIds((current) => current.filter((id) => projectIds.includes(id)));
  }, [projectIds]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuProjectId(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const handleHideProject = (id: string) => {
    setHiddenProjectIds((current) => (current.includes(id) ? current : [...current, id]));
    setMenuProjectId(null);

    if (id !== activeProjectId) {
      return;
    }

    const nextVisibleProjectId = projectIds.find((candidateId) => candidateId !== id && !hiddenProjectIds.includes(candidateId));

    if (nextVisibleProjectId) {
      setActiveProject(nextVisibleProjectId);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--panel-muted-bg)] text-[var(--shell-text)]">
      <div className="app-drag-region flex h-[var(--panel-header-height)] items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">
        <span>Workspace</span>
        <button
          type="button"
          onClick={() => {
            void openProject();
          }}
          aria-label="Open workspace"
          className="app-no-drag flex h-6 w-6 items-center justify-center rounded text-[var(--shell-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.1} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        <div className="py-2">
          {visibleProjectIds.map((id) => {
            const project = projects[id];
            const activeThreadId = projectStates[id]?.threadId ?? null;
            const runningThreadId = projectStates[id]?.runningThreadId ?? null;
            const orderedThreads = projectStates[id]?.threadSummaries ?? [];
            const isLoadingHistory = projectStates[id]?.isLoadingHistory ?? false;

            if (!project) {
              return null;
            }

            return (
              <section key={id}>
                <div
                  ref={menuProjectId === id ? menuRef : null}
                  className="relative flex items-center gap-2 border-y border-[var(--shell-border)] bg-[#e7e7e7] px-3 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => setActiveProject(id)}
                    className="min-w-0 flex-1 truncate text-left text-[13px] font-bold text-[var(--shell-text)]"
                    title={project.name}
                  >
                    {project.name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuProjectId((current) => (current === id ? null : id))}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--shell-muted)] transition hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
                    aria-label={`Workspace actions for ${project.name}`}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>

                  {menuProjectId === id ? (
                    <div className="absolute right-0 top-7 z-20 min-w-[148px] overflow-hidden rounded-lg border border-[var(--shell-border)] bg-white shadow-[var(--shell-shadow)]">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProject(id);
                          newChat(id);
                          setMenuProjectId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[var(--shell-text)] transition hover:bg-[var(--shell-hover)]"
                      >
                        <SquarePen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        <span>New chat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuProjectId(null);
                          void closeProject(id);
                        }}
                        className="flex w-full items-center gap-2 border-t border-[var(--shell-border)] px-3 py-2 text-left text-[12px] text-[#b42318] transition hover:bg-[#fff5f5]"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        <span>Remove</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHideProject(id)}
                        className="flex w-full items-center gap-2 border-t border-[var(--shell-border)] px-3 py-2 text-left text-[12px] text-[var(--shell-text)] transition hover:bg-[var(--shell-hover)]"
                      >
                        <EyeOff className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        <span>Hide</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                <div>
                  {orderedThreads.map((thread) => {
                    const isActiveThread = id === activeProjectId && thread.id === activeThreadId;
                    const isProcessing = thread.id === runningThreadId;
                    const timestampLabel = formatTaskTimestamp(thread.updatedAt ?? thread.createdAt);

                    return (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          setActiveProject(id);
                          void selectThread({ projectId: id, threadId: thread.id });
                        }}
                        className={[
                          'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] font-medium transition',
                          isActiveThread
                            ? 'bg-[var(--shell-selected)] text-[var(--shell-text)]'
                            : 'text-[var(--shell-text)] hover:bg-[var(--shell-hover)]',
                        ].join(' ')}
                        title={getTaskLabel(thread)}
                      >
                        <MessageSquareText
                          className={[
                            'h-3.5 w-3.5 shrink-0',
                            isActiveThread ? 'text-[var(--shell-accent)]' : 'text-[var(--shell-muted)]',
                          ].join(' ')}
                          strokeWidth={2}
                        />
                        <span className="min-w-0 flex-1 truncate">{getTaskLabel(thread)}</span>
                        {timestampLabel ? (
                          <span className="shrink-0 text-[11px] font-normal text-[var(--shell-subtle)]">
                            {timestampLabel}
                          </span>
                        ) : null}
                        {isProcessing ? (
                          <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--shell-accent)]" strokeWidth={2} />
                        ) : null}
                      </button>
                    );
                  })}

                  {isLoadingHistory && orderedThreads.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[var(--shell-muted)]">
                      <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" strokeWidth={2} />
                      <span>Loading tasks...</span>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}

          {visibleProjectIds.length === 0 ? (
            <div className="px-3 py-8 text-[13px] text-[var(--shell-muted)]">
              {projectIds.length > 0 ? 'All workspaces are hidden.' : isOpeningProject ? 'Opening workspace...' : 'No workspace open.'}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
