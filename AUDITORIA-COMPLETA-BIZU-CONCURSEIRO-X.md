# Auditoria completa — Bizu do Concurseiro X

Data: 07/10/2026 · Cursos: PM-SP Soldado e GCM Geral · O Bizu Delta X **não foi alterado** (só consultas de leitura para curadoria de vídeos).

## 1. Estrutura encontrada (preservada)
Curso → Disciplina → Assunto → Subassunto, REDAÇÃO no lugar de Discursiva, sem Prova Oral.

| Curso | Disciplinas | Assuntos | Subassuntos |
|---|---|---|---|
| PM-SP Soldado | 5 | 42 | 114 |
| GCM Geral | 15 | 84 | 156 |

Nada foi apagado ou reconstruído; todas as funções que já funcionavam foram mantidas (login, plano/cronograma, O que estudar, banco de questões, treino, provas reais, redação, revisões, domínio).

## 2. Problemas encontrados
- Materiais **idênticos duplicados** entre PM e GCM (cópias da mesma lei seca, jurisprudência e flashcards).
- Tela de Simulados misturava provas reais e simulados em uma lista só.
- Aula sem vídeo; sem aba de mentor.
- Um bug de ambiguidade no banco de dados (PGRST201) ao relacionar materiais e assuntos, causado pela tabela de vínculos — detectado e corrigido na hora (ver item 3).
- Sem controle visível de duplicidade no painel admin.

## 3. Corrigido
- Vínculo material↔assunto reestruturado (junção sem FK para assunto; o curso é resolvido no código) — materiais e estrutura voltaram a carregar normalmente.
- Duplicatas idênticas PM×GCM removidas e substituídas por **um material vinculado aos dois cursos** (item 6).
- Simulados separados em **Provas reais | Simulados**.

## 4. Criado
- Compartilhamento inteligente de materiais (tabela de vínculos + rota admin com simulação antes de executar).
- Player de YouTube embutido na Aula + aba admin **Vídeos**.
- Abas **Provas reais | Simulados** (PM e GCM) e campos admin: categoria, número, data da prova, banca, cargo, links de prova/gabarito/gabarito comentado, publicado.
- Painel de **controle de duplicidade** no admin.
- **Chat X** (aba nova).

## 5. Matérias e assuntos
**PM-SP (5 disciplinas / 42 assuntos):** Língua Portuguesa e Interpretação de Texto (9), Matemática (14), Conhecimentos Gerais (5), Noções Básicas de Informática (8), Noções de Administração Pública (6).

**GCM Geral (15 disciplinas / 84 assuntos):** Língua Portuguesa (13), Matemática (12), Raciocínio Lógico (8), Noções de Informática (10), Atualidades e Realidades Municipais (4), Direito Constitucional (5), Legislação Específica das Guardas e Segurança Pública (4), Direito Penal (6), Direito Processual Penal (3), Legislação Penal Especial (5), Legislação de Proteção a Grupos Vulneráveis (4), Direitos Humanos (5), Código de Trânsito Brasileiro (2), Direito Administrativo (1), Legislação Municipal (2).

## 6. Mapa de compartilhamento PM × GCM
Regra: só compartilha quando o conteúdo é realmente o mesmo; nome parecido não basta.

| Disciplina | Assunto | PM | GCM | Decisão |
|---|---|---|---|---|
| Língua Portuguesa | Colocação pronominal | sim | sim | **Compartilhado** (aula, mapa mental, revisão) |
| Língua Portuguesa | Concordância | sim | sim | **Compartilhado** (aula, mapa mental, revisão) |
| Língua Portuguesa | Crase | sim | sim | **Compartilhado** (aula, mapa mental, revisão) |
| Língua Portuguesa | Pontuação | sim | sim | **Compartilhado** (aula, mapa mental, revisão) |
| Língua Portuguesa | Regência | sim | sim | **Compartilhado** (aula, mapa mental, revisão) |
| Matemática | Porcentagem | sim | sim | **Compartilhado** (aula, mapa mental, revisão) |
| Matemática / Raciocínio Lógico | Razão e proporção | sim | sim | Base + complemento (flashcards/questões próprios) |
| Matemática | Resolução de situações-problema | sim | sim | Base + complemento |
| Matemática | Noções de geometria | sim | sim | Base + complemento |
| Informática | Internet | sim | sim | Base + complemento |
| Informática | Correio eletrônico | sim | sim | Base + complemento |
| Conhecimentos Gerais | Atualidades | sim | sim | **Separado** (recortes e editais diferentes) |

