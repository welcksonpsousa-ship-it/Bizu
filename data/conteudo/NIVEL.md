# Revisão de NÍVEL — concursos de NÍVEL MÉDIO (PM-SP Soldado / VUNESP e GCM Geral)

Pasta base: /tmp/claude-0/-home-user-Bizux/d945e988-92d3-59ea-85cd-e26870a04628/scratchpad
Entrada: conteudo/<arquivo>_base.json  (formato {"itens":[{curso,disciplina,assunto,aula{titulo,secoes[{titulo,texto}]},revisao{pontos},mapa{no_central,ramos[{label,filhos}]},flashcards[{pergunta,resposta}],questoes[{subassunto,enunciado,opcoes[5],gabarito,comentario,dificuldade}]}]})
Saída: conteudo/<arquivo>_nivel.json (mesmo formato) + conteudo/<arquivo>_nivel.md (relatório curto).

## Público
Candidato com ENSINO MÉDIO completo, muitas vezes sem formação jurídica, estudando sozinho. Prova objetiva de 5 alternativas.
PM-SP: banca VUNESP (enunciados diretos, cobra letra da lei e conceitos básicos; matemática de ensino fundamental/médio aplicada a situações do dia a dia).
GCM: bancas de concursos municipais de nível médio (VUNESP, IBAM, Instituto Mais, etc.) — mesmo nível.

## O que é "nível médio" aqui
- Linguagem simples e direta. Termo técnico só quando necessário, e sempre explicado na primeira vez ("ação penal pública incondicionada = o MP age sem depender da vontade da vítima").
- Direito: foco na LETRA DA LEI e nos conceitos básicos que caem em prova de nível médio. Jurisprudência apenas o essencial e muito cobrado (súmulas vinculantes e entendimentos famosos, como SV 11 algemas, guardas no SUSP), sem números de processos, sem debates doutrinários, sem correntes minoritárias, sem detalhes de Turma/Relator.
- Retire ou simplifique: discussões acadêmicas, exceções raríssimas, prazos/procedimentos que só caem em carreiras jurídicas (juiz, promotor, delegado), latinismos desnecessários.
- Matemática/RL: contas que se fazem à mão em poucos passos; nada de fórmulas avançadas fora do edital. Português: gramática normativa usual, sem polêmicas entre gramáticos.
- Informática: uso prático (Windows, Word, Excel, internet, e-mail, segurança básica), não técnico de TI.
- Aula: cerca de 300 a 550 palavras, com "• " para listas, exemplos práticos do cotidiano (de preferência do serviço policial/guarda quando couber) e um "Bizu de prova" (o que mais cai). Se uma aula está longa ou densa demais, enxugue; se está rasa demais para o assunto do edital, complete o essencial.
- Questões: estilo de prova de nível médio. Distribuição por assunto: 2 fáceis, 2 médias, 1 difícil — mas "difícil" de NÍVEL MÉDIO (pegadinha de letra da lei, conta com mais etapas), nunca nível de carreira jurídica. Reescreva questões que exijam conhecimento acima do nível (jurisprudência específica, doutrina profunda) ou que sejam triviais/óbvias demais. Comentário curto e didático explicando por que a correta está certa e o erro das principais erradas.
- Flashcards e revisão: frases curtas, objetivas, memorizáveis.

## Regras
- NÃO introduza erro. O conteúdo jurídico já foi auditado contra a lei vigente — mantenha os fatos. Se precisar conferir, use drive/*.txt (leis compiladas anotadas; só as linhas de texto legal valem), leis/cesp.txt (Constituição SP) e leis/leis.json.
- Mantenha curso/disciplina/assunto/subassunto exatamente iguais; mesmo número de itens, mesmas 5 questões por assunto (pode reescrever), 5 alternativas distintas, gabarito 0-4 (pode mudar de posição), 6 flashcards, mapa com ramos/filhos.
- Contas: confira toda questão de matemática/raciocínio com Python antes de gravar.
- Não use Supabase, Vercel, GitHub, git nem rede.
- Valide o JSON final (json.load) e a estrutura com: python3 conteudo/validar.py conteudo/<arquivo>_nivel.json
- Responda com: o que estava acima/abaixo do nível, quantas questões reescritas, quantas aulas ajustadas, e 3 exemplos de antes→depois.
