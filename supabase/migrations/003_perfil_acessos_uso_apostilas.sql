-- 13/10/2026 — perfil ampliado, acesso por prazo, histórico de uso de questões e controle de apostilas.
alter table public.cx_perfis
  add column if not exists apelido text, add column if not exists celular text, add column if not exists escolaridade text,
  add column if not exists cidade text, add column if not exists estado text, add column if not exists foto text,
  add column if not exists concurso_pretendido text, add column if not exists cargo_pretendido text, add column if not exists municipio_interesse text,
  add column if not exists horas_dia numeric, add column if not exists dias_semana integer, add column if not exists inicio_estudos date,
  add column if not exists tempo_preparacao_meses integer, add column if not exists pausas jsonb not null default '[]'::jsonb,
  add column if not exists retomada_em date, add column if not exists nivel_atual text, add column if not exists materias_dificuldade jsonb not null default '[]'::jsonb,
  add column if not exists meta_semanal_horas numeric, add column if not exists data_prova date, add column if not exists atualizado_em timestamptz;
create table if not exists public.cx_acessos (
  user_id uuid primary key references auth.users(id) on delete cascade, papel text not null default 'aluno' check (papel = 'aluno'),
  criado_em timestamptz not null default now(), ativado_em timestamptz, expira_em timestamptz,
  situacao text not null default 'ativo' check (situacao in ('ativo','suspenso','expirado')), trocar_senha boolean not null default false,
  historico jsonb not null default '[]'::jsonb, observacao text);
alter table public.cx_acessos enable row level security;
create table if not exists public.cx_uso_questoes (
  id uuid primary key default gen_random_uuid(), curso_id text not null, questao_id uuid references public.cx_questoes(id) on delete set null,
  hash text not null, hash_enunciado text not null, resumo text,
  contexto text not null check (contexto in ('prova_real','simulado_pdf','simulado')), ref text not null, numero integer,
  registrado_em timestamptz not null default now(), unique (hash, contexto, ref));
create index if not exists cx_uso_questoes_hash on public.cx_uso_questoes(hash);
create index if not exists cx_uso_questoes_hash_enun on public.cx_uso_questoes(hash_enunciado);
create index if not exists cx_uso_questoes_curso on public.cx_uso_questoes(curso_id, contexto);
alter table public.cx_uso_questoes enable row level security;
alter table public.cx_simulados add column if not exists atualizado_em timestamptz, add column if not exists origem text;
create table if not exists public.cx_apostilas (
  assunto_id uuid primary key references public.cx_assuntos(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','em_producao','em_revisao','aprovado','publicado','necessita_correcao')),
  versao text, arquivo text, paginas integer, bytes integer, gerado_em timestamptz, revisado_em timestamptz, publicado_em timestamptz,
  material_id uuid, obs text, atualizado_em timestamptz not null default now());
alter table public.cx_apostilas enable row level security;