Além disso, **40 materiais idênticos** (29 lei seca, 6 jurisprudência, 5 flashcards) viraram um registro único vinculado aos dois cursos. Total: **58 vínculos compartilhados** (40 idênticos + 18 em nível de assunto). Flashcards dos 6 assuntos compartilhados ficaram **separados** de propósito, para não perder cartões diferentes de cada curso. Materiais compartilhados mostram o selo “Material compartilhado PM-SP + GCM”.

## 7. Conteúdo específico (não compartilhado)
Tudo o que não aparece acima — no PM: Noções de Administração Pública e demais assuntos próprios; no GCM: Direito Constitucional, Penal, Processual Penal, Legislação Penal Especial, Grupos Vulneráveis, Direitos Humanos, CTB, Direito Administrativo, Legislação Municipal e Guardas. Questões de cada curso são **separadas** (nenhuma questão copiada entre cursos).

## 8. Quantidades (publicadas)
| Item | PM-SP | GCM |
|---|---|---|
| Aulas | 40 | 80 |
| Mapas mentais | 40 | 80 |
| Revisões rápidas | 40 | 80 |
| Flashcards | 252 | 499 |
| Lei seca | 89 | 353 |
| Jurisprudência | 4 | 36 |
| Questões reais (publicadas) | 650 | 0 |
| Questões autorais (rotuladas) | 293 | 1005 |
| Vídeos YouTube | 50 (42 de 42 assuntos) | 127 (81 de 84 assuntos) |

(Contagens incluem materiais compartilhados em cada curso.) O PM tem 827 questões reais extraídas das 16 provas; as demais estão em revisão/anuladas/desatualizadas, conforme `AUDITORIA-BANCO-QUESTOES-BIZU.md`.

## 9. Provas reais
Mantidas todas: **16 provas reais PM-SP (VUNESP)** com prova, gabarito e gabarito comentado por link do Drive. GCM não tem provas reais cadastradas ainda (a aba mostra mensagem clara).

## 10. Estrutura de simulados
Aba **Simulados** pronta para PM e GCM. Campos: título, número, curso, cargo, banca, data, prova, gabarito, gabarito comentado, link do Drive, publicado/não publicado.
- **PM-SP:** 10 simulados autorais de Soldado (60 questões + redação, perfil VUNESP) importados da pasta “SD PM SP” do Drive, cada um com prova e gabarito comentado. Cópias “- Copia” foram ignoradas.
- **GCM:** 10 simulados autorais já existentes (arquivos do Drive) foram mantidos e aparecem na aba Simulados.

## 11. Duplicidade (“uma questão, um uso”)
Verificação atual: 2130 questões no banco, **0 hash repetido, 0 grupos de texto repetido**. Simulados e provas são arquivos do Drive (acervo independente) e não consomem questões do banco; o banco bloqueia repetição por hash e por texto+alternativas. Questões do banco extraídas de prova real ficam identificadas pela prova de origem.
**Ponto de decisão:** o comando anterior pedia extrair as questões das provas reais para o banco; a regra nova pede não repetir. Mantive as questões já extraídas (com origem identificada) e não criei nenhuma questão autoral duplicando prova real. Se preferir, posso marcá-las como `duplicada` para retirá-las do treino.

