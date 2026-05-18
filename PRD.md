# 제품 요구사항 정의서 (PRD) - 수원러닝크루 (SRC)

---

## 1. 프로젝트 개요 (Project Overview)
**수원러닝크루(SRC)** 멤버들의 러닝 기록 인증, 마라톤 PB(Personal Best) 관리, 그리고 월간 생존(활동) 여부를 자동으로 계산하고 시각화해주는 **모바일 최적화 웹 애플리케이션**입니다. 
기존의 수동 엑셀 취합이나 카카오톡 공지 인증 방식에서 벗어나, 데이터 기반의 자동화된 월간 생존 여부 판단과 투명한 기록 관리 시스템을 구축하여 크루원들의 러닝 동기부여와 운영진의 관리 리소스를 획기적으로 절감하는 것을 목표로 합니다.

---

## 2. 기술 스택 (Tech Stack)
*   **Framework**: Next.js 14+ (App Router 기반)
*   **Backend / DB / Auth**: Supabase (PostgreSQL) - Row Level Security (RLS) 보안 정책 적용
*   **Styling & UI**: Tailwind CSS, shadcn/ui (Radix UI 기반, 모바일 반응형 최적화)
*   **Deployment**: Vercel

---

## 3. 기능 요구사항 정의 (Functional Requirements)

### 3.1. 인증 및 회원 상태 관리 (Authentication & Role System)

```
[가입 완료] ──(최초 상태)──> [WAITING (대기)]
                                │
                        (운영자 승인)
                                │
                                ▼
                       [REGULAR (정회원)] ──(운영자 지정)──> [PACER (페이서)]
                                │
                        (운영자 권한부여)
                                │
                                ▼
                       [ADMIN (운영자)]
```

#### 1) 카카오톡 간편 로그인 단일화
*   **단일 로그인**: 이메일/비밀번호, 구글, 네이버 등 타 가입 수단은 **철저하게 배제**하며, 오직 **Supabase Auth의 카카오(Kakao) 소셜 로그인**으로만 가입 및 로그인을 수행합니다.
*   **회원가입 절차**:
    1.  사용자가 카카오 로그인 버튼 클릭.
    2.  카카오 계정 인증 후 앱으로 리다이렉트.
    3.  최초 로그인 시 `profiles` 테이블에 기본 정보(카카오 고유 ID, 닉네임, 프로필 이미지 등)가 생성되며, 권한 레벨은 즉시 `WAITING`으로 설정됩니다.

#### 2) 권한 레벨 (Role System)
*   **WAITING (대기)**:
    *   최초 카카오 가입 직후 부여되는 기본 상태.
    *   **접근 권한**: 대기 화면(승인 대기 중 안내 페이지) 외에 **어떠한 앱 기능(인증 등록, 조회 등)도 사용 불가능**.
*   **REGULAR (정회원)**:
    *   운영자(ADMIN)의 승인을 거쳐 활성화된 일반 회원 상태.
    *   **접근 권한**: 본인의 러닝 기록 등록/수정/삭제(CRUD), 마라톤 PB 관리, 본인 및 타인의 기록/누적 거리 조회 가능.
    *   **민감 정보 제한**: 타 크루원의 연락처나 실명 등 민감 정보는 마스킹 처리하거나 노출되지 않도록 차단.
*   **PACER (페이서)**:
    *   정회원의 모든 권한 보유.
    *   **시각적 특권**: 회원 목록 및 대시보드 상에서 페이서 전용 이모티콘(예: 🎈)이 닉네임 옆에 직관적으로 표시됨 (운영자가 승인 및 임명).
*   **ADMIN (운영자)**:
    *   시스템의 모든 권한을 가진 관리자 (시스템 내 최소 1명 필수 유지).
    *   **접근 권한**: 
        *   가입 대기자(WAITING) 승인 및 거절.
        *   회원 강퇴(비활성화) 및 면제(Exemption) 처리.
        *   모든 회원 정보 열람(민감 정보 포함), 장소 데이터 관리(추가/수정/삭제).
        *   모든 회원의 인증 기록 수정 및 삭제 권한.

