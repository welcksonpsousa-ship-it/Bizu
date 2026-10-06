const P = require('../plano.js');
const est0 = require('../data/estrutura-curricular.json');
const assert = require('assert');
function curso(slug) {
  const c = est0.cursos.find((x) => x.slug === slug);
  const est = c.disciplinas.map((d, i) => ({ id: slug + i, nome: d.nome, questoes: d.questoes || null,
    assuntos: d.assuntos.map((a, j) => ({ id: slug + i + '-' + j, nome: a.nome, subassuntos: a.subassuntos, conteudo: { aula: 1, flashcard: 6, mapa_mental: 1, lei_seca: /Direito|Legisla|Constitui|Código|Estatuto|Lei /.test(d.nome + a.nome) ? 5 : 0, revisao: 1, questoes: 5 } })) }));
  return { cursoId: slug, est };
}
const tot = (bl) => bl.reduce((s, b) => s + b.min, 0);
let ok = 0; const t = (n, f) => { f(); ok++; console.log('ok  ' + n); };

for (const slug of ['pm-sp-soldado', 'gcm-geral']) {
  const c = curso(slug);
  const an = P.analisar({ ...c, dom: {}, porAssunto: {}, estudados: new Set() });
  console.log('\n=== ' + slug + ' · pesos/tier'); an.discs.slice().sort((a, b) => b.peso - a.peso).forEach((d) => console.log(String(d.peso).padStart(3), d.pct + '%', d.tier, d.di.nome, d.estimado ? '(est.)' : ''));

  t(slug + ': 1ª matéria do dia = maior peso, 2ª = peso médio, 3ª = menor peso (3h)', () => {
    const pl = P.cronograma(an, { h: 3, hSab: 4, hDom: 3, dias: 6, sab: true, dom: true }, new Date(2026, 9, 5), []);   // segunda 05/10/2026
    const segunda = pl[0]; assert.ok(segunda.itens.length);
    const pap = {}; segunda.itens.filter((x) => x.tipo === 'estudo').forEach((x) => { pap[x.papel] = pap[x.papel] || x; });
    assert.ok(pap.A && pap.B && pap.C, 'tem A, B e C com 3h');
    const tier = (id) => an.porAssunto[id].di && an.discs.find((d) => d.di.assuntos.some((a) => a.id === id)).tier;
    assert.strictEqual(tier(pap.A.assunto_id), 'A'); assert.strictEqual(tier(pap.B.assunto_id), 'B'); assert.strictEqual(tier(pap.C.assunto_id), 'C');
    assert.strictEqual(segunda.itens[0].papel, 'A', 'primeiro bloco é a 1ª matéria');
    assert.strictEqual(tot(segunda.itens), 180, 'soma = 3h');
  });
  t(slug + ': 1h/dia → só a 1ª matéria + questões; 1h30 → 1ª e 2ª', () => {
    const p1 = P.cronograma(an, { h: 1, dias: 5 }, new Date(2026, 9, 5), [])[0];
    assert.strictEqual(tot(p1.itens), 60); assert.deepStrictEqual([...new Set(p1.itens.filter((x) => x.tipo === 'estudo').map((x) => x.papel))], ['A']);
    const p15 = P.cronograma(an, { h: 1.5, dias: 5 }, new Date(2026, 9, 5), [])[0];
    assert.strictEqual(tot(p15.itens), 90); assert.deepStrictEqual([...new Set(p15.itens.filter((x) => x.tipo === 'estudo').map((x) => x.papel))], ['A', 'B']);
  });
  t(slug + ': fim de semana = simulado+correção / redação+revisão', () => {
    const pl = P.cronograma(an, { h: 2, hSab: 4, hDom: 3, dias: 5, sab: true, dom: true }, new Date(2026, 9, 5), []);
    const sab = pl[5], dom = pl[6];
    assert.deepStrictEqual(sab.itens.map((x) => x.tipo).slice(0, 2), ['simulado', 'correcao']);
    assert.ok(dom.itens.some((x) => x.tipo === 'redacao') && dom.itens.some((x) => x.tipo === 'revisao_geral'));
    assert.strictEqual(tot(sab.itens), 240); assert.strictEqual(tot(dom.itens), 180);
  });
  t(slug + ': revisões 24h e 7 dias entram no plano após estudar', () => {
    const pl = P.cronograma(an, { h: 2, hSab: 4, hDom: 3, dias: 7, sab: true, dom: true }, new Date(2026, 9, 5), []);
    const est1 = pl[0].itens.filter((x) => x.tipo === 'estudo' && !x.reforco)[0].assunto_id;
    assert.ok(pl[1].itens.some((x) => x.tipo === 'revisao' && x.assunto_id === est1), 'revisão no dia seguinte');
    pl.forEach((d) => { if (d.itens.length) assert.ok(d.itens.every((x) => x.min >= 5), 'blocos ≥5min'); });
  });
  t(slug + ': dados do aluno mudam a ordem no "O que estudar"', () => {
    const d0 = c.est[0], d1 = c.est[1];
    const porAssunto = {}; d0.assuntos.forEach((a) => { porAssunto[a.id] = { acertos: 9, total: 10 }; });   // domina a 1ª disciplina
    const dom = {}; d0.assuntos.forEach((a) => { dom[a.id] = 4; });
    const an2 = P.analisar({ ...c, dom, porAssunto, estudados: new Set() });
    const s = P.sessaoHoje(an2, 90, []);
    assert.notStrictEqual(s.A.di.id, d0.id, 'disciplina dominada deixa de ser o foco');
    assert.strictEqual(tot(s.blocos), 90);
  });
  t(slug + ': assunto com acerto baixo vira ponto fraco e entra no fechamento', () => {
    const a = c.est[2].assuntos[0]; const porAssunto = {}; porAssunto[a.id] = { acertos: 1, total: 8 };
    const an2 = P.analisar({ ...c, dom: { [a.id]: 2 }, porAssunto, estudados: new Set() });
    assert.strictEqual(an2.porAssunto[a.id].tipo, 'fraco');
    const s = P.sessaoHoje(an2, 90, []);
    const F = s.blocos.find((b) => b.papel === 'F'); assert.ok(F);
    assert.strictEqual(F.itens[0].info.a.id, a.id, 'fechamento ataca o ponto fraco');
  });
  [30, 45, 60, 75, 90, 120, 150, 180, 240].forEach((m) => t(slug + ': sessão de ' + m + ' min soma exatamente ' + m, () => {
    const s = P.sessaoHoje(an, m, [{ id: 'r1', assunto_id: c.est[0].assuntos[0].id }, { id: 'r2', assunto_id: c.est[1].assuntos[0].id }]);
    assert.strictEqual(tot(s.blocos), m);
    s.blocos.forEach((b) => (b.itens || []).forEach((it) => { assert.strictEqual(it.passos.reduce((x, p) => x + p.min, 0), it.min, 'passos somam o item'); assert.ok(it.passos.every((p) => p.min >= 5)); }));
  }));
}
console.log('\n' + ok + ' testes ok');
const pm = curso('pm-sp-soldado'); const anpm = P.analisar({ ...pm, dom: {}, porAssunto: {}, estudados: new Set() });
console.log('\n--- PM 90min hoje:'); const s = P.sessaoHoje(anpm, 90, []);
s.blocos.forEach((b) => { console.log(b.papel, b.min + 'min', b.d && b.d.di.nome); (b.itens || []).forEach((it) => console.log('   ', it.min + 'min', it.info.a.nome, '[' + it.info.tipo + ']', it.passos.map((p) => p.tipo + ':' + p.min).join(' '))); });
console.log('\n--- PM cronograma 3h (14 dias):');
P.cronograma(anpm, { h: 3, hSab: 4, hDom: 3, dias: 6, sab: true, dom: true }, new Date(2026, 9, 5), []).forEach((d) => console.log(d.data, (d.foco || []).join(' + ') || (d.folga ? 'folga' : ''), '|', d.itens.map((x) => (x.papel || x.tipo[0]) + x.min).join(' ')));
