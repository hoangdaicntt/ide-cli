import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, MessageSquare, MoreHorizontal, Plus, X } from 'lucide-react';
import { useCodexStore } from '../store/codexStore';
import { useWorkspaceStore } from '../store/store';

type WorkspaceSidebarProps = {
  projectId: string;
};

function getTaskLabel(task: { name?: string | null; title?: string | null; preview?: string }): string {
  return task.title || task.name || task.preview || 'Untitled chat';
}

export function WorkspaceSidebar({ projectId }: WorkspaceSidebarProps) {
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set(projectIds));
  const [menuThreadId, setMenuThreadId] = useState<string | null>(null);

  const toggleProject = (id: string) => {
    setExpandedProjects((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  useEffect(() => {
    for (const id of projectIds) {
      const workspace = projects[id];

      if (!workspace) {
        continue;
      }

      void loadProjectThreads({ projectId: id, rootPath: workspace.rootPath });
    }
  }, [loadProjectThreads, projectIds, projects]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--panel-muted-bg)] text-[var(--shell-text)]">
      <div className="app-drag-region flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--shell-muted)]">
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
        <div className="space-y-1 px-1 pb-3">
          {projectIds.map((id) => {
            const project = projects[id];
            const isActiveProject = id === activeProjectId;
            const isExpanded = expandedProjects.has(id);
            const activeThreadId = projectStates[id]?.threadId ?? null;
            const orderedThreads = projectStates[id]?.threadSummaries ?? [];
            const isLoadingHistory = projectStates[id]?.isLoadingHistory ?? false;

            if (!project) {
              return null;
            }

            return (
              <div key={id} className="space-y-0.5">
                <div
                  className={[
                    'group flex items-center gap-1 rounded-md px-2 py-1 text-[13px] transition',
                    isActiveProject ? 'bg-[var(--shell-selected)] text-[var(--shell-text)]' : 'hover:bg-[var(--shell-hover)]',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => toggleProject(id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--shell-muted)]"
                    aria-label={isExpanded ? 'Collapse workspace' : 'Expand workspace'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                  </button>

                  <Folder className="h-4 w-4 shrink-0 text-[#c9a468]" strokeWidth={1.9} />

                  <button
                    type="button"
                    onClick={() => setActiveProject(id)}
                    className="min-w-0 flex-1 truncate text-left text-[13px]"
                  >
                    {project.name}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void closeProject(id);
                    }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--shell-muted)] opacity-0 transition hover:bg-white hover:text-[var(--shell-text)] group-hover:opacity-100"
                    aria-label={`Close ${project.name}`}
                  >
                    <X className="h-3 w-3" strokeWidth={2.2} />
                  </button>
                </div>

                {isExpanded ? (
                  <div className="space-y-0.5 pl-5">
                    {orderedThreads.map((thread) => {
                      const isActiveThread = isActiveProject && thread.id === activeThreadId;
                      const isProcessing =
                        isActiveProject &&
                        thread.id === activeThreadId &&
                        Boolean(projectStates[id]?.activeTurnId || projectStates[id]?.isSending);

                      return (
                        <div
                          key={thread.id}
                          className={[
                            'group relative flex items-center gap-2 rounded-md px-2 py-1 text-[13px] transition',
                            isActiveThread
                              ? 'bg-[var(--shell-selected)] text-[var(--shell-text)]'
                              : 'text-[var(--shell-text)] hover:bg-[var(--shell-hover)]',
                          ].join(' ')}
                          title={getTaskLabel(thread)}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveProject(id);
                              void selectThread({ projectId: id, threadId: thread.id });
                            }}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <MessageSquare
                              className={[
                                'h-3.5 w-3.5 shrink-0',
                                isActiveThread ? 'text-[var(--shell-accent)]' : 'text-[var(--shell-muted)]',
                              ].join(' ')}
                              strokeWidth={2}
                            />
                            <span className="truncate">{getTaskLabel(thread)}</span>
                            {isProcessing ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--shell-accent)]" /> : null}
                          </button>

                          <button
                            type="button"
                            onClick={() => setMenuThreadId((current) => (current === thread.id ? null : thread.id))}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--shell-muted)] opacity-0 transition hover:bg-white hover:text-[var(--shell-text)] group-hover:opacity-100"
                            aria-label="Task actions"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>

                          {menuThreadId === thread.id ? (
                            <div className="absolute right-2 top-8 z-10 w-32 overflow-hidden rounded-lg border border-[var(--shell-border)] bg-white shadow-[var(--shell-shadow)]">
                              <button
                                type="button"
                                disabled
                                className="block w-full px-3 py-2 text-left text-[12px] text-[#9aa3af] disabled:cursor-not-allowed"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                disabled
                                className="block w-full border-t border-[#f0f0f0] px-3 py-2 text-left text-[12px] text-[#9aa3af] disabled:cursor-not-allowed"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveProject(id);
                        newChat(id);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] text-[var(--shell-accent)] transition hover:bg-[var(--shell-hover)]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                      <span>{isLoadingHistory ? 'Loading tasks...' : 'New task'}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}

          {projectIds.length === 0 ? (
            <div className="px-3 py-8 text-[13px] text-[var(--shell-muted)]">
              {isOpeningProject ? 'Opening workspace...' : 'No workspace open.'}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
