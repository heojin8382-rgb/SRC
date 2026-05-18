// ==========================================================================
// 🏃 ORBIT RUNNING CREW - ATTENDANCE & SCHEDULE MANAGEMENT CORE ENGINE
// ==========================================================================

// Global state holding database records
let state = {
  members: [],
  runs: []
};

// Initial realistic mock data to pre-populate on first load
const INITIAL_MEMBERS = [
  { id: 'mem-1', name: '김지우', nickname: '화곡동치타', phone: '010-1111-2222', pace: 'A', bio: '서브 3 달성이 올해 목표입니다! 🔥', registeredAt: '2026-03-01' },
  { id: 'mem-2', name: '이진우', nickname: '페이스메이커', phone: '010-3333-4444', pace: 'B', bio: '다 함께 즐겁게 뛰는 러닝이 좋습니다.', registeredAt: '2026-03-15' },
  { id: 'mem-3', name: '박민지', nickname: '러닝요정', phone: '010-5555-6666', pace: 'C', bio: '기록보다는 꾸준함과 건강을 위해! 🏃‍♀️✨', registeredAt: '2026-03-20' },
  { id: 'mem-4', name: '정태호', nickname: '마라토너T', phone: '010-7777-8888', pace: 'A', bio: '풀코스 완주 3회차, 함께 훈련해요.', registeredAt: '2026-04-02' },
  { id: 'mem-5', name: '최수아', nickname: '런린이성장기', phone: '010-9999-0000', pace: 'D', bio: '10km 완주가 첫 목표인 초보 러너입니다!', registeredAt: '2026-04-10' },
  { id: 'mem-6', name: '윤동현', nickname: '야간러닝머신', phone: '010-2222-8888', pace: 'B', bio: '퇴근 후 강바람 맞으며 뛰는 매력!', registeredAt: '2026-04-15' },
  { id: 'mem-7', name: '한소희', nickname: '아침형러너', phone: '010-4444-5555', pace: 'C', bio: '상쾌한 새벽 공기 속 질주를 지향합니다.', registeredAt: '2026-04-20' },
  { id: 'mem-8', name: '임채원', nickname: '기적의완주', phone: '010-6666-7777', pace: 'D', bio: '천천히 가더라도 멈추지 않습니다.', registeredAt: '2026-05-01' }
];

const INITIAL_RUNS = [
  {
    id: 'run-1',
    title: '여의도 한강공원 야간 펀런',
    date: '2026-05-10',
    time: '20:00',
    location: '여의나루역 2번 출구 앞 잔디광장',
    distance: 5.5,
    pace: 'ALL',
    capacity: 25,
    attendance: {
      'mem-1': 'attend',
      'mem-2': 'attend',
      'mem-3': 'late',
      'mem-4': 'attend',
      'mem-5': 'absent',
      'mem-6': 'attend',
      'mem-7': 'attend',
      'mem-8': 'attend'
    }
  },
  {
    id: 'run-2',
    title: '종합운동장 보조트랙 인터벌 훈련',
    date: '2026-05-14',
    time: '19:30',
    location: '종합운동장역 7번 출구 보조경기장 입구',
    distance: 7.0,
    pace: 'A',
    capacity: 15,
    attendance: {
      'mem-1': 'attend',
      'mem-2': 'late',
      'mem-3': 'none',
      'mem-4': 'attend',
      'mem-5': 'none',
      'mem-6': 'attend',
      'mem-7': 'none',
      'mem-8': 'none'
    }
  },
  {
    id: 'run-3',
    title: '반포대교 달빛무지개 분수 러닝 (D-DAY)',
    date: '2026-05-18', // Same as current local time mock date
    time: '20:30',
    location: '반포한강공원 달빛광장 종합안내판 앞',
    distance: 6.0,
    pace: 'B',
    capacity: 20,
    attendance: {
      'mem-1': 'attend',
      'mem-2': 'attend',
      'mem-3': 'none',
      'mem-4': 'attend',
      'mem-5': 'none',
      'mem-6': 'none',
      'mem-7': 'none',
      'mem-8': 'none'
    }
  },
  {
    id: 'run-4',
    title: '남산 둘레길 주말 업힐 트레이닝',
    date: '2026-05-23',
    time: '09:00',
    location: '동대입구역 6번 출구 장충단공원 정문',
    distance: 8.5,
    pace: 'B',
    capacity: 18,
    attendance: {
      'mem-1': 'none',
      'mem-2': 'none',
      'mem-3': 'none',
      'mem-4': 'none',
      'mem-5': 'none',
      'mem-6': 'none',
      'mem-7': 'none',
      'mem-8': 'none'
    }
  }
];

