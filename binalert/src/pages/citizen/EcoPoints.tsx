import { useEffect, useState } from 'react';
import { Award, Flag, Gift, Lock, Recycle, ScanLine, Shield, Sparkles, Trophy } from 'lucide-react';
import { PageHeader, Card, CardHeader, StatCard } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/Feedback';
import { Avatar } from '../../components/ui/Misc';
import { useAuth } from '../../context/AuthContext';
import { gamificationService, levelInfo } from '../../services/gamificationService';
import type { BadgeDef, LeaderboardEntry } from '../../types';

const BADGE_ICONS: Record<string, typeof Award> = {
  flag: Flag,
  scan: ScanLine,
  recycle: Recycle,
  sparkles: Sparkles,
  shield: Shield,
};

export function EcoPoints() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeDef[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    void Promise.all([gamificationService.badges(), gamificationService.leaderboard()]).then(([b, l]) => {
      setBadges(b);
      setLeaderboard(l);
    });
  }, []);

  if (!user) return null;
  const level = levelInfo(user.points);

  return (
    <>
      <PageHeader
        breadcrumb="Gamification"
        title="Eco Points & Achievements"
        subtitle="Responsible behaviour, rewarded. Earn points for sorting, reporting and community cleanups."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard label="Current points" value={user.points.toLocaleString()} icon={<Gift className="h-5 w-5" />} delta={`Level ${user.level}`} deltaTone="flat" />
        <StatCard label="Eco score" value={user.ecoScore} unit="/100" icon={<Sparkles className="h-5 w-5" />} delta="+4 this month" />
        <StatCard label="Badges earned" value={`${user.badges.length}/${badges?.length ?? 5}`} icon={<Award className="h-5 w-5" />} hint="keep going!" />
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="ba-label">Level progress</p>
            <p className="mt-1 text-lg font-extrabold text-ink-950">
              {level.current.name} <span className="text-ink-400">→</span> {level.next?.name ?? 'Max level'}
            </p>
          </div>
          <p className="ba-num text-sm font-bold text-emerald2-600">
            {level.next ? `${(level.next.minPoints - user.points).toLocaleString()} points to go` : 'Top level reached'}
          </p>
        </div>
        <ProgressBar value={level.progress} className="mt-4 h-3" label="Level progress" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Correct waste classification', '+25 pts'],
            ['Reporting overflowing bins', '+30 pts'],
            ['Reporting illegal dumping', '+40 pts'],
            ['Cleanup campaign participation', '+60 pts'],
            ['Consistent sustainable behaviour', '+15 pts / wk'],
          ].map(([action, pts]) => (
            <div key={action} className="rounded-xl bg-ink-50 p-3.5 ring-1 ring-ink-100">
              <p className="text-xs font-semibold leading-snug text-ink-600">{action}</p>
              <p className="ba-num mt-1.5 text-sm font-extrabold text-emerald2-600">{pts}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Badges & Achievements" subtitle="Milestones on your sustainability journey" icon={<Award className="h-5 w-5" />} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {(badges ?? []).map((b) => {
              const earned = user.badges.includes(b.id);
              const Icon = BADGE_ICONS[b.icon] ?? Award;
              return (
                <li
                  key={b.id}
                  className={`flex items-start gap-3 rounded-xl p-4 ring-1 transition-all ${
                    earned ? 'bg-emerald-50/70 ring-emerald-200' : 'bg-ink-50 ring-ink-100 opacity-70'
                  }`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${earned ? 'bg-emerald2-500 text-white shadow-glow' : 'bg-ink-200 text-ink-400'}`}>
                    {earned ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">{b.name}</p>
                    <p className="mt-0.5 text-xs leading-snug text-ink-500">{b.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="City Leaderboard" subtitle="Top contributors this season" icon={<Trophy className="h-5 w-5" />} />
          {!leaderboard ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="ba-skeleton h-12" />)}</div>
          ) : (
            <ol className="space-y-2">
              {leaderboard.map((entry) => (
                <li
                  key={entry.rank}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ring-1 ${
                    entry.isCurrentUser ? 'bg-forest-50 ring-forest-200' : 'bg-white ring-ink-100'
                  }`}
                >
                  <span
                    className={`ba-num grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-amber-950'
                        : entry.rank === 2
                          ? 'bg-ink-200 text-ink-700'
                          : entry.rank === 3
                            ? 'bg-orange-300 text-orange-950'
                            : 'bg-ink-50 text-ink-500'
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <Avatar name={entry.name} hue={(entry.rank * 67) % 360} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink-900">
                      {entry.name}
                      {entry.isCurrentUser && <span className="ml-2 rounded-md bg-forest-800 px-1.5 py-0.5 text-[10px] font-bold text-white">YOU</span>}
                    </span>
                    <span className="block text-xs text-ink-400">{entry.zone} · Level {entry.level}</span>
                  </span>
                  <span className="ba-num text-sm font-extrabold text-forest-800">{entry.points.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
