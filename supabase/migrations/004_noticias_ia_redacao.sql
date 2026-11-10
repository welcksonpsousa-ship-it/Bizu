-- 004 — Notícias dos concursos, registro de uso de IA e redação com anexo/correção.
-- Só acrescenta estruturas; nada existente é removido.

-- Notícias dos concursos (curadas pela administração; fonte oficial priorizada)
create table if not exists public.cx_noticias(
  id uuid primary key default gen_random_uuid(),
  curso_id text references public.cx_cursos(id) on delete cascade,   -- null = vale para todos os cursos
  concurso text not null,                       -- concurso a que a notícia se refere (ex.: "PM-SP Soldado 2026", "GCM São Paulo 2026")
  tipo text not null default 'outro' check (tipo in ('edital','autorizacao','comissao','banca','inscricoes','cronograma','resultado','prova','outro')),
  titulo text not null,
  resumo text not null,
  fonte_nome text not null,
  fonte_url text not null,
  oficial boolean not null default false,       -- fonte do órgão público ou da banca organizadora
  publicado_em date not null,                    -- data de publicação na fonte
  verificado_em timestamptz not null default now(),
  publicado boolean not null default true,
  chave text not null unique,                    -- evita duplicidade (concurso + url ou título normalizado)
  criado_em timestamptz not null default now()
);
create index if not exists cx_noticias_curso_data on public.cx_noticias(curso_id, publicado_em desc);
alter table public.cx_noticias enable row level security;

-- Registro de uso de IA (controle de custo, erros e limites)
create table if not exists public.cx_ia_uso(
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  funcao text not null,                          -- chatx, redacao, ...
  provedor text,
  modelo text,
  ok boolean not null default true,
  erro text,
  tokens_in int,
  tokens_out int,
  custo_usd numeric(10,5),                       -- estimativa (preenchida só quando o preço do modelo está configurado)
  ms int,
  criado_em timestamptz not null default now()
);
create index if not exists cx_ia_uso_user_dia on public.cx_ia_uso(user_id, funcao, criado_em desc);
create index if not exists cx_ia_uso_dia on public.cx_ia_uso(criado_em desc);
alter table public.cx_ia_uso enable row level security;

-- Redação: origem do texto, arquivo anexado e correção
alter table public.cx_redacoes add column if not exists origem text not null default 'digitada' check (origem in ('digitada','arquivo'));
alter table public.cx_redacoes add column if not exists arquivo_nome text;
alter table public.cx_redacoes add column if not exists arquivo_path text;
alter table public.cx_redacoes add column if not exists arquivo_mime text;
alter table public.cx_redacoes add column if not exists correcao jsonb;
alter table public.cx_redacoes add column if not exists corrigida_em timestamptz;
alter table public.cx_redacoes add column if not exists correcao_modelo text;

-- Armazenamento privado dos arquivos de redação (acesso só pelo backend)
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('cx-redacoes', 'cx-redacoes', false, 5242880,
        array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict (id) do nothing;