## 12. Chat X
Aba nova, mentor integrado aos dados do aluno (curso, edital, desempenho, erros, revisões, tempo, cronograma, simulados, domínio). Responde por regras sobre dados reais e, quando faltam dados (menos de 10 questões, por exemplo), avisa em vez de inventar. Ações por botão: FAZER QUESTÕES, REVISAR ASSUNTO, ABRIR AULA, ABRIR LEI SECA, VER FLASHCARDS, FAZER SIMULADO, APLICAR AO CRONOGRAMA (e plano do dia). Testado nos dois cursos.
**Limitação:** perguntas abertas (explicar conceito/lei) exigem o modelo de IA, que **não está ativado** — falta o segredo `ANTHROPIC_API_KEY` na função `cx-api`. Sem ele, o Chat X responde que não tem como responder em vez de inventar.

## 13. Vídeos
Apenas vídeos reais do YouTube, curados a partir dos vídeos verificados do Delta X (somente leitura), validados por oEmbed e embutidos por iframe (`youtube-nocookie`); sem download nem hospedagem. Todos os assuntos do PM têm vídeo; no GCM, 3 assuntos que variam por município (História e Geografia do município; Estatuto dos servidores municipais; Leis e decretos municipais da Guarda) ficam sem player, pois não existe aula única válida para todos (nada inventado). Em Atualidades os vídeos são datados (retrospectiva set/2026 no GCM) e devem ser trocados periodicamente. Os vídeos foram buscados por assunto no YouTube, conferidos pelo título e validados como incorporáveis e a aba admin **Vídeos** permite adicionar com validação. Recomenda-se revisar manualmente 3 associações menos certas (injúria racial, Estatuto do Desarmamento, falsificação).

## 14. Dependências externas
YouTube (vídeos), Google Drive (provas/simulados, links “qualquer pessoa com o link”), Supabase (banco e função), Vercel (site), ANTHROPIC_API_KEY (opcional, só para perguntas abertas do Chat X).

## 15. Desempenho
Nenhuma lista de questões embutida no HTML; tudo carrega sob demanda (questões por busca/treino, vídeos ao abrir a aula). Testado em desktop e mobile 390px sem rolagem horizontal.

## 16. Testes realizados
Login, troca de curso, Simulados (abas nos dois cursos), Aulas com selo e player, Chat X (rotina do dia, cronograma, pergunta aberta, falta de dados), admin Vídeos/Simulados/Duplicidade, mobile 390px, zero erros JS no console.

## 17. Itens deixados para a etapa de PDFs
Geração dos PDFs (Bizu PDF) de cada assunto/curso e do material compartilhado — **não feita nesta etapa**, conforme o comando.

## 18. Limitações conhecidas
- Dados de teste de tentativas do administrador não puderam ser apagados por API (permanecem na conta de teste).
- GCM não tem provas reais cadastradas; PM não tem simulados publicados.
- Flashcards dos assuntos compartilhados continuam separados por curso.

## 19. Simulados PM-SP importados do Drive (08/10/2026)
Fonte: pasta MENTORIA/SIMULADOS/SD PM SP. Arquivos públicos (abrem e baixam sem login). Distribuição por prova: 20 Português, 15 Matemática, 15 Conhecimentos Gerais, 5 Informática, 5 Administração Pública.

**Alerta de duplicidade (regra “uma questão, um uso”):** dos 600 itens dos 10 PDFs, só **201 são questões distintas**. A partir do Simulado 2, o número de questões já vistas em simulados anteriores é, por simulado: S2 31 · S3 31 · S4 42 · S5 59 · S6 54 · S7 56 · S8 44 · S9 41 · S10 41 (o Simulado 1 é todo inédito). Em contrapartida, não há sobreposição relevante com o banco de questões do site. **Resolvido em 08/10/2026 (item 20).**

