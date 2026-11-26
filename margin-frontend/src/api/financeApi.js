import { BASE_URL } from '../config';

export function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export function extractErrorMessage(err, fallback = 'Request failed.') {
  if (!err) return fallback;
  const data = err.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail;
    const parts = [];
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) {
        parts.push(`${key}: ${val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')}`);
      } else if (typeof val === 'string') {
        parts.push(`${key}: ${val}`);
      } else if (val && typeof val === 'object') {
        parts.push(`${key}: ${JSON.stringify(val)}`);
      }
    }
    if (parts.length > 0) return parts.join(' | ');
  }
  return err.message || fallback;
}

async function apiRequest(path, { method = 'GET', body, auth = true, isFormData = false } = {}) {
  const headers = {};
  if (auth) {
    const token = localStorage.getItem('sac_auth_token');
    if (token) {
      headers.Authorization = `Token ${token}`;
    }
  }
  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const financeApi = {
  getWhoAmI: () => apiRequest('/api/auth/whoami/'),
  getEvents: () => apiRequest('/api/events/'),
  getUtdQuota: () => apiRequest('/api/finance/utd-quota/'),

  listFundingRequests: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        qs.set(k, String(v));
      }
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/finance/funding-requests/${suffix}`);
  },
  getFundingRequest: (id) => apiRequest(`/api/finance/funding-requests/${id}/`),
  createFundingRequest: (payload) =>
    apiRequest('/api/finance/funding-requests/', { method: 'POST', body: payload }),
  approveFundingRequest: (id, fundingSource) =>
    apiRequest(`/api/finance/funding-requests/${id}/approve/`, {
      method: 'POST',
      body: { funding_source: fundingSource },
    }),
  modifyFundingRequest: (id, payload) =>
    apiRequest(`/api/finance/funding-requests/${id}/modify/`, {
      method: 'POST',
      body: payload,
    }),
  getConfirmFundingRequest: (id, token = '') =>
    apiRequest(
      `/api/finance/funding-requests/${id}/confirm/?token=${encodeURIComponent(token)}`,
      { auth: Boolean(localStorage.getItem('sac_auth_token')) }
    ),
  confirmFundingRequest: (id, token = '') =>
    apiRequest(`/api/finance/funding-requests/${id}/confirm/`, {
      method: 'POST',
      body: token ? { token } : {},
      auth: Boolean(localStorage.getItem('sac_auth_token')),
    }),
  denyFundingRequest: (id, denialReason) =>
    apiRequest(`/api/finance/funding-requests/${id}/deny/`, {
      method: 'POST',
      body: { denial_reason: denialReason },
    }),
  updateUtdForm: (id, completed) =>
    apiRequest(`/api/finance/funding-requests/${id}/utd-form/`, {
      method: 'PATCH',
      body: { utd_form_completed: completed },
    }),
  downloadUtdBudgetXlsx: async (id, filenameHint = '') => {
    const token = localStorage.getItem('sac_auth_token');
    const res = await fetch(`${BASE_URL}/api/finance/funding-requests/${id}/utd-budget-xlsx/`, {
      headers: token ? { Authorization: `Token ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Failed to download UTD Budget XLSX (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UTD-Programming-Funds-${filenameHint || `request-${id}`}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Phase 4 endpoints
  lookupApprovalId: (approvalId) =>
    apiRequest(
      `/api/finance/approval-lookup/?approval_id=${encodeURIComponent(approvalId || '')}`
    ),
  listRefundRequests: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        qs.set(k, String(v));
      }
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/finance/refund-requests/${suffix}`);
  },
  createRefundRequest: (formData) =>
    apiRequest('/api/finance/refund-requests/', {
      method: 'POST',
      body: formData,
      isFormData: true,
    }),
  getReceiptUrl: (id) => apiRequest(`/api/finance/refund-requests/${id}/receipt-url/`),
  updateRefundStatus: (id, payload) =>
    apiRequest(`/api/finance/refund-requests/${id}/status/`, {
      method: 'PATCH',
      body: payload,
    }),
  getAnalytics: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        qs.set(k, String(v));
      }
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest(`/api/finance/analytics/${suffix}`);
  },
  getAnalyticsCsvUrl: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        qs.set(k, String(v));
      }
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return `${BASE_URL}/api/finance/analytics/export.csv${suffix}`;
  },
};
