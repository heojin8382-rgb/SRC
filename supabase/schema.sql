-- 수원러닝크루 (SRC) 데이터베이스 스키마 정의서

-- [클린 재설치 보장] 기존 트리거, 함수, 테이블, 타입 안전하게 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

DROP TABLE IF EXISTS public.gacha_items CASCADE;
DROP TABLE IF EXISTS public.suggestions CASCADE;
DROP TABLE IF EXISTS public.marathon_pbs CASCADE;
DROP TABLE IF EXISTS public.running_records CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.gacha_grade CASCADE;
DROP TYPE IF EXISTS public.suggestion_status CASCADE;
DROP TYPE IF EXISTS public.marathon_category CASCADE;
DROP TYPE IF EXISTS public.run_type CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- 1. ENUM 타입 정의
CREATE TYPE public.user_role AS ENUM ('WAITING', 'REGULAR', 'PACER', 'ADMIN');
CREATE TYPE public.run_type AS ENUM ('PERSONAL', 'REGULAR');
CREATE TYPE public.marathon_category AS ENUM ('10K', 'Half', 'Full');
CREATE TYPE public.suggestion_status AS ENUM ('PENDING', 'INVESTIGATING', 'COMPLETED', 'REJECTED');
CREATE TYPE public.gacha_grade AS ENUM ('LEGENDARY', 'EPIC', 'RARE', 'COMMON');

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
    show_pb BOOLEAN DEFAULT TRUE NOT NULL,             -- 마라톤 PB 공개 여부
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

-- 5-2. 건의사항 테이블 (suggestions)
CREATE TABLE public.suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
    image_url TEXT,
    status public.suggestion_status DEFAULT 'PENDING' NOT NULL,
    reply_content TEXT,
    reply_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5-3. 가챠 보상 아이템 테이블 (gacha_items)
CREATE TABLE public.gacha_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    grade public.gacha_grade NOT NULL,
    description TEXT NOT NULL,
    emoji VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 기본 가챠 보상 데이터(시드) 삽입
INSERT INTO public.gacha_items (name, grade, description, emoji) VALUES
('👑 [전설] 뷔페 식사권', 'LEGENDARY', '대박! 다음 정기 모임 뒤풀이 때 특급 호텔/패밀리 뷔페 식사권을 증정합니다. (크루 회비 또는 크루장 찬스!)', '🥩'),
('👑 [전설] 크루장과 1:1 티타임런', 'LEGENDARY', '크루장과 함께 가볍게 달리고, 크루장이 쏘는 고급 디저트와 커피 티타임을 함께 가집니다.', '☕'),
('🎈 [영웅] 커피쿠폰(아아)', 'EPIC', '축하합니다! 시원한 스타벅스 아이스 아메리카노 모바일 기프티콘을 드립니다.', '🥤'),
('🎈 [영웅] 원하는 페이서와 1:1 러닝', 'EPIC', '내가 지목한 페이서 크루원과 약속을 잡고 단둘이 원하는 속도와 코스로 1:1 리딩런을 뜁니다.', '🏃‍♂️'),
('🎈 [영웅] 벙 참석 시 인생샷 보정권', 'EPIC', '정기 벙 때 촬영된 사진 중 원하는 사진 한 장을 크루 공식 포토그래퍼가 화보급으로 보정해 드립니다.', '📸'),
('🩹 [희귀] 벙 때 개인 얼음컵 증정', 'RARE', '무더운 여름 정기 벙 때 시원한 얼음이 가득 찬 개인 얼음컵을 현장에서 스페셜 보급으로 드립니다!', '🧊'),
('🩹 [희귀] SRC 공식 러닝양말 증정', 'RARE', '쿠션감이 뛰어난 고성능 기능성 SRC 공식 크루 러닝 양말 1켤레를 즉시 지급해 드립니다.', '🧦'),
('🩹 [희귀] 일주일 부상 면제 생존권', 'RARE', '이번 주에 달리기 미션을 완수하지 못하더라도 생존 성공으로 인정되는 수동 부상 면제권을 적용해 드립니다.', '🩹'),
('🩹 [희귀] 정기 벙 간식/음료 선택권', 'RARE', '다음 벙 종료 후 제공되는 보급 음료나 간식 메뉴의 종류와 브랜드를 당첨자가 전적으로 결정합니다.', '🍪'),
('👟 [건강한 꽝] 오늘 인증 거리 +100m 보너스 런', 'COMMON', '아쉽게도 꽝입니다! 하지만 러너답게 오늘 달릴 목표 거리에서 100m를 보너스로 더 달리고 오세요! 🏃‍♂️', '🏃‍♀️'),
('🙌 [유쾌한 꽝] 벙 집결지 하이파이브 인간 환영대', 'COMMON', '다음 벙 때 집결지 입구에 서서 도착하는 모든 크루원들과 하이파이브를 하며 에너제틱하게 환영해 주세요!', '🙌'),
('✍️ [유쾌한 꽝] 단톡방에 크루원 1명 지목해서 칭찬 3줄 쓰기', 'COMMON', '크루 단체 단톡방에 오늘 고생한 크루원 중 한 명을 지목하여 고마움이나 칭찬의 글을 3줄 작성해 보세요.', '💬'),
('🙇 [유쾌한 꽝] 다음 벙 종료 후 운영진에게 감사 인사하기', 'COMMON', '벙 준비로 항상 애쓰는 운영진 크루원에게 다가가 "항상 고생하십니다! 덕분에 잘 뜁니다"라며 따뜻한 감사를 전하세요.', '🤝'),
('🤳 [유쾌한 꽝] 단체사진 찍을 때 맨 앞줄 정중앙 포즈 취하기', 'COMMON', '다음 러닝 종료 후 단체 사진 촬영 시 무조건 가장 앞줄 중앙에 자리를 잡고 당당하고 유쾌한 시그니처 포즈를 취해 보세요!', '📸'),
('🏃 [유쾌한 꽝] 다음 벙에서 페이서 바로 뒤 밀착 마크런', 'COMMON', '페이스 메이커를 신뢰하세요! 다음 벙 러닝 때 지정된 페이서의 바로 뒷자리에서 1m 간격을 유지하며 끝까지 따라가 봅니다.', '👣'),
('🥤 [유쾌한 꽝] 벙 끝난 후 물 보급소 종이컵 정리 돕기', 'COMMON', '지구를 지키는 친환경 러너! 다음 모임 종료 후 생수 보급소의 빈 종이컵과 플라스틱 병 수거를 적극적으로 도와주세요.', '🗑️'),
('📢 [유쾌한 꽝] 다음 벙 자기소개 때 가장 우렁차게 말하기', 'COMMON', '크루원들에게 강렬한 인상을! 다음 벙 시작 전 자기소개 시간에 가장 먼저 손을 들고 씩씩하고 크게 자기소개를 시작하세요.', '📢');

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

CREATE TRIGGER update_suggestions_updated_at
    BEFORE UPDATE ON public.suggestions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_gacha_items_updated_at
    BEFORE UPDATE ON public.gacha_items
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
