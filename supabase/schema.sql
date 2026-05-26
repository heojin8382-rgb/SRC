-- 수원러닝크루 (SRC) 데이터베이스 스키마 정의서

-- [클린 재설치 보장] 기존 트리거, 함수, 테이블, 타입 안전하게 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

DROP TABLE IF EXISTS public.marathon_pbs CASCADE;
DROP TABLE IF EXISTS public.running_records CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.marathon_category CASCADE;
DROP TYPE IF EXISTS public.run_type CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- 1. ENUM 타입 정의
CREATE TYPE public.user_role AS ENUM ('WAITING', 'REGULAR', 'PACER', 'ADMIN');
CREATE TYPE public.run_type AS ENUM ('PERSONAL', 'REGULAR');
CREATE TYPE public.marathon_category AS ENUM ('10K', 'Half', 'Full');

-- 2. 사용자 프로필 테이블 (profiles)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    kakao_id VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(100),                            -- 형식: "이름/출생년도/성별" (예: 홍길동/95/남)
    real_name VARCHAR(50),                             -- 실명 (온보딩 시 입력)
    birth_year INT,                                    -- 출생년도 (온보딩 시 입력, 예: 1995)
    gender VARCHAR(10),                                -- 성별 (온보딩 시 입력, 예: 남, 여)
    avatar_url TEXT,
    role public.user_role DEFAULT 'WAITING' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,          -- Soft Delete용 플래그
    is_exempted BOOLEAN DEFAULT FALSE NOT NULL,        -- 운영자 수동 면제 플래그 (월 초기화 대상 제외)
    is_onboarded BOOLEAN DEFAULT FALSE NOT NULL,       -- 첫 로그인 후 실명/출생년도/성별 입력 완료 여부
    can_view_admin BOOLEAN DEFAULT FALSE NOT NULL,     -- 어드민 전용창 조회 권한
    can_edit_admin BOOLEAN DEFAULT FALSE NOT NULL,     -- 어드민 전용창 수정 권한
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. 러닝 장소 테이블 (locations)
CREATE TABLE public.locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,          -- Soft Delete용 플래그
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 기본 러닝 장소 데이터 삽입 (대표 4개 지역)
INSERT INTO public.locations (name) VALUES 
('광교호수공원'),
('수원종합운동장'),
('만석공원'),
('신대호수공원')
ON CONFLICT (name) DO NOTHING;

-- 4. 러닝 기록 테이블 (running_records)
CREATE TABLE public.running_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    distance NUMERIC(3,1) NOT NULL CHECK (distance >= 3.0),
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL, -- 장소 삭제 시 NULL 처리 후 백업 텍스트 유지
    location_name VARCHAR(100) NOT NULL,               -- 장소 삭제 대비 스냅샷 저장
    date DATE NOT NULL CHECK (date <= CURRENT_DATE),   -- 미래 날짜 입력 불가
    type public.run_type NOT NULL,                     -- PERSONAL(개인런) 또는 REGULAR(벙)
    is_pacer BOOLEAN DEFAULT FALSE NOT NULL,           -- 페이싱 유무
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 추가 (월간 생존 연산 및 쿼리 최적화)
CREATE INDEX idx_running_records_user_date ON public.running_records(user_id, date);

-- 5. 마라톤 PB 테이블 (marathon_pbs)
CREATE TABLE public.marathon_pbs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category public.marathon_category NOT NULL,        -- 10K, Half, Full
    record_time VARCHAR(20) NOT NULL,                  -- 포맷: HH:MM:SS
    proof_url TEXT,                                    -- 인증 사진 또는 기록 확인용 링크
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 유저당 각 카테고리별로 단 하나의 PB만 존재 가능
    UNIQUE (user_id, category)
);

-- 6. updated_at 자동 갱신 트리거 및 헬퍼 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_running_records_updated_at
    BEFORE UPDATE ON public.running_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_marathon_pbs_updated_at
    BEFORE UPDATE ON public.marathon_pbs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. 카카오 신규 가입자 프로필 자동 생성 및 최초 가입자 ADMIN 지정 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INT;
    assigned_role public.user_role;
    kakao_id_val VARCHAR(255);
BEGIN
    -- profiles 테이블의 현재 정회원/운영자/대기자 수를 카운트
    SELECT COUNT(*) INTO user_count FROM public.profiles;

    -- 첫 번째 가입자라면 ADMIN 역할을, 그 외에는 WAITING(대기) 역할을 부여
    IF user_count = 0 THEN
        assigned_role := 'ADMIN'::public.user_role;
    ELSE
        assigned_role := 'WAITING'::public.user_role;
    END IF;

    -- 카카오 고유 ID 파싱 (auth.users 테이블의 raw_user_meta_data 혹은 sub 등에서 가져옴)
    kakao_id_val := COALESCE(
        NEW.raw_user_meta_data->>'sub', 
        (NEW.raw_app_meta_data->'provider_ids'->>0)::VARCHAR, 
        NEW.id::VARCHAR
    );

    -- 프로필 자동 삽입
    INSERT INTO public.profiles (
        id, 
        kakao_id, 
        nickname, 
        avatar_url, 
        role, 
        is_active, 
        is_exempted, 
        is_onboarded
    )
    VALUES (
        NEW.id,
        kakao_id_val,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '임시닉네임'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'profile_image'),
        assigned_role,
        TRUE,
        FALSE,
        FALSE -- 첫 로그인 후 반드시 온보딩 페이지(/setup-profile)를 거치도록 함
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 에 새 레코드 생성 후 작동하는 트리거
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
