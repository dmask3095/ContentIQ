import { useState, type DragEvent } from 'react';
import { useToast } from '../Common/Toast';
import { useUpdateDraft } from '../../hooks/useDrafts';
import type { PostsByDay } from '../../hooks/useCalendar';
import type { ContentDraft } from '../../types';
import { truncate } from '../../utils/formatters';

const DAYS: { key: string; label: string }[] = [
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
  { key: 'Sun', label: 'Sunday' },
];

const FORMAT_ICONS: Record<string, string> = { reel: '🎬', carousel: '🖼️', story: '⚡', caption: '📝' };

interface WeeklyCalendarProps {
  weekStart: Date;
  postsByDay: PostsByDay;
  onChanged: () => void;
}

export function WeeklyCalendar({ weekStart, postsByDay, onChanged }: WeeklyCalendarProps) {
  const { update } = useUpdateDraft();
  const { showToast } = useToast();
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const dateForDay = (index: number) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    return d;
  };

  const handleDrop = async (dayIndex: number, e: DragEvent) => {
    setDragOverDay(null);
    const draftId = e.dataTransfer.getData('text/plain');
    if (!draftId) return;
    const newDate = dateForDay(dayIndex).toISOString().slice(0, 10);
    try {
      await update(draftId, { scheduled_date: newDate });
      showToast('Draft rescheduled', 'success');
      onChanged();
    } catch {
      showToast('Failed to reschedule draft', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {DAYS.map((day, index) => {
        const posts: ContentDraft[] = postsByDay[day.key] ?? [];
        const date = dateForDay(index);
        return (
          <div
            key={day.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverDay(day.key);
            }}
            onDragLeave={() => setDragOverDay(null)}
            onDrop={(e) => handleDrop(index, e)}
            className={`flex min-h-[160px] flex-col gap-2 rounded-lg border p-2 ${
              dragOverDay === day.key ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="text-xs font-semibold text-slate-500">
              {day.label} <span className="text-slate-400">{date.getDate()}</span>
            </div>
            {posts.map((post) => (
              <div
                key={post.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', post.id);
                }}
                className="cursor-move rounded bg-slate-100 p-2 text-xs text-slate-700"
                title={post.caption}
              >
                <div className="flex items-center gap-1 font-medium">
                  <span>{FORMAT_ICONS[post.format] ?? '📝'}</span>
                  {post.scheduledTime}
                </div>
                <p>{truncate(post.title, 40)}</p>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
