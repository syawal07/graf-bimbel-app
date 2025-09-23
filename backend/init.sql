-- =================================================================
-- SKRIP DATABASE FINAL UNTUK APLIKASI GRAF BIMBEL
-- Versi ini mendukung: Multi-mentor, Siswa Harian, Payroll, dan semua fitur lainnya.
-- =================================================================

-- Selalu mulai dengan menghapus tabel lama dalam urutan terbalik untuk menghindari error dependency
DROP TABLE IF EXISTS public.app_settings CASCADE; 
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.user_announcement_status CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.hero_slides CASCADE;
DROP TABLE IF EXISTS public.site_settings CASCADE;
DROP TABLE IF EXISTS public.faqs CASCADE;
DROP TABLE IF EXISTS public.advantages CASCADE;
DROP TABLE IF EXISTS public.mentor_weekly_schedules CASCADE;
DROP TABLE IF EXISTS public.mentor_profiles CASCADE;
DROP TABLE IF EXISTS public.session_reports CASCADE;
DROP TABLE IF EXISTS public.payroll_history CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.user_package_mentors CASCADE;
DROP TABLE IF EXISTS public.user_packages CASCADE;
DROP TABLE IF EXISTS public.packages CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE; 
DROP TABLE IF EXISTS public.users CASCADE;


-- ===============================================================
-- Tabel 1: USERS (Pengguna)
-- ===============================================================
CREATE TABLE public.users (
    user_id           SERIAL PRIMARY KEY,
    full_name         VARCHAR(100) NOT NULL,
    email             VARCHAR(100) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    phone_number      VARCHAR(20),
    nickname          VARCHAR(50),
    city              VARCHAR(100),
    school            VARCHAR(100),
    notes             TEXT,
    role              VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'mentor', 'siswa')),
    payment_type      VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (payment_type IN ('monthly', 'daily')),
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

\echo 'Tabel "users" berhasil dibuat.'


-- ===============================================================
-- Tabel 2: PACKAGES (Definisi Paket)
-- ===============================================================
CREATE TABLE public.packages (
    package_id        SERIAL PRIMARY KEY,
    package_name      VARCHAR(100) NOT NULL,
    description       TEXT,
    price             NUMERIC(12,2) NOT NULL,
    total_sessions    INTEGER NOT NULL,
    duration_days     INTEGER NOT NULL,
    curriculum        VARCHAR(50),
    is_active         BOOLEAN DEFAULT TRUE
);

\echo 'Tabel "packages" berhasil dibuat.'


-- ===============================================================
-- Tabel 3: USER_PACKAGES (Paket yang Dibeli Siswa)
-- ===============================================================
CREATE TABLE public.user_packages (
    user_package_id         SERIAL PRIMARY KEY,
    student_id              INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    package_id              INTEGER NOT NULL REFERENCES public.packages(package_id) ON DELETE RESTRICT,
    purchase_date           TIMESTAMPTZ DEFAULT NOW(),
    activation_date         TIMESTAMPTZ,
    expiry_date             TIMESTAMPTZ,
    total_sessions          INTEGER NOT NULL,
    used_sessions           INTEGER NOT NULL DEFAULT 0,
    status                  VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished', 'expired')),
    schedule_recommendation TEXT,
    is_hidden_by_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden_by_student    BOOLEAN NOT NULL DEFAULT FALSE
);

\echo 'Tabel "user_packages" (multi-mentor) berhasil dibuat.'


-- ===============================================================
-- Tabel 4: USER_PACKAGE_MENTORS (Penugasan Multi-Mentor)
-- ===============================================================
CREATE TABLE public.user_package_mentors (
    user_package_mentor_id  SERIAL PRIMARY KEY,
    user_package_id         INTEGER NOT NULL REFERENCES public.user_packages(user_package_id) ON DELETE CASCADE,
    mentor_id               INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    session_rate            NUMERIC(10, 2) NOT NULL,
    assignment_type         VARCHAR(20) NOT NULL DEFAULT 'utama' CHECK (assignment_type IN ('utama', 'cadangan')),
    UNIQUE (user_package_id, mentor_id)
);

