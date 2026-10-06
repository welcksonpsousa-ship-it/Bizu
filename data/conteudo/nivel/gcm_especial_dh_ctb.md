# Revisão de nível: gcm_especial_dh_ctb

Entrada: `gcm_especial_dh_ctb_base.json`. Saída: `gcm_especial_dh_ctb_nivel.json`, com 18 itens e 90 questões. O validar.py acusou 0 erros. O script de geração está em `scratchpad/nivel_dhctb.py`.

## Diagnóstico
- **Acima do nível:**
  - Idosa: citava a ADI 3.096, um número de processo do STF.
  - Ambientais: falava em transação penal ligada à composição prévia do dano, assunto de carreira jurídica.
  - Drogas: usava "norma penal em branco" e "presunção relativa". Também trazia dosimetria e isenção por dependência.
  - Abuso: falava em coisa julgada entre as instâncias.
  - ECA: tratava da identificação compulsória.
  - Dados: detalhava improbidade.
  - Vários termos técnicos apareciam sem explicação: crime subsidiário, curatela, tomada de decisão apoiada, biopsicossocial, inimputável, regresso, entre outros.
- **Abaixo do nível ou com problema de formato:**
  - Nenhuma aula tinha "Bizu de prova".
  - Cinco aulas passavam de 550 palavras: Desarmamento (631), Drogas (599), Guarda (580), ECA (577) e Abuso (544, que ficaria acima de 550 com o bizu).
  - Algumas questões eram triviais ou repetidas. Exemplos: "ação penal é pública incondicionada" usada como questão média; a difícil de mobilidade reduzida tinha a alternativa absurda "alta estatura"; a difícil de obras na via era óbvia.

## Alterações
- **Aulas:** as 18 foram ajustadas. Todas ganharam "Bizu de prova", e as longas foram enxugadas para ficar entre 441 e 549 palavras. Os termos técnicos foram explicados ou trocados por linguagem simples.
- **Questões:** 8 foram reescritas ou alteradas.
  - Ambientais: a questão média agora cobra a substituição da pena quando ela é menor que 4 anos.
  - Racismo crime: a questão média agora é sobre injúria racial em um bar.
  - Idosa: a difícil virou uma pegadinha do art. 94 com crime de pena máxima de 1 ano.
  - Pessoa com deficiência: a difícil agora cobra discriminação feita por jornal, com pena de 2 a 5 anos.
  - Princípios: a fácil teve alternativas erradas trocadas.
  - Sinalização: a fácil cobra a placa octogonal e a difícil cobra apito contra semáforo verde.
  - Infrações: a difícil virou um cálculo de velocidade (81 km/h em via de 60 = 35% acima, logo grave), conferido em Python.
- **Revisão, mapa e flashcards:** ajustes pontuais em Ambientais (saiu a transação penal) e em Idosa (frases encurtadas).
- **Fatos jurídicos:** mantidos. As penas novas citadas foram conferidas em drive/13146.txt (art. 88, §2º), drive/10741.txt (arts. 94 e 96) e drive/ctb.txt (arts. 89, 90 e 218).
