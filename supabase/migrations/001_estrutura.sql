-- Bizu do Concurseiro X — esquema próprio (projeto Supabase bizu-concurseiro-x).
-- Independente do Bizu Delta X: nenhum objeto aqui é compartilhado com ele.
-- Acesso somente pela Edge Function cx-api (service role). RLS ligado e sem
-- políticas: o navegador nunca lê as tabelas diretamente.

-- ===================== ESTRUTURA CURRICULAR =====================
create table public.cx_cursos(
  id text primary key,                 -- slug: 'pm-sp-soldado', 'gcm-geral'
  nome text not null,
  banca text,
  edital_ref text,
  redacao_formato text,                -- descrição do formato da redação no edital
  fontes jsonb not null default '[]',
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table public.cx_disciplinas(
  id uuid primary key default gen_random_uuid(),
  curso_id text not null references public.cx_cursos(id) on delete cascade,
  nome text not null,
  questoes int,                        -- nº de questões na prova objetiva, quando o edital informa
  ordem int not null default 0,
  unique(curso_id,nome)
);
create table public.cx_assuntos(
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.cx_disciplinas(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  unique(disciplina_id,nome)
);
create table public.cx_subassuntos(
  id uuid primary key default gen_random_uuid(),
  assunto_id uuid not null references public.cx_assuntos(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  unique(assunto_id,nome)
);
create index on public.cx_disciplinas(curso_id);
create index on public.cx_assuntos(disciplina_id);
create index on public.cx_subassuntos(assunto_id);

-- ===================== CONTEÚDO (vazio nesta etapa) =====================
create table public.cx_questoes(
  id uuid primary key default gen_random_uuid(),
  assunto_id uuid not null references public.cx_assuntos(id) on delete cascade,
  subassunto_id uuid references public.cx_subassuntos(id) on delete set null,
  enunciado text not null,
  opcoes jsonb not null,               -- ["A","B","C","D","E"]
  gabarito int not null check (gabarito between 0 and 4),
  comentario text,
  banca text, ano int, orgao text,
  dificuldade text check (dificuldade in ('facil','media','dificil')),
  publicado boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.cx_questoes(assunto_id);

-- PDFs, aulas, flashcards, mapas mentais, lei seca, jurisprudência e revisões
create table public.cx_materiais(
  id uuid primary key default gen_random_uuid(),
  assunto_id uuid not null references public.cx_assuntos(id) on delete cascade,
  subassunto_id uuid references public.cx_subassuntos(id) on delete set null,
  tipo text not null check (tipo in ('pdf','aula','flashcard','mapa_mental','lei_seca','jurisprudencia','revisao')),
  titulo text not null,
  conteudo jsonb not null default '{}',
  url text,
  fonte_oficial text,
  publicado boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.cx_materiais(assunto_id,tipo);

create table public.cx_simulados(
  id uuid primary key default gen_random_uuid(),
  curso_id text not null references public.cx_cursos(id) on delete cascade,
  titulo text not null,
  questao_ids uuid[] not null default '{}',
  duracao_min int not null default 180,
  publicado boolean not null default false,
  criado_em timestamptz not null default now()
);

create table public.cx_redacao_temas(
  id uuid primary key default gen_random_uuid(),
  curso_id text not null references public.cx_cursos(id) on delete cascade,
  titulo text not null,
  proposta text not null,
  textos_apoio jsonb not null default '[]',
  publicado boolean not null default false,
  criado_em timestamptz not null default now()
);

-- ===================== DADOS DO ALUNO =====================
create table public.cx_perfis(
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  curso_id text references public.cx_cursos(id) on delete set null,
  xp int not null default 0,
  criado_em timestamptz not null default now()
);
create table public.cx_tentativas(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  questao_id uuid not null references public.cx_questoes(id) on delete cascade,
  resposta int not null,
  correta boolean not null,
  criado_em timestamptz not null default now()
);
create index on public.cx_tentativas(user_id,criado_em desc);
create table public.cx_questoes_salvas(
  user_id uuid not null references auth.users(id) on delete cascade,
  questao_id uuid not null references public.cx_questoes(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key(user_id,questao_id)
);
create table public.cx_revisoes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assunto_id uuid not null references public.cx_assuntos(id) on delete cascade,
  tipo text not null check (tipo in ('24h','7dias','30dias')),
  vence_em date not null,
  feita_em timestamptz,
  unique(user_id,assunto_id,tipo)
);
create table public.cx_dominio(
  user_id uuid not null references auth.users(id) on delete cascade,
  assunto_id uuid not null references public.cx_assuntos(id) on delete cascade,
  nivel int not null check (nivel between 0 and 4),
  atualizado_em timestamptz not null default now(),
  primary key(user_id,assunto_id)
);
create table public.cx_notas(
  user_id uuid not null references auth.users(id) on delete cascade,
  assunto_id uuid not null references public.cx_assuntos(id) on delete cascade,
  texto text not null default '',
  atualizado_em timestamptz not null default now(),
  primary key(user_id,assunto_id)
);
create table public.cx_simulado_tentativas(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  simulado_id uuid not null references public.cx_simulados(id) on delete cascade,
  respostas jsonb not null default '{}',
  acertos int, total int,
  iniciado_em timestamptz not null default now(),
  entregue_em timestamptz
);
create table public.cx_redacoes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curso_id text not null references public.cx_cursos(id) on delete cascade,
  tema_id uuid references public.cx_redacao_temas(id) on delete set null,
  tema_livre text,
  titulo text,
  texto text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho','finalizada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.cx_redacoes(user_id,atualizado_em desc);

-- Cronômetro X: tempo líquido por timestamps reais
create table public.cx_sessoes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curso_id text references public.cx_cursos(id) on delete set null,
  disciplina_id uuid references public.cx_disciplinas(id) on delete set null,
  assunto_id uuid references public.cx_assuntos(id) on delete set null,
  atividade text not null default 'teoria',
  inicio timestamptz not null default now(),
  fim timestamptz,
  pausado_em timestamptz,
  pausas_s int not null default 0,
  liquido_s int,
  ativa boolean not null default true
);
create index on public.cx_sessoes(user_id,inicio desc);
create unique index cx_sessoes_uma_ativa on public.cx_sessoes(user_id) where ativa;

create table public.cx_cronograma(
  user_id uuid not null references auth.users(id) on delete cascade,
  curso_id text not null references public.cx_cursos(id) on delete cascade,
  config jsonb not null default '{}',
  plano jsonb not null default '[]',
  criado_em timestamptz not null default now(),
  primary key(user_id,curso_id)
);

-- Calendário do aluno
create table public.cx_eventos(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  titulo text not null,
  tipo text not null default 'estudo' check (tipo in ('estudo','revisao','simulado','redacao','prova','outro')),
  feito boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on public.cx_eventos(user_id,data);

-- RLS em todas as tabelas (acesso só via service role na Edge Function)
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' and tablename like 'cx\_%' loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;