## 20. Simulados PM-SP 2 a 10 reescritos (08/10/2026)
- 445 questões repetidas foram substituídas por questões inéditas (175 Português, 130 Matemática, 100 Conhecimentos Gerais, 20 Informática, 20 Administração Pública). Os 10 simulados passam a ter **600 questões diferentes** (o Simulado 1 ficou intacto, pois já era inédito).
- Conferência: nenhuma duplicata nem questão parecida com o banco ou entre si; Matemática calculada em Python; tamanho das alternativas equilibrado (a correta é a mais longa em menos de 25%); gabaritos distribuídos de forma uniforme (12 de cada letra nos simulados 2 a 8); segunda conferência cega por revisores independentes, com alternativas embaralhadas: 445 de 445 coincidiram, e 2 itens ambíguos foram corrigidos (“sentindo-se” e “tricésimo”). Atualidades datadas foram evitadas de propósito.
- Os PDFs novos (prova e comentado) estão hospedados no próprio site, em `/simulados/pm-soldado/`, e os links dos simulados 2 a 10 foram trocados. O Simulado 1 continua no Drive.
- Limitação: Administração Pública usa só a Constituição Federal e a LAI; não entraram questões da Constituição do Estado de SP nem do Decreto 68.155/2023, por falta de fonte oficial conferida.

## 21. Material da MENTORIA incorporado (08/10/2026)
- **319 materiais novos** no PM-SP, sem substituir nada: Português 102, Matemática 119, Conhecimentos Gerais 56 e Informática 42 (revisões “Bizus da Mentoria”, flashcards e aulas “Complemento da Mentoria”). Fontes: apostila Soldado (Português e Matemática), Geografia, História e Informática. Tudo reescrito em palavras próprias e conferido antes de entrar.
- **Erros encontrados na própria apostila (não usados):** dízimas periódicas operadas truncando o período; soma de frações “somando expoentes”; gabaritos inconsistentes em MMC e Sistema métrico; volume e capacidade invertidos; crase em “dias da semana”; França/Europa como crase facultativa; V. Ex.ª para Vossa Eminência; atalhos errados do Word e do Excel; Cortana/Win+F obsoletos; OTAN com Finlândia em 1949; “golpe de 1933”; ANL no lugar de ALN; NAFTA como bloco atual; Itaipu “maior do mundo”; soja “2º produtor”; camada de ozônio atribuída ao CO2.
- **Lacunas do edital apontadas pela apostila** (viraram aulas complementares ou ficam como sugestão): regra de três composta, média ponderada/mediana/moda, conjuntos e Venn, arroba/quilate/alqueire, polígonos e ângulo do relógio, o Brasil nas guerras mundiais, Era Vargas e República de 1946, blocos econômicos, problemas ambientais urbanos, massas de ar e bacias.
- Sem aproveitamento: pastas ADM e Atualidades da mentoria (vazias ou só modelo); Etapas (TAF, psicológico, médico, documentação) e parte administrativa ficam fora do escopo do site. O edital verticalizado da pasta é de 2021 (cita Office 2010 e Decreto 58.052/12); o site segue o edital 2026 e Office 2016.

## 22. Simulados GCM refeitos (08/10/2026)
- **Problemas encontrados nos arquivos anteriores:** 530 questões no total, mas só 139 diferentes; os Simulados 8, 9 e 10 tinham 30, 40 e 40 questões (o título dizia 60); a grade de gabaritos era quase toda “A”; e os dois cursos compartilhavam questões idênticas.
- **O que foi feito:** os 10 simulados foram refeitos do zero, com **600 questões inéditas (60 por simulado)**, mesma estrutura em todos: 12 Português, 8 Matemática/RLM, 5 Informática, 3 Atualidades estruturais, 4 Constituição/Segurança Pública, 8 Legislação das Guardas (Lei 13.022, SUSP, Lei 13.060, SV 11), 4 Direito Penal, 4 Processo Penal, 5 Direitos Humanos e grupos vulneráveis, 2 Trânsito, 3 Administração Pública e 2 Legislação Penal Especial. Sem questões de legislação municipal.
- **Conferência:** nenhuma duplicata nem parecida com as antigas, com o PM ou entre si; Matemática calculada em Python; gabaritos uniformes (12 de cada letra por simulado); alternativas equilibradas; revisão cega por 5 revisores independentes com alternativas embaralhadas (600 de 600 coincidiram) e checagem jurídica das 320 questões de legislação contra o texto oficial do Planalto (1 explicação desatualizada corrigida, 3 ajustes de redação). Artigos alterados recentemente foram evitados.
- **Limitação:** a Súmula Vinculante 11 e alguns conceitos de Direitos Humanos/mediação foram conferidos de memória (site do STF fora do ar para os revisores); recomenda-se uma leitura final de professor de Direito.
- Os PDFs ficam em `/simulados/gcm/` no site e os links dos simulados GCM foram trocados; os arquivos antigos do Drive deixaram de ser usados.

