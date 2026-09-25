-- ==============================================================================
-- Class Certificate Automation Manager - Supabase SQL Schema & RLS Policies
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: admins
-- Authorized administrator emails
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial administrator
INSERT INTO public.admins (email, role)
VALUES ('jayaramsappa09@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- 3. TABLE: students (Fixed 67-Student Class Roster)
CREATE TABLE IF NOT EXISTS public.students (
    roll_no TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed exact 67-student roster
INSERT INTO public.students (roll_no, name) VALUES
('25A31A05DV', 'ADABALA NAVYA RAMYA SREE'),
('25A31A05DW', 'BEVARA PRASANTHI'),
('25A31A05DX', 'CHILLA DEEPTHI'),
('25A31A05DY', 'DORA JERIYA'),
('25A31A05DZ', 'EELI HEMA VENKATA LALITHA'),
('25A31A05EA', 'ESARAPU SATYAVENI'),
('25A31A05EB', 'GUBBALA YASASWI DEVI'),
('25A31A05EC', 'GUTTA THRAITHESHWARI'),
('25A31A05ED', 'INAKOTI BHANU CHANDINI'),
('25A31A05EE', 'KAKILETI SHINY HADASSAH'),
('25A31A05EF', 'KOTHAPALLI SWARNA MADHURI'),
('25A31A05EG', 'MADDALA LEELA RAMYA VANI'),
('25A31A05EH', 'MANGARA ELIJIBETH ROJA'),
('25A31A05EI', 'MOHAMMAD ZAHURUNNISA BEGUM'),
('25A31A05EJ', 'MORUKURTHI GOWTHAMI'),
('25A31A05EK', 'MULLAPUDI MAITRI NARMADA DEVI'),
('25A31A05EL', 'OBILISETTI VENNELA'),
('25A31A05EM', 'PATAN FATHIMA'),
('25A31A05EN', 'PEMMANABOIDI KEERTHANA'),
('25A31A05EO', 'PEMMIREDDY MOUNIKA SURYA'),
('25A31A05EP', 'PENUGONDA MOUNIKA'),
('25A31A05EQ', 'RAMIREDDY DEVI KEERTHANA'),
('25A31A05ER', 'REDNAM LAKSHMI SATHVIKA'),
('25A31A05ES', 'TALLURI JAHNAVI'),
('25A31A05ET', 'VASAMSETTI JAHNAVI DEVI'),
('25A31A05EU', 'VASAMSETTI RAMA LAKSHMI'),
('25A31A05EV', 'VELUGUBANTLA SOWMYA VIJAYA VIGNESWARI'),
('25A31A05EW', 'YANDAPALLI MOHANA LAKSHMI'),
('25A31A05EX', 'ATTULURI MANIKANTA'),
('25A31A05EY', 'CHALLA BARGAVA SATYA SAI RAKESH'),
('25A31A05EZ', 'CHETTI SURYA PAUL'),
('25A31A05FA', 'DASARI MOHITH SUBHASH'),
('25A31A05FB', 'DEVISETTI VENKATA RISHI RAJ'),
('25A31A05FC', 'DUGGIRALA HEMANTH'),
('25A31A05FD', 'GANAPABATHULA SUPRADEEP'),
('25A31A05FE', 'GANNI VENKAT'),
('25A31A05FF', 'GONELA MOHAN SAI KIRAN'),
('25A31A05FG', 'GOPALADASU DURGA AJAY KUMAR'),
('25A31A05FH', 'GUDURI HARI NAGA CHANDRA HANISH'),
('25A31A05FI', 'GUMMADI PRUDVIRAJ'),
('25A31A05FJ', 'GUMMALLA VEERA MANIKANTA VIVEK'),
('25A31A05FK', 'JETTY ASHER JOSEPH'),
('25A31A05FL', 'JYOTHULA MANIDEEP'),
('25A31A05FM', 'KALLA TEJOMAYA'),
('25A31A05FN', 'KATARI DATTA PAVAN SAI KRISHNA'),
('25A31A05FO', 'KONDETI SATYA BHIMA SANKARA SAINADH'),
('25A31A05FP', 'KOPPANATHI BABI'),
('25A31A05FQ', 'LELLA BHARGAV'),
('25A31A05FR', 'MADAKAM LAKSHMAN LOKESH'),
('25A31A05FS', 'MANDELA VENKATESH'),
('25A31A05FT', 'MUMMIDI PAVAN SURYA CHAITANYA'),
('25A31A05FU', 'MUMMIDI VENKATA BAPANNA SATYA PAVAN'),
('25A31A05FV', 'NATHIPAM SRINIVAS'),
('25A31A05FW', 'NEELAPALA SATYA SUDHEER'),
('25A31A05FX', 'PEDAPATI SAI MALLIKHARJUN'),
('25A31A05FY', 'PERURI SAI NIKHIL'),
('25A31A05FZ', 'ROHITH S S SURYANARAYANA DEVUNI'),
('25A31A05GA', 'SALADI G S NAGA VENKATA RATNA SAIRAM'),
('25A31A05GB', 'SAPPA JAYARAM SIVA PRASAD'),
('25A31A05GC', 'SASUBILLI SASANK MANINDHAR'),
('25A31A05GD', 'TAVVA KISHORE'),
('25A31A05GE', 'TELU MALLIKARJUN'),
('25A31A05GF', 'VADDI SHAUN AJIT'),
('25A31A05GG', 'VANAMALI SIVA NAGA SATYA NARASIMHA'),
('25A31A05GH', 'VASAMSETTI PRUDHVI'),
('25A31A05GI', 'YALLA ARYA')
ON CONFLICT (roll_no) DO UPDATE SET name = EXCLUDED.name;

-- 4. TABLE: student_status
-- Preserves submitted status persistently across syncs and browser restarts
CREATE TABLE IF NOT EXISTS public.student_status (
    roll_no TEXT PRIMARY KEY REFERENCES public.students(roll_no) ON DELETE CASCADE,
    drive_uploaded BOOLEAN NOT NULL DEFAULT FALSE,
    sheet_updated BOOLEAN NOT NULL DEFAULT FALSE,
    submitted BOOLEAN NOT NULL DEFAULT FALSE, -- MANUAL ADMIN CONTROL
    overall_status TEXT NOT NULL DEFAULT 'NOT STARTED', -- 'COMPLETED' | 'PENDING' | 'NOT STARTED'
    certificates TEXT[] DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial status rows for all 67 students
INSERT INTO public.student_status (roll_no, submitted, drive_uploaded, sheet_updated, overall_status)
SELECT roll_no, FALSE, FALSE, FALSE, 'NOT STARTED'
FROM public.students
ON CONFLICT (roll_no) DO NOTHING;

-- 5. TABLE: certificates_cache (Cached metadata from Google Drive)
CREATE TABLE IF NOT EXISTS public.certificates_cache (
    id TEXT PRIMARY KEY, -- Google Drive file ID
    file_name TEXT NOT NULL,
    mime_type TEXT,
    web_view_link TEXT,
    detected_roll_no TEXT,
    detected_cert_type TEXT,
    is_outside_class BOOLEAN DEFAULT FALSE,
    is_unidentified BOOLEAN DEFAULT FALSE,
    is_duplicate BOOLEAN DEFAULT FALSE,
    created_time TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE: sync_history
CREATE TABLE IF NOT EXISTS public.sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    students_checked INTEGER NOT NULL DEFAULT 67,
    drive_files_scanned INTEGER NOT NULL DEFAULT 0,
    matched_certificates INTEGER NOT NULL DEFAULT 0,
    students_with_certificates INTEGER NOT NULL DEFAULT 0,
    spreadsheet_records_checked INTEGER NOT NULL DEFAULT 0,
    spreadsheet_matches INTEGER NOT NULL DEFAULT 0,
    outside_class_ignored INTEGER NOT NULL DEFAULT 0,
    unidentified_files INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0
);

-- 7. TABLE: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    "user" TEXT NOT NULL,
    details TEXT,
    category TEXT NOT NULL DEFAULT 'SYNC'
);

-- 8. TABLE: settings
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO public.settings (key, value) VALUES
('drive_config', '{"folderId": "", "folderName": ""}'::jsonb),
('sheet_config', '{"spreadsheetId": "", "sheetName": ""}'::jsonb),
('app_preferences', '{"autoSyncIntervalMinutes": 0, "enableSpreadsheetWrite": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Only authenticated users present in the admins table have access.
-- ==============================================================================

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check if current auth user is in admins table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for admins
CREATE POLICY "Admins can view and manage admin list"
ON public.admins FOR ALL
USING (public.is_admin());

-- Policies for students
CREATE POLICY "Admins can read students roster"
ON public.students FOR SELECT
USING (public.is_admin());

-- Policies for student_status
CREATE POLICY "Admins can manage student_status"
ON public.student_status FOR ALL
USING (public.is_admin());

-- Policies for certificates_cache
CREATE POLICY "Admins can manage certificates_cache"
ON public.certificates_cache FOR ALL
USING (public.is_admin());

-- Policies for sync_history
CREATE POLICY "Admins can view and append sync_history"
ON public.sync_history FOR ALL
USING (public.is_admin());

-- Policies for audit_logs
CREATE POLICY "Admins can view and append audit_logs"
ON public.audit_logs FOR ALL
USING (public.is_admin());

-- Policies for settings
CREATE POLICY "Admins can manage settings"
ON public.settings FOR ALL
USING (public.is_admin());