#### 3) Soft Delete 정책 및 데이터 복구 메커니즘
*   **사용자 비활성화 (Soft Delete)**:
    *   회원 탈퇴 또는 강퇴 시 DB에서 레코드를 실제 삭제(`Hard Delete`)하지 않고, `is_active = false` 상태로 변경합니다.
    *   **복구 시나리오**: 비활성화된 사용자가 추후 카카오 계정으로 다시 로그인하여 운영자의 재승인을 받으면, 기존의 누적 거리 기록, 이전 러닝 기록, 마라톤 PB가 유실 없이 **그대로 복구**되어야 합니다.
*   **장소 데이터 Soft Delete**:
    *   운영자가 특정 러닝 장소를 리스트에서 삭제하더라도, 해당 장소로 이미 등록된 크루원들의 과거 인증 기록 내 장소 텍스트가 깨지거나 `null`로 변해서는 안 됩니다.
    *   **해결 방식**: 
        *   `locations` 테이블에 `is_active = false` 필드를 두어 드롭다운 목록에서만 제외 처리(Soft Delete)하거나,
        *   `running_records` 테이블에 인증 등록 시점의 장소명(`location_name`)을 **스냅샷(text)** 형태로 직접 저장합니다. (본 PRD에서는 데이터 무결성을 위해 **두 방식을 병합 적용**하여 설계합니다.)

---

## 4. 러닝 인증 시스템 (Running Verification System)

#### 1) 인증 폼 (Form) 필수 입력 항목 및 검증 규칙
*   **거리 (Distance)**: 소수점 첫째 자리까지 입력 가능 (`numeric(3,1)`). **최소값 3.0km 이상** 필수 입력 제한 (3.0km 미만 시 제출 불가).
*   **장소 (Location)**: 셀렉트 박스(Dropdown). ADMIN이 등록하고 관리하는 장소 테이블(`locations`) 내 활성화된 장소 리스트에서 필수 선택.
*   **날짜 (Date)**: Date Picker 형태. 기본값은 **오늘**. 단, **미래의 날짜는 선택 불가능**하도록 제약.
*   **인증 종류 (Running Type)**: 
    *   `PERSONAL` (개인런) 또는 `REGULAR` (정식 벙) 중 필수 선택.
*   **페이싱 유무 (Is Pacer)**:
    *   본인이 해당 런(특히 정식 벙)에서 페이서 역할을 했는지 체크하는 Boolean 필드 (선택 입력).

#### 2) 권한별 날짜 소급 제한 (Date Restriction)
*   **일반 회원 (REGULAR / PACER)**: 오늘 기준 **최대 30일 전**의 날짜까지만 소급 입력 가능. (30일 초과 과거 날짜 선택 및 입력 차단)
*   **운영자 (ADMIN)**: 과거 날짜에 대한 제한 없이 **무기한 소급 입력 가능**.

#### 3) 수정 및 삭제 권한
*   본인이 작성한 인증 기록은 마이페이지 또는 상세 뷰에서 본인이 **직접 수정 및 삭제** 가능.
*   ADMIN은 **본인 여부와 상관없이 모든 크루원의 기록을 수정/삭제** 가능.

---

## 5. 마라톤 PB (Marathon PB) 관리 시스템
*   **관리 종목**: **10K**, **Half**, **Full** 세 가지 고정 카테고리.
*   **데이터 모델**: 사용자별 카테고리당 1개의 레코드만 가질 수 있도록 제한 (Unique constraint: `user_id, category`).
*   **수정 권한**: 오직 **기록 소유자 본인** 및 **ADMIN**만 해당 PB 데이터를 등록, 수정 및 삭제할 수 있습니다.

---

## 6. 월간 생존(Survival) 핵심 비즈니스 로직

매월 1일 00:00:00 기준 과거 데이터에 영향을 주지 않으면서 대시보드 뷰와 계산 알고리즘이 갱신됩니다.

### 6.1. 생존 조건 계산 알고리즘 (Rule 1 ~ 3)

```mermaid
flowchart TD
    A[한 달간 유저의 러닝 기록 조회] --> B[Rule 1: 동일 날짜의 여러 기록을 하나로 병합]
    B --> C{동일 날짜에\nPERSONAL과 REGULAR\n모두 존재하는가?}
    C -- Yes --> D[Rule 2: 해당 일자는 REGULAR 1회로 카운트]
    C -- No --> E[기록된 타입 그대로 카운트]
    D --> F[최종 집계: REGULAR 일수 & PERSONAL 일수 계산]
    E --> F
    F --> G{조건 A 만족?\nREGULAR >= 1\nAND\n총 인증 일수 >= 2}
    G -- Yes --> H[생존 처리 (SURVIVED)]
    G -- No --> I{조건 B 만족?\nPERSONAL 일수 >= 6}
    I -- Yes --> H
    I -- No --> J[사망 처리 (DEAD)]
```