// ==========================================================================
// 💾 DATABASE INITIALIZATION & SYNC
// ==========================================================================
function loadDatabase() {
  const localMembers = localStorage.getItem('orbit_crew_members');
  const localRuns = localStorage.getItem('orbit_crew_runs');

  if (localMembers && localRuns) {
    state.members = JSON.parse(localMembers);
    state.runs = JSON.parse(localRuns);
  } else {
    // Seed database if not found
    state.members = INITIAL_MEMBERS;
    state.runs = INITIAL_RUNS;
    saveDatabase();
  }
}

function saveDatabase() {
  localStorage.setItem('orbit_crew_members', JSON.stringify(state.members));
  localStorage.setItem('orbit_crew_runs', JSON.stringify(state.runs));
}

// ==========================================================================
// 📅 SYSTEM INITIALIZATION & STATE MANAGEMENT
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadDatabase();
  initNavigation();
  initSearchAndFilters();
  initHeaderActionBtn();
  
  // Set first dynamic render
  renderDashboard();
});

// Navigation Handling
let currentTab = 'dashboard';

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const selectedTab = item.getAttribute('data-tab');
      
      // Update UI active states
      navItems.forEach(nav => {
        if (nav.getAttribute('data-tab') === selectedTab) {
          nav.classList.add('active');
        } else {
          nav.classList.remove('active');
        }
      });
      
      // Show/Hide sections
      document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.remove('active');
      });
      
      const activeSection = document.getElementById(`${selectedTab}-tab`);
      if (activeSection) {
        activeSection.classList.add('active');
      }
      
      currentTab = selectedTab;
      updateHeaderTitle();
      triggerTabRenderer(selectedTab);
    });
  });
}

