# Revisão de nível: gcm_guardas_penal

Entrada: `conteudo/gcm_guardas_penal_base.json` (idêntica a `_auditado.json`). Saída: `conteudo/gcm_guardas_penal_nivel.json`.
Estrutura mantida: 13 itens, 65 questões (5 por assunto: 2 fáceis, 2 médias, 1 difícil), 6 flashcards por item. Curso, disciplina, assunto e subassunto não mudaram. `validar.py` acusou 0 erros.

## Diagnóstico
- **Acima do nível:** aulas longas e densas em Penal e Processo Penal, que chegavam a 740 palavras. Havia detalhes de carreira jurídica: causa superveniente, crime agravado pelo resultado, extensões de território, rol completo de qualificadoras e causas de aumento do roubo e do furto, hipóteses de representação nas imunidades, ação controlada e flagrante diferido, dados sobre filhos no auto, cartas e documentos do defensor na busca, perseguição em outra jurisdição, conexão e continência e remessa ao juízo comum no JECrim, mandato de corregedor e ouvidor e suspensão do porte. Uma questão (fé pública, Q3) dependia só de jurisprudência (fita adesiva na placa).
- **Abaixo do nível:** 5 questões com distratores absurdos ou óbvios demais ("só à noite", "estacionar em local proibido", "apenas quando houver filmagem", "extinguir as polícias civis"). Uma questão média de ingresso na guarda era trivial (candidato de 17 anos).
- **Faltava:** nenhuma aula tinha uma seção "Bizu de prova", e vários termos técnicos apareciam sem explicação: abolitio criminis, hediondo, representação, crime permanente, nota de culpa, relaxar a prisão, corpo de delito, termo circunstanciado, PNSPDS, puerpério.

## Números
- **Aulas ajustadas:** 13 de 13. Todas ganharam "Bizu de prova", explicação de termos e exemplos práticos. Ficaram entre 420 e 547 palavras. Itens enxugados: 0, 4, 5, 6, 9, 10 e 11.
- **Questões reescritas:** 7.
  - Estatuto Q2
  - SUSP Q0
  - Uso da força Q1
  - Algemas Q1
  - Parte Geral Q4 (redação e comentário)
  - Fé pública Q1 e Q3
- **Mapas ajustados:** 3 (itens 6, 10 e 11), para acompanhar o conteúdo retirado.
- **Revisão e flashcards:** já eram curtos e corretos, por isso foram mantidos.
- **Fatos:** nenhum fato novo. Os trechos reescritos do art. 311 do CP foram conferidos em `drive/cp.txt`, e os arts. 7º, 10, 13 e 15 da Lei 13.022 em `leis/leis.json`.

## Antes → depois
1. **Estatuto Q2 (média)**
   - Antes: "candidato com 17 anos… é correto afirmar que ele" (trivial).
   - Depois: "NÃO é requisito básico…", com o gabarito "ter prestado serviço militar por, no mínimo, 1 ano". A pegadinha está na letra da lei: ela exige só a *quitação* com as obrigações militares.
2. **Fé pública Q3 (média)**
   - Antes: fita adesiva na placa, segundo "o entendimento dos tribunais superiores".
   - Depois: servidor do trânsito que fornece informação oficial para registrar carro com chassi remarcado. Ele incorre nas mesmas penas (art. 311, § 2º, I), ou seja, a questão passa a cobrar a letra da lei.
3. **Aula de Patrimônio (740 → 514 palavras)**
   - Saíram o rol completo de qualificadoras e causas de aumento, as hipóteses de representação nas imunidades e as qualificadoras do dano.
   - Ficaram o essencial e um Bizu: "Sem violência = furto; com violência = roubo; violência LOGO DEPOIS = roubo impróprio; precisa da colaboração da vítima = extorsão; filho que furta pai com 60+ NÃO tem imunidade".