## 23. Comentários, figuras, provas oficiais e ampliação do banco (12–13/10/2026)
- **Comentários dos alunos:** em cada questão, todos os alunos veem os comentários; há denúncia (3 denúncias distintas ocultam o comentário), limite de 12 por hora para alunos e moderação pelo administrador. A equipe responde como “Equipe Bizu”.
- **Figuras e texto de apoio:** 125 questões reais do PM que dependiam de tirinha, gráfico, tabela ou mapa foram completadas. Cada figura foi recortada da prova original (PNG de até 150 KB, em `/img/q/`), conferida visualmente e anexada à questão; o texto de apoio compartilhado vai junto do enunciado. Testado no site publicado (tirinha da prova de 2015 aparece entre enunciado e alternativas). Onde as alternativas eram figuras, elas foram transcritas por descrição.
- **Provas oficiais novas (PM-SP):** Soldado 2010 (50 questões) e Aluno-Oficial 2024 (49) importadas com gabarito oficial. Questões fora do edital do Soldado ficaram de fora; as de nível superior ficam como “Acima” e não aparecem por padrão.
- **Não importado, por decisão registrada:** Sargento 2022 e Cabo 2023 (as provas têm 4 alternativas e o banco aceita 5; não foi inventada uma quinta); Soldado 2021 (sem gabarito no Drive); Aluno-Oficial 2021–2023 (não processadas ou sem arquivo); simulados pagos de terceiros (Projeto Caveira, Gran, Monster etc.), por direitos autorais, até haver autorização do administrador.
- **Questões autorais novas:** 1.058 para o GCM (14 frentes) e 397 de complemento (248 PM, 149 GCM). Todas passaram por: verificação de duplicidade contra banco, simulados e entre si (50 descartadas); verificação às cegas por avaliadores independentes com alternativas embaralhadas (a resposta deles coincidiu com o gabarito em todas as importadas); descarte das marcadas como ambíguas, duplas ou desatualizadas (13).
- **Correção de conteúdo desatualizado:** o art. 94 do Estatuto da Pessoa Idosa foi reescrito pela Lei 15.163/2025 (não manda mais aplicar a Lei 9.099). A questão 53 do Simulado GCM 9 foi trocada e os PDFs refeitos.
- **Cobertura atual (publicadas e compatíveis):** PM 1.395 questões em 42 assuntos (mínimo 21); GCM 2.212 em 84 assuntos (mínimo 12 em “Internet”; os demais têm 24 ou mais). Todos os assuntos dos dois cursos têm material (aula, revisão, flashcards) e questões.
- **Limitações:** a verificação às cegas foi feita por modelos de IA, e vários consultaram a lei só de memória; recomenda-se uma leitura final humana das questões de direito. Chat X ainda sem chave de LLM para perguntas abertas. 3 assuntos do GCM seguem sem vídeo do YouTube.

