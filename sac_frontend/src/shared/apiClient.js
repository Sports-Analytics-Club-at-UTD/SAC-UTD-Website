/**
 * Shared API client. This file is infrastructure both branches need —
 * the co-director's signup/login/member pages and this Director Portal
 * both authenticate against the same Django backend the same way — so
 * it lives in src/shared/, not src/portal/. Add new endpoint helpers to
 * the `api` object below as new pages need them; don't duplicate a
 * second fetch wrapper elsewhere.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const TOKEN_STORAGE_KEY = "sac_auth_token";

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function apiFetch(path, { method = "GET", body, params } = {}) {
  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (query) url += `?${query}`;
  }

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data;
}

export class ApiError extends Error {
  constructor(status, data) {
    super(typeof data === "string" ? data : data?.detail || "Request failed");
    this.status = status;
    this.data = data;
  }
}

// Auth endpoints are shared (signup/login/whoami all live in accounts/
// on the backend, used by both the co-director's pages and this
// portal). Director Portal-specific endpoints live in
// src/portal/apiClient.js instead, to keep this file from growing into
// a dumping ground neither side fully owns.
export const api = {
  signup: (payload) => apiFetch("/api/auth/signup/", { method: "POST", body: payload }),
  login: (username, password) =>
    apiFetch("/api/auth/login/", { method: "POST", body: { username, password } }),
  whoami: () => apiFetch("/api/auth/whoami/"),
  me: () => apiFetch("/api/auth/me/"),
  updateMe: (payload) => apiFetch("/api/auth/me/", { method: "PATCH", body: payload }),
};

/**
 * DRF's PageNumberPagination wraps list responses as
 * {count, next, previous, results}. Custom @action endpoints that build
 * their own Response bypass pagination and return a bare array. This
 * mirrors core/test_utils.py's as_list() helper on the Django side.
 */
export function asList(data) {
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return data.results;
  }
  return Array.isArray(data) ? data : [];
}
