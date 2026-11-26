const rawBase =
  import.meta.env.VITE_API_BASE_URL || 'https://sac-utd-website.onrender.com';

export const BASE_URL = rawBase.replace(/\/+$/, '');
export const API_BASE_URL = `${BASE_URL}/api`;