## 24. Comando mestre: repetição, Minha Conta, contas de teste e apostilas em PDF (13/10/2026)
- **Questões:** registro de uso (`cx_uso_questoes`) e montagem de simulado só com questões não usadas; se faltar inédita, o administrador é avisado e o sistema não completa com repetida. 16 duplicatas marcadas (não apagadas). Mais 4 questões do banco foram para `revisao` após a revisão das apostilas (2 repetidas, 1 ambígua, 1 controversa).
- **Minha Conta:** perfil pessoal e de preparação, foto, troca de senha e pedido de troca de e-mail com confirmação. A confirmação por e-mail **não funciona em domínio bizux.com** (o Auth recusa); só os caminhos de erro foram testados.
- **Contas aluno01 a aluno10@bizux.com:** criadas no Auth, só aluno, 6 meses de acesso aplicados no servidor (fim em 13/04/2027), troca de senha exigida no primeiro acesso. Teste de expiração controlada feito.
- **Apostilas em PDF:** 114 assuntos escritos, conferidos por revisores independentes e gerados (capa, sumário conferido, objetivos, texto, tabelas, exemplos, pegadinhas, mapa mental, 10 questões com gabarito comentado, resumo, fontes). **114 publicados** (`/apostilas/<slug>.pdf`, abrem no navegador e baixam); os 12 assuntos iguais entre PM e GCM usam o mesmo arquivo. As apostilas de `leitura-e-interpretacao-de-textos` (10 questões) e `classes-de-palavras-...` (9 questões) receberam exercícios autorais novos, escritos e conferidos por uma única pessoa-IA, sem verificação cega independente. Questões com comentário fraco ou defeito foram retiradas das apostilas, não do banco, salvo as 4 acima.
- **Limites:** a revisão foi feita por modelos de IA; leis muito recentes (CPP art. 310, CP arts. 217-A, Maria da Penha 2026, ECA 2025/26) e temas do STF devem ser relidos por pessoa antes de uso intensivo. Incidência só aparece onde o banco tem questões reais.

## 25. Comentários genéricos do banco reescritos (13/10/2026)
- 984 questões publicadas tinham comentário genérico (844 reais do PM, 135 autorais do GCM, 5 autorais do PM). Cada uma foi resolvida de novo, sem olhar o gabarito, por revisores IA (com Python nas contas e leitura das figuras), que escreveram um comentário específico de 250 a 700 caracteres.
- **929 comentários gravados** (backup dos textos antigos fora do site). Hoje restam 3 comentários curtos entre as 3.589 questões publicadas.
- **12 questões foram para `revisao`** (saem da prática dos alunos) por gabarito que não confere, enunciado ambíguo ou dado perdido na extração (destaque, figura, capacidade do tanque etc.). Elas precisam ser conferidas na prova original.
- Os comentários são de autoria própria e não foram revisados por pessoa. Citações de lei só foram mantidas quando o revisor confirmou o texto; casos de dúvida estão sinalizados nas observações dos revisores.

## 26. Provas de outros cargos só como questões, vídeos amplos e 4 alternativas (13/10/2026)
- **Simulados no site:** só existem simulados e provas de PM-SP Soldado e GCM Geral. As provas de outros cargos (Sargento 2022, Cabo 2023, Aluno-Oficial 2024, Soldado 2010) entram apenas como questões do banco, sem aparecer como simulado nem como prova.
- **Sargento 2022 e Cabo 2023:** importadas 43 e 31 questões (as provas têm 4 alternativas; o backend, versão 9, passou a aceitar 4 ou 5). Duas questões do Sargento foram deixadas de fora por serem quase iguais a questões que já estavam no banco. As 72 questões publicadas receberam comentário específico.
- **Vídeos:** os 3 assuntos que estavam sem vídeo (História e Geografia do município, Estatuto dos servidores municipais, Leis municipais da GCM) receberam 2 vídeos cada, de assunto mais amplo (urbanização, Lei 8.112 e Regime Jurídico, Estatuto Geral das Guardas Municipais).
- **Prova do Soldado 2021 (caderno PMES1903):** continua sem importar. O Drive só tem o caderno; o arquivo chamado "gabarito 2021" é uma página do Diário Oficial sem as respostas. Falta o arquivo do gabarito.
- **Chat X:** funciona com a chave `ANTHROPIC_API_KEY` nos segredos das Edge Functions do Supabase; sem ela responde só com regras internas.

