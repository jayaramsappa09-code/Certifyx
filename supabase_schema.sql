-- ==============================================================================
-- CCAM Database Schema Setup for Supabase (Full Schema with 67-Student Seed)
-- Copy and run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create class_roster table (stores student roster metadata and numbers)
CREATE TABLE IF NOT EXISTS public.class_roster (
  roll_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create student_statuses table (stores live sync, submission and audit status)
CREATE TABLE IF NOT EXISTS public.student_statuses (
  roll_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  drive_uploaded BOOLEAN DEFAULT false,
  sheet_updated BOOLEAN DEFAULT false,
  submitted BOOLEAN DEFAULT false,
  overall_status TEXT DEFAULT 'NOT STARTED',
  updated_by TEXT DEFAULT 'admin',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backward-compatibility views / aliases if needed
CREATE TABLE IF NOT EXISTS public.students (
  roll_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_status (
  roll_no TEXT PRIMARY KEY,
  drive_uploaded BOOLEAN DEFAULT false,
  sheet_updated BOOLEAN DEFAULT false,
  submitted BOOLEAN DEFAULT false,
  overall_status TEXT DEFAULT 'NOT STARTED',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create sync_history table
CREATE TABLE IF NOT EXISTS public.sync_history (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  duration_ms INTEGER DEFAULT 0,
  students_checked INTEGER DEFAULT 67,
  matched_certificates INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_messages TEXT[]
);

-- 4. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  action TEXT NOT NULL,
  user_email TEXT,
  details TEXT,
  category TEXT
);

-- 5. Seed exact 67-student roster and roll numbers into class_roster and student_statuses
INSERT INTO public.class_roster (roll_no, name) VALUES
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
ON CONFLICT (roll_no) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO public.student_statuses (roll_no, name, submitted, drive_uploaded, sheet_updated, overall_status)
SELECT roll_no, name, false, false, false, 'NOT STARTED'
FROM public.class_roster
ON CONFLICT (roll_no) DO NOTHING;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.class_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Configure Permissive RLS Policies for Anon & Authenticated Access
DROP POLICY IF EXISTS "Public access on class_roster" ON public.class_roster;
CREATE POLICY "Public access on class_roster" ON public.class_roster FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on student_statuses" ON public.student_statuses;
CREATE POLICY "Public access on student_statuses" ON public.student_statuses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on students" ON public.students;
CREATE POLICY "Public access on students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on student_status" ON public.student_status;
CREATE POLICY "Public access on student_status" ON public.student_status FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on sync_history" ON public.sync_history;
CREATE POLICY "Public access on sync_history" ON public.sync_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on audit_logs" ON public.audit_logs;
CREATE POLICY "Public access on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable Realtime Publications for live cross-admin syncing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'student_statuses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_statuses;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'class_roster'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_roster;
  END IF;
END $$;
