-- 수원러닝크루 (SRC) Row Level Security (RLS) 정의서

-- 1. RLS 적용을 위한 현재 사용자의 역할(Role) 확인용 헬퍼 함수
-- SECURITY DEFINER를 사용하여 RLS의 무한 재귀 참조(Recursion)를 효과적으로 방지합니다.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
DECLARE
    user_role_val public.user_role;
BEGIN
    SELECT role INTO user_role_val FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(user_role_val, 'WAITING'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. profiles 테이블 RLS 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2.1) SELECT: 본인 프로필은 상시 조회 가능, 타인 프로필은 정회원(REGULAR) 이상만 활성 유저에 한해 조회 가능 (어드민은 비활성 유저도 조회 가능)
CREATE POLICY select_profiles_policy ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id OR
        public.get_my_role() = 'ADMIN'::public.user_role OR
        (public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role) AND is_active = TRUE)
    );

-- 2.2) INSERT: 인증된 사용자가 본인의 프로필을 생성하는 것만 허용
CREATE POLICY insert_profiles_policy ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2.3) UPDATE: 
-- (a) 일반 유저는 본인 프로필만 수정 가능 (민감 필드인 role, is_active, is_exempted는 변경 불가하도록 제약)
-- (b) ADMIN은 모든 유저의 프로필을 무제한 수정 가능
CREATE POLICY update_profiles_policy ON public.profiles
    FOR UPDATE
    USING (
        auth.uid() = id OR 
        public.get_my_role() = 'ADMIN'::public.user_role
    )
    WITH CHECK (
        public.get_my_role() = 'ADMIN'::public.user_role OR (
            auth.uid() = id AND
            -- 일반 회원이 본인 프로필 수정 시 민감 필드 변경 금지 검증
            role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
            is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid()) AND
            is_exempted = (SELECT is_exempted FROM public.profiles WHERE id = auth.uid())
        )
    );


-- 3. locations 테이블 RLS 설정
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 3.1) SELECT: 정회원 이상은 모든 장소 조회 가능 (인증 글 작성 시 바인딩용)
CREATE POLICY select_locations_policy ON public.locations
    FOR SELECT
    USING (public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role, 'ADMIN'::public.user_role));

-- 3.2) ALL: 오직 ADMIN만 장소를 등록, 수정, 삭제 가능
CREATE POLICY admin_locations_policy ON public.locations
    FOR ALL
    USING (public.get_my_role() = 'ADMIN'::public.user_role)
    WITH CHECK (public.get_my_role() = 'ADMIN'::public.user_role);


-- 4. running_records 테이블 RLS 설정
ALTER TABLE public.running_records ENABLE ROW LEVEL SECURITY;

-- 4.1) SELECT: 정회원 이상 유저만 모든 인증 기록 조회 가능
CREATE POLICY select_running_records_policy ON public.running_records
    FOR SELECT
    USING (public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role, 'ADMIN'::public.user_role));

-- 4.2) INSERT:
-- (a) 일반 회원(REGULAR, PACER): 본인 기록만 삽입 가능 + 오늘 기준 30일 이내 날짜 조건 필수 검증
-- (b) 운영자(ADMIN): 타인 대리 작성 가능 + 소급 제한 없이 무기한 삽입 가능
CREATE POLICY insert_running_records_policy ON public.running_records
    FOR INSERT
    WITH CHECK (
        public.get_my_role() = 'ADMIN'::public.user_role OR (
            auth.uid() = user_id AND
            public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role) AND
            date >= (CURRENT_DATE - INTERVAL '30 days')
        )
    );

-- 4.3) UPDATE / DELETE:
-- (a) 일반 회원(REGULAR, PACER): 본인 기록만 수정/삭제 가능 + 작성 날짜가 30일 이내인 것만 수정 가능
-- (b) 운영자(ADMIN): 모든 기록에 대해 무제한 수정/삭제 가능
CREATE POLICY update_delete_running_records_policy ON public.running_records
    FOR ALL
    USING (
        public.get_my_role() = 'ADMIN'::public.user_role OR (
            auth.uid() = user_id AND
            public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role) AND
            date >= (CURRENT_DATE - INTERVAL '30 days')
        )
    )
    WITH CHECK (
        public.get_my_role() = 'ADMIN'::public.user_role OR (
            auth.uid() = user_id AND
            public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role) AND
            date >= (CURRENT_DATE - INTERVAL '30 days')
        )
    );


-- 5. marathon_pbs 테이블 RLS 설정
ALTER TABLE public.marathon_pbs ENABLE ROW LEVEL SECURITY;

-- 5.1) SELECT: 정회원 이상은 모든 크루원의 PB 기록 조회 가능
CREATE POLICY select_marathon_pbs_policy ON public.marathon_pbs
    FOR SELECT
    USING (public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role, 'ADMIN'::public.user_role));

-- 5.2) ALL:
-- (a) 정회원 이상: 본인 PB 기록만 생성, 수정, 삭제 가능
-- (b) 운영자(ADMIN): 모든 크루원의 PB에 대해 무제한 생성, 수정, 삭제 가능
CREATE POLICY manage_marathon_pbs_policy ON public.marathon_pbs
    FOR ALL
    USING (
        auth.uid() = user_id OR
        public.get_my_role() = 'ADMIN'::public.user_role
    )
    WITH CHECK (
        auth.uid() = user_id OR
        public.get_my_role() = 'ADMIN'::public.user_role
    );
