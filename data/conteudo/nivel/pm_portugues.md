# pm_portugues: revisão de nível (PM-SP Soldado / VUNESP)

Entrada: pm_portugues_base.json (9 itens, 45 questões). Saída: pm_portugues_nivel.json.

## Diagnóstico
O conteúdo já estava, em geral, no nível médio: gramática normativa usual, exemplos do serviço policial e aulas com 349 a 478 palavras. Nenhum assunto estava raso demais.
- **Acima do nível ou problemático:** a opção sobre "visar" sem "a" é tema de divergência entre gramáticos. Havia também a frase ambígua "caiu fora" (gíria para "ir embora") numa questão sobre sentido próprio e figurado. Alguns termos técnicos sobravam: símile, prosopopeia, zeugma, quórum.
- **Abaixo do esperado:** só 3 das 9 aulas tinham uma seção de dicas de prova, e nenhuma se chamava "Bizu de prova". A grafia "ponto-e-vírgula" estava desatualizada; pelo Acordo, escreve-se "ponto e vírgula".

## Alterações
- **Aulas ajustadas: 9 de 9.** Todas agora têm a seção "Bizu de prova", criada ou renomeada. Também houve simplificação de termos e o "Método" de Leitura passou de lista numerada para lista com "• ". As aulas ficaram com 388 a 499 palavras.
- **Questões reescritas: 3.** Sentido figurado Q5, Regência Q3 e Crase Q5. Pontuação Q5 teve só o comentário ajustado.
- Curso, disciplina, assunto e subassunto foram mantidos; continuam 6 flashcards e 5 questões por assunto.
- O arquivo passou em validar.py: 9 itens, 45 questões, 0 erros.

## Antes → depois
1. **Sentido figurado, Q5, frase III.** Antes: "O paraquedista caiu fora da área demarcada" ("cair fora" também é gíria). Depois: "O paraquedista caiu no meio do campo de futebol." O sentido próprio ficou inequívoco.
2. **Regência, Q3, alternativa E.** Antes: "ele visava o cargo de sargento" (ponto polêmico). Depois: "ele obedeceu o regulamento sem reclamar". O erro agora é indiscutível: obedecer pede "a".
3. **Crase, Q5, alternativa A.** Antes: "os marinheiros voltaram à terra" (exceção pouco usual). Depois: "ficaram cara à cara com o suspeito". A regra das palavras repetidas é muito cobrada.
