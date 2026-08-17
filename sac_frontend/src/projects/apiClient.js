import { apiFetch } from "../shared/apiClient";

export { asList } from "../shared/apiClient";

/**
 * Unlike the Director Portal, Projects Portal has no role gating on the
 * frontend at all — any authenticated approved member can view boards.
 * The backend still restricts project creation/editing to directors
 * (see projects.views.IsProjectManagerOrReadOnly), and this client
 * exposes that endpoint anyway; the UI just doesn't build a
 * create-project form yet since only directors would ever see it
 * succeed. Task CRUD (used by handleMove below) is open to any
 * authenticated member on the backend, matching this client.
 */
export const projectsApi = {
  listProjects: (search) => apiFetch("/api/projects/", { params: { search } }),
  getProject: (id) => apiFetch(`/api/projects/${id}/`),
  createProject: (payload) => apiFetch("/api/projects/", { method: "POST", body: payload }),
  listTasks: (projectId) => apiFetch("/api/projects/tasks/", { params: { project: projectId } }),
  createTask: (payload) => apiFetch("/api/projects/tasks/", { method: "POST", body: payload }),
  updateTask: (id, payload) => apiFetch(`/api/projects/tasks/${id}/`, { method: "PATCH", body: payload }),
};