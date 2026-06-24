import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  // Without this, a dropped connection (e.g. backend restarting mid-request)
  // leaves the caller awaiting a response that never arrives — a stuck
  // "Generating…" button with no error and no way to recover but reloading.
  // 60s covers Gemini's retry-with-backoff worst case on the ideation route.
  timeout: 60_000,
});
