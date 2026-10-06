# Bizu do Concurseiro X

Plataforma de estudo para **PM-SP Soldado** e **GCM Geral**. Projeto **independente** do Bizu Delta X: repositório, banco de dados (Supabase `bizu-concurseiro-x`), API e site (Vercel) próprios. A estrutura de telas segue a lógica do Delta X, mas nada é compartilhado com ele.

## Estado atual (primeira etapa)
- Estrutura curricular completa: Curso → Disciplina → Assunto → Subassunto, montada a partir dos editais (`data/estrutura-curricular.json`, com as fontes).
- **Redação** no lugar de Discursiva. **Sem Prova Oral.**
- Nenhum conteúdo de estudo ainda. As áreas de questões, PDFs, aulas, flashcards, mapas mentais, lei seca, jurisprudência, revisões, simulados e temas de redação já existem no banco e nas telas, mas ficam vazias até o material ser publicado.

## Organização
| Caminho | O que é |
|---|---|
| `index.html`, `app.js`, `styles.css` | Site (estático) |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | Instalação como app (PWA) |
| `vercel.json` | `/api/*` → Edge Function `cx-api` |
| `supabase/functions/cx-api/index.ts` | API |
| `supabase/migrations/001_estrutura.sql` | Tabelas |
| `supabase/migrations/002_seed_estrutura.sql` | Carga da estrutura curricular (gerada) |
| `data/estrutura-curricular.json` | Fonte da estrutura curricular |
| `scripts/gerar-seed.py` | Gera o `002_seed_estrutura.sql` a partir do JSON |

## Publicação
- **Site:** projeto Vercel `bizu-concurseiro-x` (https://bizu-concurseiro-x.vercel.app), ligado a este repositório: cada envio para `main` publica o site automaticamente.
- **API e banco:** projeto Supabase `bizu-concurseiro-x` (independente do Bizu Delta X). A função `cx-api` e as migrações são publicadas à parte.

## Recriar do zero
1. Aplicar `001_estrutura.sql` e `002_seed_estrutura.sql` no projeto Supabase (a carga é idempotente: rodar de novo recria/atualiza sem duplicar).
2. Publicar a função `cx-api` (sem verificação de JWT: a própria função valida a sessão por cookie).
3. Publicar o site na Vercel com o `vercel.json` deste repositório.

## Publicar conteúdo (etapas futuras)
Cada material é ligado a um **assunto** (e opcionalmente a um subassunto) e só aparece para o aluno com `publicado = true`:
- `cx_questoes` — questões de múltipla escolha;
- `cx_materiais` — `tipo` = `pdf`, `aula`, `flashcard`, `mapa_mental`, `lei_seca`, `jurisprudencia` ou `revisao`;
- `cx_simulados` — lista de questões por curso;
- `cx_redacao_temas` — propostas de redação por curso.


## Planejamento de estudo (O que estudar / Cronograma)

`plano.js` é o motor (sem DOM). Regras: cada disciplina tem um peso na prova (nº de questões do edital; na GCM, peso estimado);
cada assunto tem uma lacuna (não estudado = 1; sobe com erros, desce com acertos e domínio).
- **O que estudar hoje:** o aluno informa o tempo; o plano prioriza peso × lacuna, começa pelas revisões vencidas,
  fecha com o ponto fraco (menor acerto) e marca o assunto como estudado quando o aluno conclui a aula.
- **Cronograma (14 dias):** 1ª matéria do dia = a de maior peso; 2ª = peso médio; 3ª (só com 2h30+) = menor peso;
  sobra de tempo = questões e revisão 24h/7 dias. Sábado: simulado + correção. Domingo: redação + revisão geral.

Testes do motor: `node scripts/test-plano.js`.

## Banco de questões (reais, autorais e simulados)
- Cada questão tem tipo (`real`/`autoral`), banca, concurso, ano, cargo, nível (+ compatibilidade), fonte, origem, status (`publicada`, `revisao`, `desatualizada`, `anulada`, `duplicada`) e hash anti-duplicata. O aluno só vê `publicada` e compatível com o nível; o resto fica na fila do Admin → Banco de questões.
- Questões reais entram por `/admin/importar-lote` (idempotente por hash); autorais substituídas em cadernos revisados entram como autorais.
- Simulados seguem o modelo do Delta X: links do Drive (prova, gabarito, gabarito comentado), cadastrados em Admin → Simulados; não viram questões.
- Treino adaptativo, "O que estudar" e Cronograma usam `/banco/insights` (incidência na banca, peso do edital, desempenho, tempo sem revisar).
- Relatório de auditoria: `AUDITORIA-BANCO-QUESTOES-BIZU.md`.
