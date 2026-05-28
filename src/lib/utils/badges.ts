import { RunningRecord } from '@/lib/mockStore'

export interface RunnerBadge {
  id: string
  name: string
  emoji: string
  color: string
}

export function getBadgesForUser(userRecords: RunningRecord[], hasPbs: boolean): RunnerBadge[] {
  const badges: RunnerBadge[] = [];
  const totalDist = userRecords.reduce((sum, r) => sum + r.distance, 0);
  const maxDist = userRecords.length > 0 ? Math.max(...userRecords.map(r => r.distance)) : 0;
  const pacerCount = userRecords.filter(r => r.is_pacer).length;

  if (userRecords.length >= 1) {
    badges.push({ id: 'pioneer', name: '첫 인증', emoji: '🥇', color: 'bg-orange-50 text-orange-600 border-orange-200' });
  }
  if (totalDist >= 100) {
    badges.push({ id: 'iron', name: '수원 철인(100k+)', emoji: '🏃‍♂️', color: 'bg-blue-50 text-blue-650 border-blue-200' });
  }
  if (maxDist >= 10) {
    badges.push({ id: 'speed', name: '번개 러너(10k+)', emoji: '⚡', color: 'bg-amber-50 text-amber-600 border-amber-200' });
  }
  if (pacerCount >= 1) {
    badges.push({ id: 'pacer_hero', name: '봉사왕 페이서', emoji: '🎈', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' });
  }
  if (hasPbs) {
    badges.push({ id: 'pb_master', name: '기록 갱신', emoji: '🏆', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' });
  }
  return badges;
}
