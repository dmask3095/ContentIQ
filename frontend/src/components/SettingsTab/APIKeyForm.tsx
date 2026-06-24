import { useEffect, useState } from 'react';
import { api } from '../../utils/api';

interface KeyStatus {
  gemini: boolean;
  google: boolean;
  smtp: boolean;
  slackWebhook: boolean;
}

const ROWS: { key: keyof KeyStatus; label: string }[] = [
  { key: 'gemini', label: 'Google Gemini API key (ideation & captions)' },
  { key: 'google', label: 'Google Custom Search API key + Engine ID' },
  { key: 'smtp', label: 'SMTP email credentials' },
  { key: 'slackWebhook', label: 'Slack incoming webhook URL' },
];

export function APIKeyForm() {
  const [status, setStatus] = useState<KeyStatus | null>(null);

  useEffect(() => {
    api.get<KeyStatus>('/api/settings/api-keys-status').then((res) => setStatus(res.data));
  }, []);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">API Keys & Auth</h3>
      <p className="text-xs text-slate-500">
        Secrets live in <code className="rounded bg-slate-100 px-1">backend/.env</code> and are never sent to this
        page or stored in the database — edit that file directly and restart the backend to change them.
        Claude/GPT-4 keys are still saved in <code className="rounded bg-slate-100 px-1">.env</code> but dormant
        (no billing) — Gemini's free tier is the active provider for ideation and captions.
      </p>
      <div className="flex flex-col gap-1.5">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{row.label}</span>
            {status === null ? (
              <span className="text-xs text-slate-400">checking…</span>
            ) : status[row.key] ? (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">✓ Configured</span>
            ) : (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">✗ Missing</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