function updateHeaderTitle() {
  const titleEl = document.getElementById('page-title');
  const subtitleEl = document.getElementById('page-subtitle');
  const actionBtn = document.getElementById('header-action-btn');
  
  actionBtn.style.display = 'inline-flex';
  
  if (currentTab === 'dashboard') {
    titleEl.textContent = '크루 대시보드';
    subtitleEl.textContent = '러닝크루 활동 현황과 실시간 출석 통계를 보여줍니다.';
    actionBtn.innerHTML = `<i class="fa-solid fa-calendar-plus"></i><span>새 러닝 일정 만들기</span>`;
  } else if (currentTab === 'schedule') {
    titleEl.textContent = '러닝 일정 관리';
    subtitleEl.textContent = '크루 모임을 기획하고 현장 출석 체크를 진행합니다.';
    actionBtn.innerHTML = `<i class="fa-solid fa-calendar-plus"></i><span>새 러닝 일정 만들기</span>`;
  } else if (currentTab === 'crew') {
    titleEl.textContent = '크루원 디렉토리';
    subtitleEl.textContent = '정식 등록된 러닝크루 부원 리스트를 조회하고 수정합니다.';
    actionBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i><span>새 크루원 등록</span>`;
  } else if (currentTab === 'analytics') {
    titleEl.textContent = '출석 분석 & 통계';
    subtitleEl.textContent = '페이스 분포 및 크루원들의 출석률 랭킹을 한눈에 확인합니다.';
    actionBtn.style.display = 'none'; // No quick button needed
  }
}

function triggerTabRenderer(tab) {
  if (tab === 'dashboard') renderDashboard();
  else if (tab === 'schedule') renderSchedule();
  else if (tab === 'crew') renderCrew();
  else if (tab === 'analytics') renderAnalytics();
}

function initHeaderActionBtn() {
  const actionBtn = document.getElementById('header-action-btn');
  actionBtn.addEventListener('click', () => {
    if (currentTab === 'dashboard' || currentTab === 'schedule') {
      openRunModal();
    } else if (currentTab === 'crew') {
      openMemberModal();
    }
  });
}

// ==========================================================================
// 🔍 SEARCH & FILTERS CONTROLLERS
// ==========================================================================
let activeScheduleFilter = 'all';
let activeCrewFilter = 'all';

function initSearchAndFilters() {
  // Schedule Search
  const scheduleSearchInput = document.getElementById('schedule-search');
  scheduleSearchInput.addEventListener('input', renderSchedule);

  // Schedule status filter badges
  const scheduleBadges = document.querySelectorAll('#schedule-status-filters .filter-badge');
  scheduleBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      scheduleBadges.forEach(b => b.classList.remove('active'));
      badge.classList.add('active');
      activeScheduleFilter = badge.getAttribute('data-filter');
      renderSchedule();
    });
  });

  // Crew Search
  const crewSearchInput = document.getElementById('crew-search');
  crewSearchInput.addEventListener('input', renderCrew);

  // Crew pace filter badges
  const crewBadges = document.querySelectorAll('#crew-pace-filters .filter-badge');
  crewBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      crewBadges.forEach(b => b.classList.remove('active'));
      badge.classList.add('active');
      activeCrewFilter = badge.getAttribute('data-filter');
      renderCrew();
    });
  });
  
  // Attendance Search (Real-time in modal)
  const attSearch = document.getElementById('attendance-search-input');
  attSearch.addEventListener('input', () => {
    const runId = attSearch.getAttribute('data-active-run-id');
    if (runId) renderAttendanceMembersList(runId);
  });
}

// ==========================================================================
// 📊 DASHBOARD RENDER LOGIC (TAB 1)
// ==========================================================================
function renderDashboard() {
  // 1. Total Crew Counter
  document.getElementById('stat-total-crew').textContent = `${state.members.length}명`;

  // 2. Count runs this month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  
  const runsThisMonth = state.runs.filter(run => {
    const runDate = new Date(run.date);
    return runDate.getFullYear() === currentYear && runDate.getMonth() === currentMonth;
  });
  document.getElementById('stat-total-runs').textContent = `${runsThisMonth.length}회`;

  // 3. Average Crew Attendance Rate
  let totalChecked = 0;
  let totalAttended = 0; // Includes late
  
  state.runs.forEach(run => {
    Object.values(run.attendance).forEach(status => {
      if (status === 'attend' || status === 'late') {
        totalAttended++;
        totalChecked++;
      } else if (status === 'absent') {
        totalChecked++;
      }
    });
  });
  
  const avgRate = totalChecked > 0 ? Math.round((totalAttended / totalChecked) * 100) : 0;
  document.getElementById('stat-avg-attendance').textContent = `${avgRate}%`;

  // 4. Render Highlights for Closest Next Run (Upcoming Run)
  renderDashboardUpcomingHighlight();

  // 5. Render MVP Leaderboard
  renderDashboardLeaderboard();
}

function renderDashboardUpcomingHighlight() {
  const container = document.getElementById('upcoming-run-content');
  const todayStr = getTodayString();
  
  // Find upcoming runs (today or in future), sorted chronologically ascending
  const upcomingRuns = state.runs
    .filter(run => run.date >= todayStr)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

  if (upcomingRuns.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="border: none; padding: 1.5rem 0;">
        <i class="fa-solid fa-cloud-sun empty-state-icon" style="font-size: 2.5rem;"></i>
        <h4 class="empty-state-title">예정된 러닝 모임이 없습니다.</h4>
        <p class="empty-state-desc">새로운 코스와 시각을 정해 러닝 일정을 개설해 보세요!</p>
        <button class="btn btn-primary btn-sm" onclick="openRunModal()" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-plus"></i> 일정 만들기
        </button>
      </div>
    `;
    document.getElementById('upcoming-status').textContent = '대기중';
    document.getElementById('upcoming-status').className = 'run-status-indicator status-completed';
    return;
  }

  const run = upcomingRuns[0];
  
  // Calculate D-Day
  const dday = calculateDDay(run.date);
  const statusBadge = document.getElementById('upcoming-status');
  statusBadge.textContent = dday === 0 ? 'LIVE TODAY' : `D-${dday}`;
  statusBadge.className = dday === 0 ? 'run-status-indicator status-live' : 'run-status-indicator status-scheduled';

  // Calculate quick attendance percentage
  const attTotal = Object.keys(run.attendance).length;
  const attActive = Object.values(run.attendance).filter(s => s === 'attend' || s === 'late').length;
  const ratio = attTotal > 0 ? Math.round((attActive / attTotal) * 100) : 0;

  // Format date display
  const dateFormatted = formatKoreanDate(run.date);

  container.innerHTML = `
    <div class="upcoming-session-info" style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div>
        <h4 class="run-title" style="font-size: 1.4rem; color: #fff; margin-bottom: 0.5rem;">${run.title}</h4>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span class="run-distance-tag" style="margin-left: 0; font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: var(--accent-primary); border-color: rgba(16, 185, 129, 0.3);">
            코스 거리 ${run.distance} km
          </span>
          <span class="run-distance-tag" style="margin-left: 0; font-size: 0.8rem;">
            Pace: ${getPaceLabel(run.pace)}
          </span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.6rem; background: rgba(0,0,0,0.15); padding: 1rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.03);">
        <div class="run-meta-item">
          <i class="fa-solid fa-clock"></i>
          <span style="color: #fff; font-weight: 500;">${dateFormatted} 오후 ${run.time} 집결</span>
        </div>
        <div class="run-meta-item">
          <i class="fa-solid fa-location-dot"></i>
          <span style="color: var(--text-main);">${run.location}</span>
        </div>
      </div>

      <div class="run-attendance-summary" style="border: none; padding-top: 0;">
        <div class="attendance-ratio-text">
          <span>현장 출석 현황 (${attActive}/${state.members.length}명 체크인)</span>
          <span class="attendance-percent">${ratio}%</span>
        </div>
        <div class="attendance-progress-bar-bg">
          <div class="attendance-progress-bar-fill" style="width: ${ratio}%;"></div>
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
        <button class="btn btn-primary" onclick="openAttendanceModal('${run.id}')" style="flex: 2;">
          <i class="fa-solid fa-calendar-check"></i> 현장 출석체크 하기
        </button>
        <button class="btn btn-secondary btn-icon" onclick="openRunModal('${run.id}')" title="일정 편집">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      </div>
    </div>
  `;
}

