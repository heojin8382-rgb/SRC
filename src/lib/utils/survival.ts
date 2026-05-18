// 수원러닝크루 (SRC) 월간 생존 여부 연산 코어 유틸리티
import { RunningRecord } from '../mockStore'

export interface SurvivalStatus {
  survived: boolean
  exempted: boolean
  totalDays: number      // 중복 병합된 총 출석일수
  regularDays: number    // 정기런(벙) 출석일수
  personalDays: number   // 개인런 출석일수
  statusMessage: string  // 한글 요약 메시지
  remainingRegularForA: number // 조건 A 만족을 위해 필요한 추가 정기런 수
  remainingTotalForA: number   // 조건 A 만족을 위해 필요한 추가 총 러닝 수
  remainingTotalForB: number   // 조건 B 만족을 위해 필요한 추가 총 러닝 수
}

/**
 * 특정 유저의 러닝 기록 목록과 부상/면제 여부를 바탕으로 월간 생존 여부를 정밀 계산합니다.
 * @param userRecords 특정 유저의 해당 월 러닝 기록 목록
 * @param isExempted 면제 대상 유저 여부 (부상 등)
 * @param targetYearMonth 계산 대상 년월 (기본값: '2026-05')
 */
export function calculateMonthlySurvival(
  userRecords: RunningRecord[],
  isExempted: boolean,
  targetYearMonth: string = '2026-05'
): SurvivalStatus {
  // 1. 면제자(Exempted)는 무조건 생존 처리
  if (isExempted) {
    return {
      survived: true,
      exempted: true,
      totalDays: 0,
      regularDays: 0,
      personalDays: 0,
      statusMessage: '부상 면제 🩹',
      remainingRegularForA: 0,
      remainingTotalForA: 0,
      remainingTotalForB: 0,
    }
  }

  // 2. 해당 년월의 기록만 필터링 (기록 날짜 format: YYYY-MM-DD)
  const monthlyRecords = userRecords.filter(rec => rec.date.startsWith(targetYearMonth))

  // 3. Rule 1 & Rule 2: 날짜별 그룹화하여 하루 2회 이상 인증 시 1회 병합 & 동일 날짜 정기(REGULAR)런 우선 반영
  const dailyLogs: Record<string, 'REGULAR' | 'PERSONAL'> = {}

  monthlyRecords.forEach(rec => {
    const dateStr = rec.date
    const currentType = rec.type

    if (!dailyLogs[dateStr]) {
      dailyLogs[dateStr] = currentType
    } else {
      // 이미 기록이 있을 때, 하나라도 REGULAR(벙)이면 REGULAR로 덮어씌움 (Rule 2)
      if (currentType === 'REGULAR') {
        dailyLogs[dateStr] = 'REGULAR'
      }
    }
  })

  // 4. 출석 일수 계산
  const uniqueDates = Object.keys(dailyLogs)
  const totalDays = uniqueDates.length
  
  let regularDays = 0
  let personalDays = 0

  uniqueDates.forEach(date => {
    if (dailyLogs[date] === 'REGULAR') {
      regularDays++
    } else {
      personalDays++
    }
  })

  // 5. Rule 3: 생존 판정 (조건 A 또는 조건 B 만족 시 생존)
  // 조건 A (정기런 중심): 총 출석일 >= 2일 이고, 정기런(벙) >= 1일
  const satisfiesConditionA = totalDays >= 2 && regularDays >= 1
  
  // 조건 B (개인런 중심): 총 출석일 >= 6일
  const satisfiesConditionB = totalDays >= 6

  const survived = satisfiesConditionA || satisfiesConditionB

  // 6. 생존 미달성 시 남은 미션 일수 계산
  // 조건 A 충족을 위해 남은 수치
  const remainingRegularForA = Math.max(0, 1 - regularDays)
  const remainingTotalForA = Math.max(0, 2 - totalDays)

  // 조건 B 충족을 위해 남은 수치
  const remainingTotalForB = Math.max(0, 6 - totalDays)

  // 7. 생존 상태 한글 메시지 구성
  let statusMessage = '미션 진행 중 🏃‍♂️'
  if (survived) {
    statusMessage = '생존 완료 🔥'
  } else if (totalDays === 0) {
    statusMessage = '생존 위기 💀'
  }

  return {
    survived,
    exempted: false,
    totalDays,
    regularDays,
    personalDays,
    statusMessage,
    remainingRegularForA,
    remainingTotalForA,
    remainingTotalForB,
  }
}
