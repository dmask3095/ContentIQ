import { useEffect, useState } from 'react';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { useSettings, useUpdateSettings } from '../../hooks/useSettings';
import type { UserSettings } from '../../types';
import { APIKeyForm } from './APIKeyForm';
import { NotificationSettings } from './NotificationSettings';
import { PublishingSchedule } from './PublishingSchedule';
import { ResearchSettings } from './ResearchSettings';

export function SettingsTab() {
  const { settings, loading, error } = useSettings();
  const { update, saving } = useUpdateSettings();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const patch = (p: Partial<UserSettings>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const handleSave = async () => {
    if (!draft) return;
    if (!window.confirm('Save these settings?')) return;
    try {
      await update({
        research_sweep_time: draft.researchSweepTime,
        research_sweep_enabled: draft.researchSweepEnabled,
        data_sources_enabled: draft.dataSourcesEnabled,
        content_categories: draft.contentCategories,
        relevance_threshold: draft.relevanceThreshold,
        email_digest_enabled: draft.emailDigestEnabled,
        email_digest_frequency: draft.emailDigestFrequency,
        slack_enabled: draft.slackEnabled,
        slack_webhook_url: draft.slackWebhookUrl ?? '',
        slack_channel: draft.slackChannel ?? '',
        timezone: draft.timezone,
        content_mix_goal: draft.contentMixGoal,
      });
      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  if (loading || !draft) return <LoadingSpinner label="Loading settings…" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <ResearchSettings
        sweepTime={draft.researchSweepTime}
        sweepEnabled={draft.researchSweepEnabled}
        dataSourcesEnabled={draft.dataSourcesEnabled}
        contentCategories={draft.contentCategories}
        relevanceThreshold={draft.relevanceThreshold}
        onChange={(p) =>
          patch({
            ...(p.sweepTime !== undefined ? { researchSweepTime: p.sweepTime } : {}),
            ...(p.sweepEnabled !== undefined ? { researchSweepEnabled: p.sweepEnabled } : {}),
            ...(p.dataSourcesEnabled !== undefined ? { dataSourcesEnabled: p.dataSourcesEnabled } : {}),
            ...(p.contentCategories !== undefined ? { contentCategories: p.contentCategories as UserSettings['contentCategories'] } : {}),
            ...(p.relevanceThreshold !== undefined ? { relevanceThreshold: p.relevanceThreshold } : {}),
          })
        }
      />

      <NotificationSettings
        emailDigestEnabled={draft.emailDigestEnabled}
        emailDigestFrequency={draft.emailDigestFrequency}
        slackEnabled={draft.slackEnabled}
        slackWebhookUrl={draft.slackWebhookUrl ?? ''}
        slackChannel={draft.slackChannel ?? ''}
        onChange={(p) => patch(p)}
      />

      <APIKeyForm />

      <PublishingSchedule
        timezone={draft.timezone}
        contentMixGoal={draft.contentMixGoal}
        onChange={(p) => patch(p)}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
