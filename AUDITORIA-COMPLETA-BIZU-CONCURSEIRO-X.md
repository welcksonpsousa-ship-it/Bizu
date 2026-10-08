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