function renderDashboardLeaderboard() {
  const container = document.getElementById('dashboard-mvp-list');
  
  // Calculate rankings
  const rankings = getMemberRankings().slice(0, 3); // Get Top 3

  if (rankings.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="border: none; padding: 1.5rem 0;">
        <p class="empty-state-desc">기록을 산출할 크루원이 없습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = rankings.map((member, index) => {
    const rankNum = index + 1;
    const paceClass = `pace-${member.pace.toLowerCase()}`;
    const initials = member.name.substring(1, 3) || member.name;
    const isFirst = rankNum === 1 ? 'mvp-avatar-green' : '';

    return `
      <div class="mvp-podium-item">
        <div class="mvp-rank-badge rank-${rankNum}">${rankNum}</div>
        <div class="mvp-avatar ${isFirst}">${initials}</div>
        <div class="mvp-details">
          <span class="mvp-name">${member.name}</span>
          <span class="mvp-nickname">@${member.nickname} <span class="crew-pace-badge ${paceClass}" style="transform: scale(0.85); display: inline-block; vertical-align: middle; margin-top: 0;">${member.pace}그룹</span></span>
        </div>
        <div class="mvp-stat-score">
          <span class="mvp-score-value">${member.attendanceCount}회 참석</span>
          <span class="mvp-score-label">누적 ${member.totalDistance.toFixed(1)}km</span>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 📅 RUNNING SCHEDULE RENDER LOGIC (TAB 2)
// ==========================================================================
function renderSchedule() {
  const container = document.getElementById('run-cards-container');
  const searchVal = document.getElementById('schedule-search').value.toLowerCase();
  const todayStr = getTodayString();

  // Filter and sort runs (newest runs first)
  let filteredRuns = state.runs.filter(run => {
    const matchSearch = run.title.toLowerCase().includes(searchVal) || run.location.toLowerCase().includes(searchVal);
    
    let matchFilter = true;
    if (activeScheduleFilter === 'scheduled') {
      matchFilter = run.date >= todayStr;
    } else if (activeScheduleFilter === 'completed') {
      matchFilter = run.date < todayStr;
    }
    
    return matchSearch && matchFilter;
  });

  // Sort: Chronological descending (recent/future runs up top)
  filteredRuns.sort((a, b) => b.date.localeCompare(a.date));

  if (filteredRuns.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-calendar-xmark empty-state-icon"></i>
        <h4 class="empty-state-title">검색 조건에 맞는 일정이 없습니다.</h4>
        <p class="empty-state-desc">새로운 모임 코스를 개설하거나 필터를 확인해 보세요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredRuns.map(run => {
    const dateObj = new Date(run.date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    // Status Badge
    let statusClass = 'status-scheduled';
    let statusText = '진행 예정';
    if (run.date < todayStr) {
      statusClass = 'status-completed';
      statusText = '러닝 완료';
    } else if (run.date === todayStr) {
      statusClass = 'status-live';
      statusText = 'D-DAY LIVE';
    }

    // Attendance stats
    const totalCrew = state.members.length;
    const attMap = run.attendance;
    const attendedCount = Object.values(attMap).filter(s => s === 'attend' || s === 'late').length;
    const absentCount = Object.values(attMap).filter(s => s === 'absent').length;
    
    const attRatio = totalCrew > 0 ? Math.round((attendedCount / totalCrew) * 100) : 0;
    const isCompleted = run.date < todayStr;

    return `
      <div class="glass-card run-card">
        <div class="run-card-header">
          <div class="run-date-badge">
            <span class="run-date-day">${day}</span>
            <span class="run-date-month">${monthStr}</span>
          </div>
          <span class="run-status-indicator ${statusClass}">${statusText}</span>
        </div>

        <div class="run-details">
          <h4 class="run-title">${run.title}</h4>
          <div class="run-meta-item" style="margin-top: 0.25rem;">
            <i class="fa-solid fa-clock"></i>
            <span>${formatKoreanDate(run.date)} 오후 ${run.time} 집결</span>
          </div>
          <div class="run-meta-item">
            <i class="fa-solid fa-location-dot"></i>
            <span>${run.location}</span>
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
            <span class="run-distance-tag" style="margin:0;">거리 ${run.distance}km</span>
            <span class="run-distance-tag" style="margin:0;">Pace: ${getPaceLabel(run.pace)}</span>
          </div>
        </div>

        <div class="run-attendance-summary">
          <div class="attendance-ratio-text">
            <span>참석률 (${attendedCount}/${totalCrew}명)</span>
            <span class="attendance-percent">${attRatio}%</span>
          </div>
          <div class="attendance-progress-bar-bg">
            <div class="attendance-progress-bar-fill" style="width: ${attRatio}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-dark); margin-top: 2px;">
            <span>지각: ${Object.values(attMap).filter(s => s === 'late').length}명</span>
            <span>결석: ${absentCount}명</span>
          </div>
        </div>

        <div class="run-card-footer">
          <button class="btn btn-primary btn-sm" onclick="openAttendanceModal('${run.id}')">
            <i class="fa-solid fa-clipboard-user"></i> ${isCompleted ? '출석 기록 확인' : '현장 출석 체크'}
          </button>
          <button class="btn btn-secondary btn-sm btn-icon" onclick="openRunModal('${run.id}')" title="수정">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteRun('${run.id}')" title="삭제">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 🏃 CREW DIRECTORY RENDER LOGIC (TAB 3)
// ==========================================================================
function renderCrew() {
  const container = document.getElementById('crew-cards-container');
  const searchVal = document.getElementById('crew-search').value.toLowerCase();

  // Filter members
  let filteredMembers = state.members.filter(member => {
    const matchSearch = member.name.toLowerCase().includes(searchVal) || member.nickname.toLowerCase().includes(searchVal);
    const matchPace = activeCrewFilter === 'all' || member.pace === activeCrewFilter;
    
    return matchSearch && matchPace;
  });

  if (filteredMembers.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-user-slash empty-state-icon"></i>
        <h4 class="empty-state-title">검색 조건에 맞는 크루원이 없습니다.</h4>
        <p class="empty-state-desc">새로운 동료 부원을 크루에 등록해 보세요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredMembers.map(member => {
    const paceClass = `pace-${member.pace.toLowerCase()}`;
    const initials = member.name.substring(1, 3) || member.name;

    // Calculate personal attendance statistics
    const stats = getPersonalStats(member.id);

    return `
      <div class="glass-card crew-card">
        <div class="crew-card-top">
          <div class="crew-card-avatar">${initials}</div>
          <div class="crew-card-name-group">
            <span class="crew-card-name">${member.name}</span>
            <span class="crew-card-nickname">@${member.nickname}</span>
            <span class="crew-pace-badge ${paceClass}">${getPaceLabel(member.pace)}</span>
          </div>
        </div>

        <div class="crew-card-bio">
          "${member.bio}"
        </div>

        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.25rem;">
          <div><i class="fa-solid fa-phone" style="width:16px; color: var(--accent-secondary);"></i> ${member.phone}</div>
          <div><i class="fa-solid fa-calendar-day" style="width:16px; color: var(--accent-secondary);"></i> 가입일: ${member.registeredAt}</div>
        </div>

        <div class="crew-card-stats">
          <div class="crew-mini-stat">
            <span class="crew-mini-stat-val">${stats.attendanceCount}회</span>
            <span class="crew-mini-stat-lbl">출석 완료</span>
          </div>
          <div class="crew-mini-stat" style="border-left: 1px solid rgba(255,255,255,0.06);">
            <span class="crew-mini-stat-val">${stats.attendanceRate}%</span>
            <span class="crew-mini-stat-lbl">출석율</span>
          </div>
        </div>

        <div class="crew-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="openMemberModal('${member.id}')">
            <i class="fa-solid fa-user-pen"></i> 수정
          </button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteMember('${member.id}')" title="삭제">
            <i class="fa-solid fa-user-minus"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 📈 ANALYTICS & STATS RENDER LOGIC (TAB 4)
// ==========================================================================
function renderAnalytics() {
  // 1. Render Pace distribution bar charts
  renderPaceDistribution();

  // 2. Render Full Leaderboard Rankings
  renderFullRankings();
}

function renderPaceDistribution() {
  const container = document.getElementById('pace-distribution-bars');
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  
  state.members.forEach(member => {
    if (counts[member.pace] !== undefined) {
      counts[member.pace]++;
    }
  });

  const total = state.members.length || 1;
  const groups = [
    { key: 'A', name: 'A그룹 (4분대)', color: 'var(--accent-orange)' },
    { key: 'B', name: 'B그룹 (5분대)', color: 'var(--accent-primary)' },
    { key: 'C', name: 'C그룹 (6분대)', color: 'var(--accent-secondary)' },
    { key: 'D', name: 'D그룹 (7분이상)', color: 'var(--text-dark)' }
  ];

  container.innerHTML = `
    <div class="pace-chart-bar-container">
      ${groups.map(g => {
        const count = counts[g.key];
        const pct = Math.round((count / total) * 100);
        return `
          <div class="pace-chart-row">
            <span class="pace-chart-label">${g.name}</span>
            <div class="pace-chart-bar-bg">
              <div class="pace-chart-bar-fill" style="width: ${pct}%; background: ${g.color};"></div>
            </div>
            <span class="pace-chart-count">${count}명 (${pct}%)</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderFullRankings() {
  const container = document.getElementById('analytics-member-ranking');
  const rankings = getMemberRankings();

  if (rankings.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="border: none;">
        <p class="empty-state-desc">부원 활동 데이터가 존재하지 않습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = rankings.map((member, index) => {
    const rankNum = index + 1;
    const initials = member.name.substring(1, 3) || member.name;
    const pct = member.attendanceRate;

    return `
      <div class="mvp-podium-item" style="padding: 0.8rem 1rem;">
        <div class="mvp-rank-badge" style="background: rgba(255,255,255,0.05); font-size: 0.75rem; width:24px; height:24px;">${rankNum}</div>
        <div class="mvp-avatar" style="width:36px; height:36px; font-size:0.85rem; background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02)); border:1px solid var(--glass-border); color:#fff;">${initials}</div>
        <div class="mvp-details">
          <span class="mvp-name" style="font-size:0.9rem;">${member.name} (${member.nickname})</span>
          <div class="attendance-progress-bar-bg" style="height: 4px; width: 80%; margin-top: 0.25rem;">
            <div class="attendance-progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
        <div class="mvp-stat-score">
          <span class="mvp-score-value" style="font-size:0.9rem;">${member.attendanceCount}회 (${pct}%)</span>
          <span class="mvp-score-label" style="font-size:0.65rem;">누적 ${member.totalDistance.toFixed(1)}km</span>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// 🖊️ CRUD SUBMISSIONS HANDLERS
// ==========================================================================

// Run CRUD
function handleRunSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('run-form-id').value;
  const title = document.getElementById('run-title').value;
  const date = document.getElementById('run-date').value;
  const time = document.getElementById('run-time').value;
  const location = document.getElementById('run-location').value;
  const distance = parseFloat(document.getElementById('run-distance').value);
  const pace = document.getElementById('run-pace').value;
  const capacity = parseInt(document.getElementById('run-capacity').value);

  if (id) {
    // Edit Mode
    const index = state.runs.findIndex(r => r.id === id);
    if (index !== -1) {
      state.runs[index] = {
        ...state.runs[index],
        title, date, time, location, distance, pace, capacity
      };
    }
  } else {
    // Create Mode
    const newId = `run-${Date.now()}`;
    const newRun = {
      id: newId,
      title, date, time, location, distance, pace, capacity,
      attendance: {}
    };
    
    // Seed attendance as 'none' for all existing crew members
    state.members.forEach(member => {
      newRun.attendance[member.id] = 'none';
    });
    
    state.runs.push(newRun);
  }

  saveDatabase();
  closeModal('run-modal');
  
  // Re-render
  triggerTabRenderer(currentTab);
  if (currentTab !== 'dashboard') renderDashboard(); // update counts in header
}

function deleteRun(id) {
  if (confirm('이 러닝 일정을 정말 삭제하시겠습니까?\n삭제된 데이터와 출석 정보는 복구할 수 없습니다.')) {
    state.runs = state.runs.filter(r => r.id !== id);
    saveDatabase();
    triggerTabRenderer(currentTab);
    if (currentTab !== 'dashboard') renderDashboard();
  }
}

// Member CRUD
function handleMemberSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('member-form-id').value;
  const name = document.getElementById('member-name').value;
  const nickname = document.getElementById('member-nickname').value;
  const phone = document.getElementById('member-phone').value;
  const pace = document.getElementById('member-pace').value;
  const bio = document.getElementById('member-bio').value;

  if (id) {
    // Edit
    const index = state.members.findIndex(m => m.id === id);
    if (index !== -1) {
      state.members[index] = {
        ...state.members[index],
        name, nickname, phone, pace, bio
      };
    }
  } else {
    // Create
    const newId = `mem-${Date.now()}`;
    const newMember = {
      id: newId,
      name, nickname, phone, pace, bio,
      registeredAt: getTodayString()
    };
    state.members.push(newMember);

    // Register empty attendance status in all existing runs
    state.runs.forEach(run => {
      run.attendance[newId] = 'none';
    });
  }

  saveDatabase();
  closeModal('member-modal');
  triggerTabRenderer(currentTab);
  if (currentTab !== 'dashboard') renderDashboard();
}

function deleteMember(id) {
  if (confirm('이 크루원을 정말 제외하시겠습니까?\n이 크루원의 과거 모든 출석 내역 데이터도 함께 정리됩니다.')) {
    // 1. Remove from crew list
    state.members = state.members.filter(m => m.id !== id);
    
    // 2. Remove attendance records for this member in all runs
    state.runs.forEach(run => {
      if (run.attendance[id]) {
        delete run.attendance[id];
      }
    });

    saveDatabase();
    triggerTabRenderer(currentTab);
    if (currentTab !== 'dashboard') renderDashboard();
  }
}

// ==========================================================================
// 💡 INTERACTIVE MODAL WINDOW CONTROLLERS
// ==========================================================================
function openRunModal(id = null) {
  const modal = document.getElementById('run-modal');
  const form = document.getElementById('run-form');
  const titleEl = document.getElementById('run-modal-title');
  
  form.reset();
  
  if (id) {
    const run = state.runs.find(r => r.id === id);
    if (run) {
      titleEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> 러닝 일정 수정`;
      document.getElementById('run-form-id').value = run.id;
      document.getElementById('run-title').value = run.title;
      document.getElementById('run-date').value = run.date;
      document.getElementById('run-time').value = run.time;
      document.getElementById('run-location').value = run.location;
      document.getElementById('run-distance').value = run.distance;
      document.getElementById('run-pace').value = run.pace;
      document.getElementById('run-capacity').value = run.capacity;
    }
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> 새 러닝 일정 등록`;
    document.getElementById('run-form-id').value = '';
    // Pre-populate today's date
    document.getElementById('run-date').value = getTodayString();
    document.getElementById('run-time').value = "20:00";
    document.getElementById('run-pace').value = "ALL";
    document.getElementById('run-capacity').value = "20";
  }
  
  modal.classList.add('active');
}

function openMemberModal(id = null) {
  const modal = document.getElementById('member-modal');
  const form = document.getElementById('member-form');
  const titleEl = document.getElementById('member-modal-title');
  
  form.reset();

  if (id) {
    const member = state.members.find(m => m.id === id);
    if (member) {
      titleEl.innerHTML = `<i class="fa-solid fa-user-pen"></i> 크루원 정보 수정`;
      document.getElementById('member-form-id').value = member.id;
      document.getElementById('member-name').value = member.name;
      document.getElementById('member-nickname').value = member.nickname;
      document.getElementById('member-phone').value = member.phone;
      document.getElementById('member-pace').value = member.pace;
      document.getElementById('member-bio').value = member.bio;
    }
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-user-plus"></i> 새 크루원 등록`;
    document.getElementById('member-form-id').value = '';
    document.getElementById('member-pace').value = 'B';
  }

  modal.classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Attendance Check Modal Controller
function openAttendanceModal(runId) {
  const run = state.runs.find(r => r.id === runId);
  if (!run) return;

  const modal = document.getElementById('attendance-modal');
  
  // Set modal run info
  document.getElementById('attendance-run-name').textContent = run.title;
  document.getElementById('attendance-run-meta').textContent = `${formatKoreanDate(run.date)} • ${run.time} 집결 • 코스 ${run.distance}km • ${getPaceLabel(run.pace)}`;
  
  // Configure active input state search
  const attSearch = document.getElementById('attendance-search-input');
  attSearch.value = '';
  attSearch.setAttribute('data-active-run-id', runId);

  // Render members list
  renderAttendanceMembersList(runId);

  modal.classList.add('active');
}

function renderAttendanceMembersList(runId) {
  const run = state.runs.find(r => r.id === runId);
  if (!run) return;

  const container = document.getElementById('attendance-members-list-container');
  const searchVal = document.getElementById('attendance-search-input').value.toLowerCase();

  // Filter crew members by search input
  const filtered = state.members.filter(m => {
    return m.name.toLowerCase().includes(searchVal) || m.nickname.toLowerCase().includes(searchVal);
  });

  // Count check-in ratios for header
  const total = state.members.length;
  const attended = Object.values(run.attendance).filter(s => s === 'attend' || s === 'late').length;
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
  
  document.getElementById('attendance-run-stats').textContent = `${attended}/${total}명 (${pct}%)`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="border: none; padding: 1.5rem 0;">
        <p class="empty-state-desc">검색어와 부합하는 크루원이 없습니다.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(member => {
    const currentStatus = run.attendance[member.id] || 'none';
    
    // Status button classes
    const isAtt = currentStatus === 'attend' ? 'active' : '';
    const isLate = currentStatus === 'late' ? 'active' : '';
    const isAbs = currentStatus === 'absent' ? 'active' : '';
    const isNone = currentStatus === 'none' ? 'active' : '';

    return `
      <div class="attendance-member-row">
        <div class="attendance-member-info">
          <div class="crew-card-avatar" style="width:34px; height:34px; font-size:0.75rem; margin-right:0.25rem;">
            ${member.name.substring(1,3) || member.name}
          </div>
          <div>
            <div class="attendance-member-name">${member.name} <span style="font-size:0.75rem; font-weight:400; color:var(--text-muted);">@${member.nickname}</span></div>
            <div class="attendance-member-role" style="font-size:0.65rem; color:var(--text-dark); margin-top:2px;">페이스: ${getPaceLabel(member.pace)}</div>
          </div>
        </div>

        <div class="status-btn-group">
          <button class="btn-status-toggle status-check ${isAtt}" onclick="toggleAttendanceStatus('${runId}', '${member.id}', 'attend')">출석</button>
          <button class="btn-status-toggle status-late ${isLate}" onclick="toggleAttendanceStatus('${runId}', '${member.id}', 'late')">지각</button>
          <button class="btn-status-toggle status-absent ${isAbs}" onclick="toggleAttendanceStatus('${runId}', '${member.id}', 'absent')">결석</button>
          <button class="btn-status-toggle status-none ${isNone}" onclick="toggleAttendanceStatus('${runId}', '${member.id}', 'none')">미정</button>
        </div>
      </div>
    `;
  }).join('');
}

// Mutate attendance status instantly on click
function toggleAttendanceStatus(runId, memberId, newStatus) {
  const runIndex = state.runs.findIndex(r => r.id === runId);
  if (runIndex === -1) return;

  // Mutate state
  state.runs[runIndex].attendance[memberId] = newStatus;
  
  // Save database
  saveDatabase();

  // Re-render only list row metrics in real time
  renderAttendanceMembersList(runId);
  
  // Also refresh parent views behind modal
  triggerTabRenderer(currentTab);
  if (currentTab !== 'dashboard') renderDashboard(); // Update stats counters
}

// ==========================================================================
// 📈 CORE CALCULATIONS & ANALYTICAL ALGORITHMS
// ==========================================================================

// Calculates ranking statistics of all crew members
function getMemberRankings() {
  return state.members.map(member => {
    const stats = getPersonalStats(member.id);
    return {
      ...member,
      attendanceCount: stats.attendanceCount,
      attendanceRate: stats.attendanceRate,
      totalDistance: stats.totalDistance
    };
  }).sort((a, b) => {
    // Primary: Attendance frequency (descending)
    if (b.attendanceCount !== a.attendanceCount) {
      return b.attendanceCount - a.attendanceCount;
    }
    // Secondary: Cumulative run distance in km (descending)
    return b.totalDistance - a.totalDistance;
  });
}

// Calculate attendance stats for a specific crew member
function getPersonalStats(memberId) {
  let checkedRuns = 0;
  let attendances = 0; // Counts attend and late
  let totalDistance = 0.0;

  state.runs.forEach(run => {
    const status = run.attendance[memberId];
    if (status && status !== 'none') {
      checkedRuns++;
      if (status === 'attend' || status === 'late') {
        attendances++;
        totalDistance += run.distance;
      }
    }
  });

  const attendanceRate = checkedRuns > 0 ? Math.round((attendances / checkedRuns) * 100) : 0;

  return {
    attendanceCount: attendances,
    attendanceRate,
    totalDistance
  };
}

// ==========================================================================
// 🛠️ DATE & DISPLAY CONVERTERS HELPER FUNCTIONS
// ==========================================================================
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateDDay(targetDateStr) {
  const today = new Date(getTodayString());
  const target = new Date(targetDateStr);
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = week[date.getDay()];
  return `${month}월 ${day}일 (${dayOfWeek})`;
}

function getPaceLabel(paceCode) {
  const paceMap = {
    'ALL': '전체공통',
    'A': 'A그룹 (4분대)',
    'B': 'B그룹 (5분대)',
    'C': 'C그룹 (6분대)',
    'D': 'D그룹 (7분+)'
  };
  return paceMap[paceCode] || paceCode;
}
