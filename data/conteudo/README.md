# Conteúdo de estudo — Bizu do Concurseiro X

Arquivos importados no site pela rota `POST /admin/importar` (um item por assunto).

- `pm_*.json`, `gcm_*.json`, `gerais_atualidades.json`, `constitucional_adm.json`: aulas, revisões, mapas mentais, flashcards e questões inéditas.
  Os três arquivos jurídicos (`constitucional_adm`, `gcm_guardas_penal`, `gcm_especial_dh_ctb`) já estão na versão auditada contra a lei vigente;
  os relatórios de cada alteração estão em `auditoria/`.
- Lei seca:
  - `oficial.json`: artigos e jurisprudência já revisados (CF, CP, CPP e leis penais especiais).
  - `leis_drive.json`: artigos de leis compiladas, conferidos dispositivo a dispositivo com a publicação original no Senado Federal
    e, nas linhas alteradas, com o texto da lei alteradora.
  - `leis_federais.json` / `leis_federais2.json`: artigos sem alteração posterior (Senado Federal) e redações vigentes tiradas das leis alteradoras.
  - `cesp.json`: Constituição do Estado de SP (compilação da ALESP, redação vigente).
  - `feminicidio.json`: CP, art. 121-A (Lei 14.994/2024).
- `temas.json`: temas de redação com textos de apoio.
