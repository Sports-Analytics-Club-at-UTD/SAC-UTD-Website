import { apiFetch } from "../shared/apiClient";

export { asList } from "../shared/apiClient";


/**
 * Every endpoint only the Director Portal calls. Kept separate from
 * shared/apiClient.js (auth) so that file stays small and genuinely
 * shared, while everything director-specific lives in one place that's
 * safe to change without touching anything the co-director owns.
 */
export const portalApi = {
  access: () => apiFetch("/api/portal/access/"),
  dashboard: () => apiFetch("/api/portal/dashboard/"),

  pendingMembers: () => apiFetch("/api/auth/pending/"),
  updateMemberRole: (id, payload) =>
    apiFetch(`/api/auth/members/${id}/role/`, { method: "PATCH", body: payload }),

  listEvents: () => apiFetch("/api/events/"),
  createEvent: (payload) => apiFetch("/api/events/", { method: "POST", body: payload }),

  financeSummary: () => apiFetch("/api/finance/entries/summary/"),
  listBudgetEntries: () => apiFetch("/api/finance/entries/"),
  listBudgetCategories: () => apiFetch("/api/finance/categories/"),
  createBudgetEntry: (payload) => apiFetch("/api/finance/entries/", { method: "POST", body: payload }),

  listMedia: () => apiFetch("/api/media/"),
  reviewMedia: (id, payload) => apiFetch(`/api/media/${id}/review/`, { method: "POST", body: payload }),

  listIdeas: () => apiFetch("/api/rnd/ideas/"),
  listRndTodos: () => apiFetch("/api/rnd/todos/"),

  listRequests: () => apiFetch("/api/requests/"),
  resolveRequest: (id, payload) => apiFetch(`/api/requests/${id}/resolve/`, { method: "POST", body: payload }),
};
