create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  id integer primary key default 1,
  admin_code text not null default 'ADMIN-2030',
  semester_start date not null default '2026-08-23',
  reminder_day text not null default 'الأحد',
  reminder_channel text not null default 'البريد الإلكتروني',
  reminder_template text not null default 'تذكير ببند هذا الأسبوع: {{criterion}}. نسبة إنجاز ملف الشواهد الحالية {{progress}}%.',
  criteria jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint single_settings_row check (id = 1)
);

create table if not exists public.teachers (
  code text primary key,
  name text not null,
  email text not null,
  subject text not null default '',
  school text not null default '',
  stage text not null default '',
  phone text not null default '',
  role_label text not null default 'معلم',
  enabled boolean not null default true,
  notes jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{"weeklyAlerts": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  teacher_code text not null references public.teachers(code) on delete cascade,
  criterion_id text not null,
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists evidence_files_teacher_idx on public.evidence_files (teacher_code);
create index if not exists evidence_files_teacher_criterion_idx on public.evidence_files (teacher_code, criterion_id);

alter table public.app_settings enable row level security;
alter table public.teachers enable row level security;
alter table public.evidence_files enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-evidence',
  'teacher-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

insert into public.app_settings (id, admin_code, semester_start, reminder_day, reminder_channel, reminder_template, criteria)
values (
  1,
  'ADMIN-2030',
  '2026-08-23',
  'الأحد',
  'البريد الإلكتروني',
  'تذكير ببند هذا الأسبوع: {{criterion}}. نسبة إنجاز ملف الشواهد الحالية {{progress}}%.',
  '[
    {"id":"item-1","title":"أداء الواجبات الوظيفية","weight":10,"week":1,"description":"الالتزام بالحضور، تنفيذ المهام، احترام الأنظمة، والمحافظة على سرية البيانات.","evidenceHint":"سجل حضور، تكليفات منفذة، تعاميم موقعة، أو تقرير إنجاز أسبوعي."},
    {"id":"item-2","title":"التفاعل مع المجتمع المهني","weight":10,"week":2,"description":"المشاركة في مجتمعات التعلم المهنية والتعاون مع الزملاء وتبادل الخبرات.","evidenceHint":"محضر مجتمع تعلم، شهادة حضور، مبادرة مشتركة، أو زيارة تبادلية."},
    {"id":"item-3","title":"التفاعل مع أولياء الأمور","weight":10,"week":3,"description":"بناء تواصل تربوي منظم مع الأسرة ومتابعة أثر ذلك على تعلم الطلاب.","evidenceHint":"سجل تواصل، دعوة اجتماع، رسالة متابعة، أو تقرير حالة طالب."},
    {"id":"item-4","title":"التنويع في استراتيجيات التدريس","weight":10,"week":4,"description":"توظيف استراتيجيات متنوعة تراعي الفروق الفردية وتزيد مشاركة المتعلمين.","evidenceHint":"خطة درس، صور أنشطة، بطاقة ملاحظة، أو نماذج تعلم نشط."},
    {"id":"item-5","title":"تحسين نتائج المتعلمين","weight":10,"week":5,"description":"تتبع مستوى الطلاب وتنفيذ إجراءات تساعد على رفع التحصيل وتحسين المخرجات.","evidenceHint":"مقارنة نتائج، خطة علاجية، أعمال طلاب، أو تقرير تحسن."},
    {"id":"item-6","title":"إعداد وتنفيذ خطة التعلم","weight":10,"week":6,"description":"تخطيط التعلم وتنفيذ الدروس وفق أهداف واضحة ومؤشرات أداء قابلة للمتابعة.","evidenceHint":"تحضير درس، خطة وحدة، جدول تنفيذ، أو بطاقة هدف تعليمي."},
    {"id":"item-7","title":"توظيف تقنيات ووسائل التعلم المناسبة","weight":10,"week":7,"description":"اختيار أدوات وتقنيات تعليمية مناسبة للمحتوى وتوظيفها في تعلم الطلاب.","evidenceHint":"رابط منصة، صورة نشاط رقمي، وسيلة تعليمية، أو تقرير استخدام أداة."},
    {"id":"item-8","title":"تهيئة بيئة تعليمية","weight":5,"week":8,"description":"تهيئة بيئة تعلم جاذبة وآمنة ومنظمة تدعم مشاركة الطلاب.","evidenceHint":"صور الفصل، قواعد تعلم، ركن مادة، أو تنظيم مساحات تعلم."},
    {"id":"item-9","title":"الإدارة الصفية","weight":5,"week":9,"description":"إدارة وقت الحصة وسلوك الطلاب والتفاعل الصفي بطريقة داعمة للتعلم.","evidenceHint":"قواعد صفية، سجل متابعة، بطاقة تعزيز، أو خطة إدارة صفية."},
    {"id":"item-10","title":"تحليل نتائج المتعلمين وتشخيص مستوياتهم","weight":10,"week":10,"description":"تحليل البيانات التعليمية وتشخيص مستويات الطلاب لاختيار تدخلات مناسبة.","evidenceHint":"جدول تحليل، رسوم نتائج، قائمة مستويات، أو تقرير تشخيص."},
    {"id":"item-11","title":"استثمار نتائج التقويم","weight":10,"week":11,"description":"تحويل نتائج التقويم إلى قرارات تعليمية وخطط علاجية وإثرائية.","evidenceHint":"خطة علاجية، أنشطة إثرائية، متابعة بعدية، أو قياس أثر."}
  ]'::jsonb
)
on conflict (id) do nothing;

insert into public.teachers (code, name, email, subject, school, stage, phone, role_label)
values
  ('T-1001', 'أحمد بن عبدالله الحربي', 'ahmad.teacher@example.com', 'الرياضيات', 'مدرسة المستقبل المتوسطة', 'المرحلة المتوسطة', '0500000000', 'معلم'),
  ('T-2002', 'نورة بنت سعد العتيبي', 'nora.teacher@example.com', 'لغتي', 'ابتدائية الريادة', 'المرحلة الابتدائية', '0550000000', 'معلمة')
on conflict (code) do nothing;
