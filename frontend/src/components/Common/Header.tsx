import { useAppStore } from '../../store/useAppStore';
import { timeAgo } from '../../utils/formatters';

export function Header() {
  const lastRefreshedAt = useAppStore((s) => s.lastRefreshedAt);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-slate-900">ContentIQ</span>
        <span className="text-sm text-slate-400">AI-powered content research & generation</span>
      </div>
      <div className="text-sm text-slate-500">Last research refresh: {timeAgo(lastRefreshedAt)}</div>
    </header>
  );
}