## 27. Atualização geral (10/11/2026)
- **Questões:** busca simples (matéria, assunto, banca, dificuldade, quantidade), filtros extras recolhidos e 5 treinos rápidos; histórico e estatísticas preservados. Corrigida rolagem lateral no celular.
- **Lei Seca e Jurisprudência:** só matérias jurídicas do curso, agrupadas por matéria e ordenadas por artigo; troca de curso corrigida; 5 duplicatas ocultadas (não apagadas); corrigido o art. 245, § 4º do CPP.
- **Cronograma X:** exibição por semana (segunda a domingo) com navegação; plano e metodologia inalterados.
- **Notícias:** card no painel (meu curso / todos) com 12 notícias de fonte oficial (DOE-SP, Prefeitura de SP, Instituto Mais); administração publica/oculta. Não há atualização automática: a administração cadastra as notícias confirmadas.
- **Redação:** envio de PDF, DOCX ou TXT (texto extraído no navegador, original guardado em armazenamento privado), correção automática por IA após o anexo (4 critérios com nota e justificativa, erros com trecho, pontos fortes/fracos, sugestões), histórico com arquivo e nota. A correção só funciona com chave de IA configurada.
- **IA com vários modelos:** camada única (Anthropic, OpenAI, Gemini), ordem de preferência por função, fallback, limite diário por aluno (Chat X 40, redação 5), orçamento diário opcional, registro de uso, erros e custo; aba "Inteligência artificial" na administração. Sem chaves, as funções de IA ficam desativadas.
- **Cobertura do edital:** 126 assuntos auditados; relatório em `RELATORIO-COBERTURA-EDITAL.md`. 39 complementos de aula publicados (2 de Atualidades ocultos para revisão). Cobertura real: PM-SP 95,7% → 99,5%; GCM 89,1% → 99,8%.


## 28. Apostilas 2.0 — padrão editorial completo (11/11/2026)

- **114 PDFs** refeitos (cobrem os 126 assuntos; 12 de conteúdo comum PM/GCM usam o mesmo arquivo), total de 3076 páginas (de 21 a 37 por apostila).
- Mesmo padrão visual e editorial das apostilas do Bizu Delta X (estudado só em modo leitura; nada foi alterado lá), com a marca Bizu do Concurseiro X: capa, sumário, 11 a 13 seções (apresentação, base legal/teórica, conceitos, desenvolvimento, lei seca comentada, jurisprudência quando há base segura, quadro comparativo, aplicação na atividade policial/da guarda/na prova, pontos críticos, pegadinhas, 10 questões comentadas e resumo da véspera), caixas BIZU/ATENÇÃO/PEGADINHA/EXEMPLO e tabelas.
- Parte integrada ao final, com dados do próprio banco do site: mapa mental, lei seca, jurisprudência, bateria de até 10 questões publicadas e compatíveis (reais primeiro, com gabarito e comentário), revisão rápida (flashcards) e vídeos.
- Correções da auditoria incorporadas (ex.: improbidade art. 23 §5º após ADI 7.156/7.236; "intervirá" na flexão verbal; maus-tratos com hífen; aba padrão "Planilha1" no Excel; art. 245 §4º do CPP; Google Workspace; regra de três 42,97). Pontos sem fonte conferível (leis de 2026 não verificadas no Planalto) foram omitidos ou tratados de forma geral.
- Verificação automática: nenhum caractere perdido na renderização, nenhuma menção a outro produto, todas com título, tabela, caixas e gabarito em cada questão; registros `cx_apostilas` em versão 2.0 (126/126 publicados) e arquivos conferidos no site publicado.

## 29. Auditoria de matérias, assuntos, subassuntos, materiais e questões (12/11/2026)

**Estrutura e materiais**
- Nenhuma disciplina ou assunto do edital faltando nos dois cursos. Os 126 assuntos têm os 5 materiais (aula, revisão, flashcards, mapa mental e apostila).
- Atualidades: os 2 complementos que estavam ocultos foram checados em fontes oficiais (TSE, Senado, Agência Brasil), corrigidos e publicados. Com isso a cobertura do edital fica completa.
- Drive (pasta BIZUCON X): não havia arquivos novos para importar. Os simulados de PM e GCM continuam só na área de Simulados, para não repetir questões no banco.

