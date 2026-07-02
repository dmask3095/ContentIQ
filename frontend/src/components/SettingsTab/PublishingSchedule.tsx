const TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'UTC',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Tokyo',
];

interface ContentMixGoal {
  reels: number;
  carousels: number;
  stories: number;
}

interface PublishingScheduleProps {
  timezone: string;
  contentMixGoal: ContentMixGoal;
  onChange: (patch: Partial<{ timezone: string; contentMixGoal: ContentMixGoal }>) => void;
}

export function PublishingSchedule({ timezone, contentMixGoal, onChange }: PublishingScheduleProps) {
  const total = contentMixGoal.reels + contentMixGoal.carousels + contentMixGoal.stories;

  const setMix = (key: keyof ContentMixGoal, value: number) => {
    onChange({ contentMixGoal: { ...contentMixGoal, [key]: value } });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">Publishing Schedule</h3>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <label>Timezone</label>
        <select
          aria-label="Timezone"
          value={timezone}
          onChange={(e) => onChange({ timezone: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-1 text-sm text-slate-600">
          Content mix goal {total !== 100 && <span className="text-amber-600">(totals {total}%, aim for 100%)</span>}
        </p>
        {(['reels', 'carousels', 'stories'] as const).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-20 text-xs capitalize text-slate-500">{key}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={contentMixGoal[key]}
              onChange={(e) => setMix(key, Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-10 text-right text-xs text-slate-500">{contentMixGoal[key]}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
