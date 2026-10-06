# gcm_portugues: revisão de nível (GCM Geral, bancas municipais de nível médio)

Entrada: gcm_portugues_base.json (13 itens, 65 questões). Saída: gcm_portugues_nivel.json.

## Diagnóstico
O material já estava, em geral, no nível médio, com aulas de 358 a 439 palavras.
- **Acima do nível ou problemático:**
  - Uma questão de imperativo usava a 2ª pessoa do plural ("aguardai").
  - A regência "perdoar o colega" é tema de divergência entre gramáticos.
  - Algumas exceções eram raras: "lambujem", "recauchutar".
  - Havia termos técnicos sem necessidade, como "derivação imprópria".
  - Uma aula citava apenas a VUNESP, embora o concurso GCM use várias bancas.
- **Abaixo do esperado:**
  - Só 5 das 13 aulas tinham uma seção de dicas de prova, e nenhuma se chamava "Bizu de prova".
  - A lista de tempos verbais estava toda numa linha só.
  - Uma questão de referência de pronomes tinha uma alternativa artificial ("os guardas e os guardas").

## Alterações
- **Aulas ajustadas: 13 de 13.** Todas agora têm a seção "Bizu de prova", criada ou renomeada. Também houve simplificação de termos e reorganização em listas. As aulas ficaram com 358 a 491 palavras.
- **Questões reescritas: 3.** Leitura Q3, Flexão Q5 e Regência Q5. Em Classes de palavras Q5 só o comentário mudou, e o mapa mental desse assunto foi simplificado.
- Curso, disciplina, assunto e subassunto foram mantidos; continuam 6 flashcards e 5 questões por assunto.
- O arquivo passou em validar.py: 13 itens, 65 questões, 0 erros.

## Antes → depois
1. **Leitura, Q3.**
   - Antes: "Eles" e "lhes" retomam, respectivamente..., com a resposta "os guardas e os guardas".
   - Depois: "o pronome 'lhes' se refere a", com 5 opções de uma palavra só e a dica de substituir o pronome pelo termo.
2. **Flexão, Q5, alternativa C.**
   - Antes: "Senhores, sentem-se e aguardai a chamada" (usa a 2ª pessoa do plural, "vós").
   - Depois: "Senhor, sente-se e aguarda a chamada". O erro agora é misturar "você" e "tu", que é o que a prova cobra.
3. **Regência, Q5, alternativa B.**
   - Antes: "Paguei o funcionário e perdoei o colega pelo atraso" (ponto polêmico).
   - Depois: "Os alunos assistiram o jogo e obedeceram o professor". Os erros agora são indiscutíveis.
