import { create } from 'zustand';
import type { DirectoryNode, FileNode, TerminalExitPayload, TerminalMeta } from '../shared/ipc';

type EditorTab = {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
};

export type ProjectWorkspace = {
  id: string;
  name: string;
  rootPath: string;
  tree: DirectoryNode[];
  openFiles: Record<string, EditorTab>;
  activeFilePath: string | null;
  terminal: TerminalMeta | null;
  terminalStatus: 'idle' | 'running' | 'exited';
};

type WorkspaceStore = {
  projectIds: string[];
  projects: Record<string, ProjectWorkspace>;
  activeProjectId: string | null;
  isOpeningProject: boolean;
  openProject: () => Promise<void>;
  setActiveProject: (projectId: string) => void;
  openFile: (projectId: string, file: FileNode) => Promise<void>;
  updateFileContent: (projectId: string, filePath: string, content: string) => void;
  ensureTerminal: (projectId: string) => Promise<TerminalMeta | null>;
  handleTerminalExit: (payload: TerminalExitPayload) => void;
};

const terminalRequests = new Map<string, Promise<TerminalMeta>>();

function getNameFromPath(filePath: string): string {
  const segments = filePath.split('/');
  return segments[segments.length - 1] ?? filePath;
}

function getProjectId(rootPath: string): string {
  return rootPath;
}

function getProjectName(rootPath: string): string {
  const segments = rootPath.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? rootPath;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  projectIds: [],
  projects: {},
  activeProjectId: null,
  isOpeningProject: false,

  openProject: async () => {
    if (get().isOpeningProject) {
      return;
    }

    set({ isOpeningProject: true });

    try {
      const selectedPath = await window.electronAPI.openProjectDirectory();

      if (!selectedPath) {
        return;
      }

      const projectId = getProjectId(selectedPath);
      const existingProject = get().projects[projectId];

      if (existingProject) {
        set({ activeProjectId: projectId });
        return;
      }

      const tree = await window.electronAPI.readDirectory(selectedPath);

      set((state) => ({
        projectIds: [...state.projectIds, projectId],
        activeProjectId: projectId,
        projects: {
          ...state.projects,
          [projectId]: {
            id: projectId,
            name: getProjectName(selectedPath),
            rootPath: selectedPath,
            tree,
            openFiles: {},
            activeFilePath: null,
            terminal: null,
            terminalStatus: 'idle',
          },
        },
      }));
    } finally {
      set({ isOpeningProject: false });
    }
  },

  setActiveProject: (projectId: string) => {
    set({ activeProjectId: projectId });
  },

  openFile: async (projectId: string, file: FileNode) => {
    const existing = get().projects[projectId]?.openFiles[file.path];

    if (existing) {
      set((state) => ({
        projects: {
          ...state.projects,
          [projectId]: {
            ...state.projects[projectId],
            activeFilePath: file.path,
          },
        },
      }));
      return;
    }

    const content = await window.electronAPI.readFile(file.path);

    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          activeFilePath: file.path,
          openFiles: {
            ...state.projects[projectId].openFiles,
            [file.path]: {
              path: file.path,
              name: file.name,
              content,
              isDirty: false,
            },
          },
        },
      },
    }));
  },

  updateFileContent: (projectId: string, filePath: string, content: string) => {
    set((state) => {
      const project = state.projects[projectId];
      const current = project?.openFiles[filePath];

      if (!project || !current) {
        return state;
      }

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            openFiles: {
              ...project.openFiles,
              [filePath]: {
                ...current,
                content,
                isDirty: true,
              },
            },
          },
        },
      };
    });
  },

  ensureTerminal: async (projectId: string) => {
    const project = get().projects[projectId];

    if (!project) {
      return null;
    }

    if (project.terminal) {
      return project.terminal;
    }

    const pendingRequest = terminalRequests.get(projectId);

    if (pendingRequest) {
      return pendingRequest;
    }

    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          terminalStatus: 'running',
        },
      },
    }));

    const request = window.electronAPI
      .createTerminal({
        projectId,
        cwd: project.rootPath,
      })
      .then((terminal) => {
        set((state) => ({
          projects: {
            ...state.projects,
            [projectId]: {
              ...state.projects[projectId],
              terminal,
              terminalStatus: 'running',
            },
          },
        }));

        return terminal;
      })
      .finally(() => {
        terminalRequests.delete(projectId);
      });

    terminalRequests.set(projectId, request);

    return request;
  },

  handleTerminalExit: (payload: TerminalExitPayload) => {
    terminalRequests.delete(payload.projectId);

    set((state) => {
      const project = state.projects[payload.projectId];

      if (!project) {
        return state;
      }

      return {
        projects: {
          ...state.projects,
          [payload.projectId]: {
            ...project,
            terminalStatus: 'exited',
            terminal:
              project.terminal?.terminalId === payload.terminalId ? null : project.terminal,
          },
        },
      };
    });
  },
}));

export function getActiveProject(state: WorkspaceStore): ProjectWorkspace | null {
  return state.activeProjectId ? state.projects[state.activeProjectId] ?? null : null;
}

export function getActiveEditorTab(project: ProjectWorkspace | null): EditorTab | null {
  if (!project?.activeFilePath) {
    return null;
  }

  return project.openFiles[project.activeFilePath] ?? null;
}

export function flattenFiles(nodes: Array<DirectoryNode | FileNode>): FileNode[] {
  const files: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      files.push(node);
      continue;
    }

    files.push(...flattenFiles(node.children));
  }

  return files;
}

export function getDisplayNameFromPath(filePath: string): string {
  return getNameFromPath(filePath);
}
