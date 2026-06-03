import { RunningRecord } from '@/lib/mockStore'

export interface RunnerBadge {
  id: string
  name: string
  emoji: string
  color: string
  description?: string
}

export interface BadgeSpec {
  id: string
  name: string
  emoji: string
  description: string
  color: string
}

export const ALL_BADGES: BadgeSpec[] = [
  { 
    id: 'pioneer', 
    name: '첫 인증', 
    emoji: '🥇', 
    description: '첫 번째 러닝 기록을 인증하면 획득합니다.', 
    color: 'bg-orange-950/40 text-orange-400 border-orange-900/50' 
  },
  { 
    id: 'iron', 
    name: '수원 철인(100k+)', 
    emoji: '🏃‍♂️', 
    description: '누적 달린 거리가 100km를 초과하면 획득합니다.', 
    color: 'bg-blue-950/40 text-blue-400 border-blue-900/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
  },
  { 
    id: 'speed', 
    name: '번개 러너(10k+)', 
    emoji: '⚡', 
    description: '단일 기록 중 10km 이상 달린 이력이 있으면 획득합니다.', 
    color: 'bg-amber-950/40 text-amber-400 border-amber-900/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
  },
  { 
    id: 'pacer_hero', 
    name: '봉사왕 페이서', 
    emoji: '🎈', 
    description: '벙에서 페이서 역할을 1회 이상 수행하면 획득합니다.', 
    color: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
  },
  { 
    id: 'pb_master', 
    name: '기록 갱신', 
    emoji: '🏆', 
    description: '마라톤 개인 최고 기록(PB)을 1개 이상 등록하면 획득합니다.', 
    color: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50 shadow-[0_0_10px_rgba(99,102,241,0.1)]' 
  },
  { 
    id: 'early_bird', 
    name: '얼리버드 러너', 
    emoji: '🌅', 
    description: '오전 6시 이전에 달리기 시작한 기록이 1회 이상 있으면 획득합니다.', 
    color: 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50 shadow-[0_0_10px_rgba(234,179,8,0.1)]' 
  },
  { 
    id: 'night_owl', 
    name: '올빼미 러너', 
    emoji: '🌙', 
    description: '오후 9시 이후부터 새벽 3시 사이에 달리기 시작한 기록이 1회 이상 있으면 획득합니다.', 
    color: 'bg-purple-950/40 text-purple-400 border-purple-900/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]' 
  }
]

export function getBadgesForUser(userRecords: RunningRecord[], hasPbs: boolean): RunnerBadge[] {
  const badges: RunnerBadge[] = [];
  const totalDist = userRecords.reduce((sum, r) => sum + r.distance, 0);
  const maxDist = userRecords.length > 0 ? Math.max(...userRecords.map(r => r.distance)) : 0;
  const pacerCount = userRecords.filter(r => r.is_pacer).length;

  // 시간 계산용 변수들
  let hasEarlyBird = false;
  let hasNightOwl = false;

  userRecords.forEach(rec => {
    if (rec.created_at) {
      const hours = new Date(rec.created_at).getHours();
      // 오전 6시 이전 (새벽 0시 ~ 오전 6시)
      if (hours >= 0 && hours < 6) {
        hasEarlyBird = true;
      }
      // 오후 9시 이후 ~ 새벽 3시 이전 (21시 ~ 24시, 0시 ~ 3시)
      if (hours >= 21 || (hours >= 0 && hours < 3)) {
        hasNightOwl = true;
      }
    }
  });

  if (userRecords.length >= 1) {
    const spec = ALL_BADGES.find(b => b.id === 'pioneer')!;
    badges.push({ id: spec.id, name: spec.name, emoji: spec.emoji, color: spec.color, description: spec.description });
  }
  if (totalDist >= 100) {
    const spec = ALL_BADGES.find(b => b.id === 'iron')!;
    badges.push({ id: spec.id, name: spec.name, emoji: spec.emoji, color: spec.color, description: spec.description });
  }
  if (maxDist >= 10) {
    const spec = ALL_BADGES.find(b => b.id === 'speed')!;
    badges.push({ id: spec.id, name: spec.name, emoji: spec.emoji, color: spec.color, description: spec.description });
  }
  if (pacerCount >= 1) {
    const spec = ALL_BADGES.find(b => b.id === 'pacer_hero')!;
    badges.push({ id: spec.id, name: spec.name, emoji: spec.emoji, color: spec.color, description: spec.description });
  }
  if (hasPbs) {
    const spec = ALL_BADGES.find(b => b.id === 'pb_master')!;
    badges.push({ id: spec.id, name: spec.name, emoji: spec.emoji, color: spec.color, description: spec.description });
  }
  if (hasEarlyBird) {
    const spec = ALL_BADGES.find(b => b.id === 'early_bird')!;
    badges.push({ id: spec.id, name: spec.name, emoji: spec.emoji, color: spec.color, description: spec.description });
  }
  if (hasNightOwl) {
    const spec = ALL_BADGES.find(b => b.id === 'night_owl')!;
    badges.push({ id: spec.id, name: spec.name, emoji: spec.emoji, color: spec.color, description: spec.description });
  }
  
  return badges;
}