COMMENT ON TABLE public.user_package_mentors IS 'Menghubungkan paket siswa dengan satu/lebih mentor, tarif, dan tipe penugasan.';
\echo 'Tabel baru "user_package_mentors" berhasil dibuat.'


-- ===============================================================
-- Tabel 5: PAYMENTS (Pembayaran)
-- ===============================================================
CREATE TABLE public.payments (
    payment_id            SERIAL PRIMARY KEY,
    user_package_id       INTEGER NOT NULL REFERENCES public.user_packages(user_package_id) ON DELETE CASCADE,
    student_id            INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    amount                NUMERIC(12,2) NOT NULL,
    payment_proof_url     TEXT,
    payment_date          TIMESTAMPTZ DEFAULT NOW(),
    status                VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verified_by           INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    verified_at           TIMESTAMPTZ,
    is_deleted_by_admin   BOOLEAN DEFAULT FALSE
);

\echo 'Tabel "payments" berhasil dibuat.'


-- ===============================================================
-- Tabel 6: SCHEDULES (Jadwal Sesi)
-- ===============================================================
CREATE TABLE public.schedules (
    schedule_id           SERIAL PRIMARY KEY,
    user_package_id       INTEGER REFERENCES public.user_packages(user_package_id) ON DELETE SET NULL,
    student_id            INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    mentor_id             INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    session_datetime      TIMESTAMPTZ NOT NULL,
    duration_minutes      INTEGER DEFAULT 90,
    zoom_link             TEXT,
    mapel                 VARCHAR(100),
    session_rate          NUMERIC(10, 2),
    status                VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    hidden_from_payroll   BOOLEAN DEFAULT FALSE,
    hidden_by_student     BOOLEAN DEFAULT FALSE,
    hidden_by_mentor      BOOLEAN DEFAULT FALSE,
    hidden_by_admin       BOOLEAN DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.schedules.user_package_id IS 'Bisa NULL jika ini adalah sesi untuk siswa harian (non-paket).';
COMMENT ON COLUMN public.schedules.mentor_id IS 'Sumber kebenaran untuk payroll. ID mentor yang mengajar sesi ini.';
CREATE INDEX idx_schedules_mentor_id ON public.schedules(mentor_id);

\echo 'Tabel "schedules" (siswa harian) berhasil dibuat.'

-- ===============================================================
-- [BARU] Tabel 19: PAYROLL_HISTORY (Riwayat Transaksi Gaji)
-- ===============================================================
CREATE TABLE public.payroll_history (
    batch_id                SERIAL PRIMARY KEY,
    payment_date            TIMESTAMPTZ DEFAULT NOW(),
    paid_by_admin_id        INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    payment_type            VARCHAR(20) NOT NULL CHECK (payment_type IN ('monthly', 'daily')),
    period_start_date       DATE NOT NULL,
    period_end_date         DATE NOT NULL,
    total_mentors_paid      INTEGER NOT NULL,
    total_sessions_paid     INTEGER NOT NULL,
    total_amount_paid       NUMERIC(12, 2) NOT NULL,
    details                 JSONB,
    is_hidden_by_admin      BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE public.payroll_history IS 'Mencatat setiap kejadian pembayaran gaji (batch payment) oleh admin.';
\echo 'Tabel "payroll_history" berhasil dibuat.'

-- ===============================================================
-- Tabel 7: SESSION_REPORTS (Laporan Sesi)
-- ===============================================================
CREATE TABLE public.session_reports (
    report_id                 SERIAL PRIMARY KEY,
    schedule_id               INTEGER NOT NULL REFERENCES public.schedules(schedule_id) ON DELETE CASCADE,
    mentor_id                 INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    summary                   TEXT NOT NULL,
    student_development_journal TEXT,
    student_attended          BOOLEAN NOT NULL DEFAULT TRUE,
    material_url              TEXT,
    verified_by_admin         BOOLEAN DEFAULT FALSE,
    verified_at               TIMESTAMPTZ, 
    is_deleted_by_admin       BOOLEAN DEFAULT FALSE,
    payroll_status            VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payroll_status IN ('unpaid', 'paid')),
    paid_by_admin_id          INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    paid_at                   TIMESTAMPTZ,
    payroll_batch_id          INTEGER REFERENCES public.payroll_history(batch_id) ON DELETE SET NULL,
    created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_mentor_id ON public.session_reports(mentor_id);
\echo 'Tabel "session_reports" berhasil dibuat dengan kolom baru.'



-- ===============================================================
-- Tabel 8: MENTOR_PROFILES (Profil Detail Mentor)
-- ===============================================================
CREATE TABLE public.mentor_profiles (
    profile_id              SERIAL PRIMARY KEY,
    mentor_id               INTEGER NOT NULL UNIQUE REFERENCES public.users(user_id) ON DELETE CASCADE,
    date_of_birth           DATE,
    gender                  VARCHAR(20),
    domicile                VARCHAR(255),
    profile_picture_url     TEXT,
    last_education          VARCHAR(100),
    major                   VARCHAR(100),
    expert_subjects         TEXT[],
    teachable_levels        TEXT[],
    teaching_experience     TEXT,
    certificate_url         TEXT,
    availability            TEXT,
    max_teaching_hours      INTEGER,
    teaching_mode           VARCHAR(50),
    bank_account_number     VARCHAR(50),
    bank_name               VARCHAR(50),
    id_card_number          VARCHAR(50)
);

\echo 'Tabel "mentor_profiles" berhasil dibuat.'


-- ===============================================================
-- Tabel 9: MENTOR_WEEKLY_SCHEDULES (Jadwal Tetap Mentor)
-- ===============================================================
CREATE TABLE public.mentor_weekly_schedules (
    weekly_schedule_id      SERIAL PRIMARY KEY,
    mentor_id               INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    day_of_week             INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    start_time              TIME NOT NULL,
    end_time                TIME NOT NULL,
    description             TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

\echo 'Tabel "mentor_weekly_schedules" berhasil dibuat.'


-- ===============================================================
-- Tabel 10: KONTEN WEBSITE (Keunggulan / Advantages)
-- ===============================================================
CREATE TABLE public.advantages (
    id                SERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    description       TEXT NOT NULL,
    icon_svg          TEXT
);

\echo 'Tabel "advantages" berhasil dibuat.'


-- ===============================================================
-- Tabel 11: KONTEN WEBSITE (FAQs)
-- ===============================================================
CREATE TABLE public.faqs (
    id          SERIAL PRIMARY KEY,
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL
);

\echo 'Tabel "faqs" berhasil dibuat.'


-- ===============================================================
-- Tabel 12: PENGATURAN SITUS (Site Settings)
-- ===============================================================
CREATE TABLE public.site_settings (
    setting_key     VARCHAR(255) PRIMARY KEY,
    setting_value   TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.site_settings IS 'Menyimpan pengaturan key-value untuk konfigurasi situs, seperti URL logo.';

INSERT INTO public.site_settings (setting_key, setting_value) VALUES
    ('logo_url', '/assets/img/hero/10.jpg'),
    ('registration_url', 'https://forms.gle/Qwmn94ZUniCfKyn1A'),
    ('footer_about', 'Partner terpercaya untuk meraih prestasi akademik dan masa depan yang lebih cerah.'),
    ('contact_email', 'support@grafbimbel.com'),
    ('contact_phone', '(021) 123-4567'),
    ('contact_address', 'Jl. Pendidikan No. 123, Jakarta Selatan'),
    ('social_facebook_url', '#'),
    ('social_twitter_url', '#'),
    ('social_instagram_url', '#'),
    ('login_title', 'Graf-Bimbel'),
    ('login_subtitle', 'Platform Bimbingan Belajar Terpercaya')
ON CONFLICT (setting_key) DO NOTHING;

\echo 'Tabel "site_settings" berhasil dibuat dan semua pengaturan default telah diatur.'


-- ===============================================================
-- Tabel 13: KONTEN WEBSITE (Hero Slides)
-- ===============================================================
CREATE TABLE public.hero_slides (
    id              SERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    subtitle        TEXT,
    cta_text        VARCHAR(100),
    cta_url         TEXT,
    media_url       TEXT NOT NULL,
    media_type      VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.hero_slides IS 'Menyimpan konten untuk slider dinamis di halaman utama.';

INSERT INTO public.hero_slides (title, subtitle, cta_text, cta_url, media_url, media_type, display_order, is_active) VALUES
('Raih Impian Akademikmu Bersama Graf Bimbel!', 'Pembelajaran Interaktif, Mentor Berpengalaman, dan Jadwal Fleksibel.', '🚀 Daftar Sekarang', 'https://forms.gle/Qwmn94ZUniCfKyn1A', 'assets/img/default_hero_1.jpg', 'image', 1, TRUE),
('Paket Belajar Intensif SNBT/UTBK', 'Siapkan dirimu untuk masuk perguruan tinggi impian dengan program terstruktur kami.', 'Lihat Paket', '#packages', 'assets/img/default_hero_2.jpg', 'image', 2, TRUE);

\echo 'Tabel "hero_slides" berhasil dibuat dengan data contoh.'


-- ===============================================================
-- Tabel 14: PENGUMUMAN (Announcements)
-- ===============================================================
CREATE TABLE public.announcements (
    announcement_id     SERIAL PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    message             TEXT NOT NULL,
    target_role         VARCHAR(10) NOT NULL CHECK (target_role IN ('siswa', 'mentor', 'all')),
    created_by          INTEGER REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

\echo 'Tabel "announcements" berhasil dibuat.'


-- ===============================================================
-- Tabel 15: STATUS PENGUMUMAN PENGGUNA (User Announcement Status)
-- ===============================================================
CREATE TABLE public.user_announcement_status (
    status_id         SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    announcement_id   INTEGER NOT NULL REFERENCES public.announcements(announcement_id) ON DELETE CASCADE,
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    read_at           TIMESTAMPTZ,
    UNIQUE(user_id, announcement_id)
);

\echo 'Tabel "user_announcement_status" berhasil dibuat.'


-- ===============================================================
-- Tabel 16: NOTIFIKASI PUSH (Push Subscriptions)
-- ===============================================================
CREATE TABLE public.push_subscriptions (
    subscription_id     SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    subscription_data   JSONB NOT NULL UNIQUE
);

\echo 'Tabel "push_subscriptions" berhasil dibuat.'


-- ===============================================================
-- Tabel 17: Metode Pembayaran (Rekening Bank)
-- ===============================================================
CREATE TABLE public.payment_methods (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(50) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.payment_methods IS 'Menyimpan daftar rekening bank untuk tujuan pembayaran.';

INSERT INTO public.payment_methods (bank_name, account_number, account_holder_name, logo_url, display_order) VALUES
('BCA', '1234567890', 'Graf Bimbel', '/assets/img/hero/bca-logo.svg', 1),
('Mandiri', '0987654321', 'Graf Bimbel', '/assets/img/hero/mandiri-logo.svg', 2)
ON CONFLICT (id) DO NOTHING;

\echo 'Tabel "payment_methods" berhasil dibuat dengan data awal.'


-- ===============================================================
-- [BARU] Tabel 18: APP_SETTINGS (Pengaturan Reset Manual)
-- ===============================================================
CREATE TABLE public.app_settings (
    setting_key     VARCHAR(255) PRIMARY KEY,
    setting_value   TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.app_settings IS 'Menyimpan pengaturan key-value untuk aplikasi, seperti tanggal reset terakhir.';
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
    ('last_report_reset_date', '1970-01-01T00:00:00Z');

\echo 'Tabel "app_settings" berhasil dibuat dengan nilai default.'

-- ===============================================================
-- Seeding Data Awal (Admin User)
-- ===============================================================
INSERT INTO public.users (full_name, email, password_hash, phone_number, role) VALUES
('Admin Graf 1', 'admin1@gmail.com', '$2b$10$VVh9gJ.sk3wJf4L/lh5SLOq0mMpXekVZaKMLuZnPXsjimAAXC5S3G', '085641513946', 'admin'),
('Admin Graf 2', 'admin2@gmail.com', '$2b$10$tY1YmF1JyOlvSjxPwYHumeikxLdgvCn6I5ZLB1Na2Wp2N11I5CD4i', '0895391130812', 'admin')
ON CONFLICT (email) DO NOTHING;
\echo 'Pengguna admin awal berhasil dibuat.'