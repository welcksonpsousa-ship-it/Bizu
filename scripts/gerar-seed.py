#!/usr/bin/env python3
"""Gera supabase/migrations/002_seed_estrutura.sql a partir de data/estrutura-curricular.json.
Idempotente (on conflict do update): rodar de novo recria/atualiza a estrutura sem duplicar."""
import json, pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent
d = json.loads((raiz / 'data/estrutura-curricular.json').read_text())
dados = json.dumps(d['cursos'], ensure_ascii=False, separators=(',', ':')).replace('$cx$', '')
sql = f"""-- Gerado por scripts/gerar-seed.py — estrutura curricular (sem conteúdo de estudo).
do $seed$
declare
  j jsonb := $cx${dados}$cx$::jsonb;
  c jsonb; di jsonb; a jsonb; s jsonb;
  ci int := 0; dn int; an int; sn int;
  v_disc uuid; v_ass uuid;
begin
  for c in select * from jsonb_array_elements(j) loop
    ci := ci + 1;
    insert into public.cx_cursos(id,nome,banca,edital_ref,redacao_formato,fontes,ordem)
    values (c->>'slug',c->>'nome',c->>'banca',c->>'edital_ref',c->>'redacao',c->'fontes',ci)
    on conflict (id) do update set nome=excluded.nome,banca=excluded.banca,edital_ref=excluded.edital_ref,
      redacao_formato=excluded.redacao_formato,fontes=excluded.fontes,ordem=excluded.ordem;
    dn := 0;
    for di in select * from jsonb_array_elements(c->'disciplinas') loop
      dn := dn + 1;
      insert into public.cx_disciplinas(curso_id,nome,questoes,ordem)
      values (c->>'slug',di->>'nome',(di->>'questoes')::int,dn)
      on conflict (curso_id,nome) do update set questoes=excluded.questoes,ordem=excluded.ordem
      returning id into v_disc;
      an := 0;
      for a in select * from jsonb_array_elements(di->'assuntos') loop
        an := an + 1;
        insert into public.cx_assuntos(disciplina_id,nome,ordem) values (v_disc,a->>'nome',an)
        on conflict (disciplina_id,nome) do update set ordem=excluded.ordem
        returning id into v_ass;
        sn := 0;
        for s in select * from jsonb_array_elements(a->'subassuntos') loop
          sn := sn + 1;
          insert into public.cx_subassuntos(assunto_id,nome,ordem) values (v_ass,s#>>'{{}}',sn)
          on conflict (assunto_id,nome) do update set ordem=excluded.ordem;
        end loop;
      end loop;
    end loop;
  end loop;
end
$seed$;
"""
(raiz / 'supabase/migrations/002_seed_estrutura.sql').write_text(sql)
print(len(sql))