**Questões**
- **Revisão:** as 62 questões que estavam em revisão foram decididas sem pendência manual.
  - 22 publicadas: algumas com o enunciado corrigido (grifo reconstruído ou contexto datado ajustado) e com comentário fundamentado.
  - 40 retiradas, cada uma com o motivo registrado: fora do edital (RDPM, Lei 10.261/68, Lei 10.177/98, LC 1.080/08 etc.), gabarito duvidoso, figura ausente, conteúdo datado ou norma não conferida.
- **Classificação:** 71 questões publicadas que estavam sem subassunto foram classificadas. As demais tratam de conteúdo do assunto que não cabe em nenhum subassunto listado e continuam ligadas ao assunto.
- **Questões autorais novas:** 254, com 5 alternativas e comentário, criadas para completar os subassuntos que tinham menos de 5 questões compatíveis (antes, 9 subassuntos da PM tinham zero).
- **Questões reais VUNESP do acervo Bizu (lido sem nenhuma alteração na origem):**
  - Cargos de origem: Soldado PM, Investigador, Escrivão, Agente, Papiloscopista e Guarda Municipal.
  - Critérios: só as compatíveis com cada edital; gabarito conferido; descartadas as que dependem de figura, as desatualizadas, as já existentes e as que ficaram com a resposta alterada por mudança de lei.
  - Resultado: 186 publicadas na PM e 256 na GCM (as que servem aos dois cursos têm uma cópia em cada).
- **Resultado final:**
  - PM-SP: 1.799 questões publicadas (1.130 reais), mínimo de 16 por assunto e de 5 por subassunto.
  - GCM: 2.580 publicadas (256 reais), mínimo de 25 por assunto e de 5 por subassunto.
  - Nenhuma questão em revisão.

## 30. Correção: assuntos aparecendo sem questões (12/11/2026)

- **Causa:** o contador de conteúdo de cada assunto lia no máximo 1.000 linhas por consulta. O banco da PM tem 1.799 questões e o da GCM tem 2.580, então assuntos com questões apareciam como "Conteúdo em preparação". O mesmo tipo de corte existia em mais três pontos:
  - a lista de flashcards e de lei seca do curso inteiro (corte em 200);
  - os filtros de questões respondidas, erradas e acertadas;
  - os totais do Painel e do Desempenho de quem passa de 1.000 respostas.
- **Correção (cx-api v12):** todas essas leituras passaram a ser paginadas.
- **Verificação no site publicado:**
  - todos os 126 assuntos mostram as questões, com soma igual ao banco (PM 1.799; GCM 2.580);
  - os 396 itens (assuntos e subassuntos) trazem questões na tela Questões;
  - os flashcards voltam completos (PM 522; GCM 504).

## 31. Prova PM-SP Soldado 2021 com gabarito oficial (12/11/2026)

- **Gabarito:** encontrado na internet, oficial e definitivo. É o Comunicado DP-22/321/21 da Diretoria de Pessoal da PM-SP, publicado no DOE de 04/06/2021 e disponível no site de concursos da PM. Corresponde à prova de 16/05/2021, Edital DP-1/321/21, caderno PMES1903/001, versão 1 (o mesmo caderno do Drive).
- **Conferência:** o gabarito definitivo é igual ao preliminar (DP-21/321/21, DOE de 18/05/2021). Nenhuma questão foi anulada e as contas de Matemática foram refeitas.
- **Questões no banco:** 60 transcritas e comentadas.
  - 54 publicadas como questões reais da PM.
  - 1 marcada como desatualizada: a Q49, sobre a Constituição do Chile, cujo contexto mudou depois de 2022.
  - 5 que dependem de figura (Q22, 28, 44, 45 e 52) ficam só no caderno.
- **Provas reais:** "PM-SP 2021 — Prova + gabarito comentado" foi publicada em ordem cronológica, com o caderno oficial, o gabarito oficial definitivo e o gabarito comentado (PDF de 31 páginas no padrão das apostilas). As provas reais de PM-SP Soldado no site passam a ser 17.
