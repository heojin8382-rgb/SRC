-- ====================================================
-- SRC (수원러닝크루) 데이터베이스 마이그레이션 SQL 스크립트
-- ====================================================

-- 1. 러닝 기록 테이블에 인증 이미지 URL 컬럼 추가
ALTER TABLE public.running_records ADD COLUMN IF NOT EXISTS proof_image_url TEXT;

-- 2. 러닝 기록 좋아요(화이팅) 테이블 생성
CREATE TABLE IF NOT EXISTS public.running_record_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    record_id UUID REFERENCES public.running_records(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (record_id, user_id)
);

-- RLS 활성화
ALTER TABLE public.running_record_likes ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
DROP POLICY IF EXISTS select_likes_policy ON public.running_record_likes;
CREATE POLICY select_likes_policy ON public.running_record_likes
    FOR SELECT
    USING (public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role, 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS insert_likes_policy ON public.running_record_likes;
CREATE POLICY insert_likes_policy ON public.running_record_likes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role, 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS delete_likes_policy ON public.running_record_likes;
CREATE POLICY delete_likes_policy ON public.running_record_likes
    FOR DELETE
    USING (auth.uid() = user_id);


-- 3. 러닝 기록 댓글 테이블 생성
CREATE TABLE IF NOT EXISTS public.running_record_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    record_id UUID REFERENCES public.running_records(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comment_text TEXT NOT NULL CHECK (char_length(comment_text) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS 활성화
ALTER TABLE public.running_record_comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
DROP POLICY IF EXISTS select_comments_policy ON public.running_record_comments;
CREATE POLICY select_comments_policy ON public.running_record_comments
    FOR SELECT
    USING (public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role, 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS insert_comments_policy ON public.running_record_comments;
CREATE POLICY insert_comments_policy ON public.running_record_comments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.get_my_role() IN ('REGULAR'::public.user_role, 'PACER'::public.user_role, 'ADMIN'::public.user_role));

DROP POLICY IF EXISTS delete_comments_policy ON public.running_record_comments;
CREATE POLICY delete_comments_policy ON public.running_record_comments
    FOR DELETE
    USING (auth.uid() = user_id OR public.get_my_role() = 'ADMIN'::public.user_role);