*   **[Rule 1] 1일 1회 카운트 제한**:
    *   하루에 2회 이상 인증 글을 올려도, 일별 활동 여부를 따질 때는 **단 1회 인증**한 것으로 병합하여 계산합니다.
*   **[Rule 2] 벙(REGULAR) 우선순위**:
    *   동일한 날짜에 `PERSONAL` 인증 기록과 `REGULAR` 인증 기록이 모두 존재할 경우, 해당 일자는 **`REGULAR` 참여 1회**로 합산 처리합니다.
*   **[Rule 3] 최종 생존 조건 판정**:
    *   **조건 A**: 해당 월의 총 인증 일수가 **2일 이상**이면서, 이 중 `REGULAR` 인증 일수가 **최소 1일 이상**인 경우.
    *   **조건 B**: 벙 참석 없이, 해당 월의 총 `PERSONAL` 인증 일수만으로 **6일 이상** 채운 경우.
    *   👉 **조건 A 또는 조건 B 중 하나라도 만족하면 이번 달 '생존(SURVIVED)' 처리**.

### 6.2. 상태 면제 (Exemption) 처리
*   **정의**: 부상, 장기 출장 등의 불가피한 사유가 있는 멤버의 경우, ADMIN이 회원의 생존 의무 상태를 **'면제(EXEMPTED)'**로 설정할 수 있습니다.
*   **동작 방식**: 
    *   면제 상태는 **월이 바뀌어도 자동으로 해제되지 않으며**, ADMIN이 수동으로 정상 상태로 복구하기 전까지 무기한 유지됩니다.
    *   면제 상태의 유저가 인증 횟수가 0회라 하더라도 생존 대시보드에서 **'면제(EXEMPTED)'** 상태로 표기되며 탈락 대상에서 제외됩니다.

---

## 7. 데이터베이스 스키마 설계 (Database Schema)

### 7.1. Table Schema (PostgreSQL)

#### 1) 사용자 프로필 테이블 (`profiles`)
```sql
CREATE TYPE user_role AS ENUM ('WAITING', 'REGULAR', 'PACER', 'ADMIN');

CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    kakao_id VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'WAITING' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,    -- Soft Delete 플래그
    is_exempted BOOLEAN DEFAULT FALSE NOT NULL, -- 운영자 수동 면제 여부
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### 2) 러닝 장소 테이블 (`locations`)
```sql
CREATE TABLE locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,    -- 장소 Soft Delete 플래그
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### 3) 러닝 기록 테이블 (`running_records`)
```sql
CREATE TYPE run_type AS ENUM ('PERSONAL', 'REGULAR');

CREATE TABLE running_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    distance NUMERIC(3,1) NOT NULL CHECK (distance >= 3.0),
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL, -- Soft Delete 대비
    location_name VARCHAR(100) NOT NULL, -- 장소 삭제 대비 스냅샷 텍스트 저장
    date DATE NOT NULL CHECK (date <= CURRENT_DATE),
    type run_type NOT NULL,
    is_pacer BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 추가 (월간 생존 연산 속도 최적화)
CREATE INDEX idx_running_records_user_date ON running_records(user_id, date);
```

#### 4) 마라톤 PB 테이블 (`marathon_pbs`)
```sql
CREATE TYPE marathon_category AS ENUM ('10K', 'Half', 'Full');

CREATE TABLE marathon_pbs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category marathon_category NOT NULL,
    record_time VARCHAR(20) NOT NULL, -- HH:MM:SS 포맷 텍스트 저장
    proof_url TEXT, -- 인증 사진 혹은 가민 링크
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 유저 한 명당 종목별 단 하나의 PB만 보존
    UNIQUE (user_id, category)
);
```

---

### 7.2. Row Level Security (RLS) 규칙 정의

보안 및 권한 관리를 위해 Supabase RLS 정책을 강제합니다.

#### 1) `profiles` 테이블 RLS
*   **전체 활성화**: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
*   **SELECT (조회)**:
    *   본인의 프로필은 항상 조회 가능.
    *   `role`이 `'REGULAR'`, `'PACER'`, `'ADMIN'`인 멤버만 타인의 프로필(민감 정보 제외 닉네임, 아바타, 롤 등)을 조회 가능.
