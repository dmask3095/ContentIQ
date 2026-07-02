import type { DigestFrequency } from '../../types';

interface NotificationSettingsProps {
  emailDigestEnabled: boolean;
  emailDigestFrequency: DigestFrequency;
  slackEnabled: boolean;
  slackWebhookUrl: string;
  slackChannel: string;
  onChange: (patch: Partial<{
    emailDigestEnabled: boolean;
    emailDigestFrequency: DigestFrequency;
    slackEnabled: boolean;
    slackWebhookUrl: string;
    slackChannel: string;
  }>) => void;
}

export function NotificationSettings({
  emailDigestEnabled,
  emailDigestFrequency,
  slackEnabled,
  slackWebhookUrl,
  slackChannel,
  onChange,
}: NotificationSettingsProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">Notification Preferences</h3>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={emailDigestEnabled}
            onChange={(e) => onChange({ emailDigestEnabled: e.target.checked })}
          />
          Email digest
        </label>
        <select
          aria-label="Email digest frequency"
          value={emailDigestFrequency}
          onChange={(e) => onChange({ emailDigestFrequency: e.target.value as DigestFrequency })}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
          disabled={!emailDigestEnabled}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        <input type="checkbox" checked={slackEnabled} onChange={(e) => onChange({ slackEnabled: e.target.checked })} />
        Slack digest
      </label>

      <div className="flex flex-col gap-2">
        <input
          id="slack-webhook-url"
          name="slackWebhookUrl"
          value={slackWebhookUrl}
          onChange={(e) => onChange({ slackWebhookUrl: e.target.value })}
          placeholder="https://hooks.slack.com/services/T.../B.../..."
          disabled={!slackEnabled}
          className="rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
        />
        <input
          id="slack-channel"
          name="slackChannel"
          value={slackChannel}
          onChange={(e) => onChange({ slackChannel: e.target.value })}
          placeholder="#content-iq-digest"
          disabled={!slackEnabled}
          className="rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
        />
      </div>
    </section>
  );
}
