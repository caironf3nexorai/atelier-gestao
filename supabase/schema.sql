-- Enable useful extensions
create extension if not exists "uuid-ossp";

-- 1. Table: Students (Alunas)
create table public.students (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  parent_name text, -- Nome do responsável
  phone text, -- WhatsApp
  birth_date date,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. Table: Classes (Horários das Turmas)
-- Ex: Segunda 14:00, Terça 09:00
create table public.classes (
  id uuid primary key default uuid_generate_v4(),
  day_of_week integer not null, -- 0=Dom, 1=Seg, ... 6=Sab
  start_time time not null,
  end_time time not null,
  name text, -- Opcional: "Turma da Tarde"
  created_at timestamp with time zone default now()
);

-- 3. Table: Enrollments (Matrículas / Dias Fixos)
-- Qual turma fixa a aluna está matriculada?
create table public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade not null,
  class_id uuid references public.classes(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(student_id, class_id)
);

-- 4. Table: Attendance (Chamada)
create type attendance_status as enum ('present', 'absent', 'makeup');

create table public.attendance (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  class_id uuid references public.classes(id) on delete set null, -- Turma onde ocorreu a presença
  student_id uuid references public.students(id) on delete cascade not null,
  status attendance_status not null,
  is_makeup boolean default false, -- Se é uma reposição
  notes text,
  created_at timestamp with time zone default now(),
  unique(date, student_id, class_id)
);

-- 5. Table: Makeup Credits (Créditos de Reposição)
create table public.makeup_credits (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete cascade not null,
  generated_from_attendance_id uuid references public.attendance(id), -- Falta que gerou
  used_at_attendance_id uuid references public.attendance(id), -- Presença que consumiu
  expires_at date, -- Validade (ex: 30 dias)
  created_at timestamp with time zone default now()
);

-- RLS helper (simple for now)
alter table public.students enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance enable row level security;
alter table public.makeup_credits enable row level security;

-- Open access policies (Dev mode - user needs to restrict later)
create policy "Allow all access" on public.students for all using (true);
create policy "Allow all access" on public.classes for all using (true);
create policy "Allow all access" on public.enrollments for all using (true);
create policy "Allow all access" on public.attendance for all using (true);
create policy "Allow all access" on public.makeup_credits for all using (true);