*   **INSERT (생성)**:
    *   인증된(authenticated) 사용자만 본인 UUID로 프로필 레코드 생성 가능.
*   **UPDATE (수정)**:
    *   본인 프로필은 아바타, 닉네임 등 제한된 필드만 수정 가능.
    *   `role`, `is_active`, `is_exempted` 필드는 오직 **ADMIN** 역할군만 수정 가능.

#### 2) `running_records` 테이블 RLS
*   **전체 활성화**: `ALTER TABLE running_records ENABLE ROW LEVEL SECURITY;`
*   **SELECT (조회)**:
    *   `role`이 `'REGULAR'`, `'PACER'`, `'ADMIN'`인 멤버만 모든 레코드 조회 가능 (대기 상태 회원은 조회 불가).
*   **INSERT (생성)**:
    *   본인 레코드만 추가 가능 (`auth.uid() = user_id`).
    *   `role`이 `'REGULAR'` 혹은 `'PACER'`인 경우: 오늘 기준으로 `date >= CURRENT_DATE - INTERVAL '30 days'` 조건 필수 검증.
    *   `role`이 `'ADMIN'`인 경우: 날짜 제한 없이 삽입 가능.
*   **UPDATE / DELETE (수정 및 삭제)**:
    *   본인 작성 기록에 한하여 수정/삭제 가능.
    *   `role`이 `'ADMIN'`인 경우 모든 사용자의 기록에 대해 무제한 수정/삭제 가능.

#### 3) `locations` 테이블 RLS
*   **전체 활성화**: `ALTER TABLE locations ENABLE ROW LEVEL SECURITY;`
*   **SELECT (조회)**:
    *   `role`이 `'REGULAR'`, `'PACER'`, `'ADMIN'`인 유저에게 노출 (드롭다운 바인딩용).
*   **INSERT / UPDATE / DELETE**:
    *   오직 **ADMIN** 역할군만 권한 부여.

---

## 8. 시스템 아키텍처 및 폴더 구조 (Next.js)

### 8.1. 폴더 구조 (App Router)
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/                # 카카오톡 로그인 단일 페이지
│   │   └── auth-callback/        # Supabase OAuth 콜백 라우트
│   ├── (dashboard)/
│   │   ├── page.tsx              # 메인 생존 현황 대시보드
│   │   ├── record/               # 러닝 인증 등록 Form 페이지
│   │   ├── members/              # 크루원 목록 및 랭킹 뷰
│   │   └── profile/              # 마이페이지 & 마라톤 PB 관리
│   ├── admin/                    # ADMIN 전용 관리 페이지 (승인, 장소, 기록 편집)
│   │   ├── page.tsx
│   │   └── layout.tsx            # Admin 권한 체크 미들웨어성 레이아웃
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── layout/
│   │   ├── bottom-nav.tsx        # 모바일 하단 플로팅 네비게이션
│   │   └── header.tsx
│   └── survival/
│       ├── survival-card.tsx     # 생존 진행도 시각화 카드
│       └── pb-manager.tsx        # PB 10K/Half/Full 수정 컴포넌트
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 클라이언트 컴포넌트용 Supabase 인스턴스
│   │   └── server.ts             # 서버 컴포넌트 / Server Action용 Supabase 인스턴스
│   └── utils/
│       └── survival.ts           # 월간 생존 계산 유틸 함수 (Rule 1~3 적용)
```

---

## 9. UI/UX 디자인 가이드라인 (Mobile-First)

### 9.1. 레이아웃 및 뷰포트
*   **모바일 반응형 최적화**: 웹 브라우저에서도 모바일 화면비(최대 가로 너비 `480px` 임계치 지정 및 중앙 정렬)로 렌더링되도록 디자인.
*   **하단 네비게이션**: 네이티브 앱과 같은 편안함을 제공하기 위해 화면 하단에 고정된 Bottom Navigation Bar 적용 (대시보드, 기록인증, 크루원 PB, 마이페이지).

### 9.2. 디자인 테마 (Aesthetics)
*   **컬러 팔레트**: Sleek Dark Mode 기반에 러닝 에너지를 상징하는 형광 라임(Neon Volt) 또는 생동감 있는 아쿠아 블루를 Accent 컬러로 사용.
    *   **Background**: Deep Slate (`#0B0F19`)
    *   **Card Background**: Dark Navy / Glassmorphic CSS (`#1E293B` + 반투명 블러)
    *   **Accent Color**: Neon Volt Lime (`#D4FF3F`) 또는 Aqua (`#06B6D4`)
    *   **Warning/Inactive Color**: Coral Red (`#F43F5E`) & Muted Grey (`#64748B`)
*   **시각 효과 (Micro-animations)**:
    *   생존 달성 시 테두리에 영롱한 **Neon Volt 그라데이션 보더 효과** 적용.
    *   버튼 클릭 및 인증 폼 작성 완료 시 가벼운 스케일 업 다운 전환 효과.

### 9.3. 핵심 화면 레이아웃 와이어프레임 기획

#### 1) 메인 생존 대시보드 (`/page.tsx`)
```
┌────────────────────────────────────────┐
│  SRC RUNNING CREW             [Admin⚙️]│ <-- 상단 헤더
├────────────────────────────────────────┤
│  ⚡️ 이번 달 나의 생존 리포트           │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │   STATUS: [ 🔥 생존 완료 ]        │  │ <-- 생존 시 Volt Lime 빛나는 카드
│  │                                  │  │
│  │   • 이번 달 총 달린 거리: 42.5 km │  │
│  │   • 유효 인증 일수: 5 일          │  │
│  │                                  │  │
│  │   [ 벙(REGULAR): 2회 | 개인: 3회 ]│  │
│  │   ------------------------------ │  │
│  │   • 목표 달성율                  │  │
│  │   [████████████████████] 100%    │  │ <-- 게이지 바 애니메이션
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  🏃 최근 크루원 실시간 인증 피드       │
│  • 김러닝 님 | 5.2km | 광교호수공원 🔥 │
│  • 이페이서🎈| 8.0km | 수원종합운동장 ⚡️│
└────────────────────────────────────────┘
```

#### 2) 러닝 인증 등록 폼 (`/record/page.tsx`)
```
┌────────────────────────────────────────┐
│  ◀  러닝 인증 기록                    │
├────────────────────────────────────────┤
│  * 러닝 거리 (최소 3.0km)              │
│  [ 5.5               ] km  (소수점 1자리)│
│                                        │
│  * 달린 장소                           │
│  [ 광교호수공원                  ▼ ]   │ <-- ADMIN 등록 활성화 목록
│                                        │
│  * 인증 날짜                           │
│  [ 2026.05.18                    📅 ]   │ <-- 미래 불가, 일반 30일 이내
│                                        │
│  * 인증 종류                           │
│  (🔘 개인런 PERSONAL )  (   정식벙 REGULAR)│
│                                        │
│  [ ] 페이서(PACER)로 봉사했습니다.      │ <-- Boolean 토글
│                                        │
│  ┌──────────────────────────────────┐  │
│  │       [ ⚡️ 인증 등록하기 ]        │  │ <-- 폼 검증 만족 시 Volt Lime 활성화
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## 10. 상세 개발 액션 아이템 (AI Coding Checklist)

1.  **Supabase 프로젝트 설정**:
    *   `profiles`, `locations`, `running_records`, `marathon_pbs` DB 스키마 셋업.
    *   가입/탈퇴/승인 관련 트리거 함수 구축.
    *   위 명시된 RLS Policy 적용 및 타인 민감 정보 마스킹 뷰 설정.
2.  **카카오 간편 로그인 연동**:
    *   카카오 개발자 센터 애플리케이션 등록 및 Redirect URI 셋업.
    *   Supabase Auth Kakao Provider 바인딩 진행.
3.  **Next.js UI & 컴포넌트 빌드**:
    *   기본 테마 설정 및 다크모드 적용 (`index.css` & Tailwind config).
    *   모바일 하단 Bottom Nav 및 모바일 쉘(Shell) 구성.
    *   shadcn/ui 기반 Form, DatePicker, Select, Card 구현.
4.  **핵심 유틸 함수 구현**:
    *   월간 생존 조건(Rule 1~3) 연산 유틸 함수 구현.
    *   유효성 검증(3km 이상, 미래날짜 차단, 30일 소급 등) 스키마 추가 (Zod 기반).
5.  **Admin 전용 기능 구현**:
    *   대기자 승인 토글 스위치, 크루원 면제 상태 수동 제어판 구축.
