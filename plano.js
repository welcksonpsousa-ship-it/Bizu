/* Bizu do Concurseiro X — motor de planejamento de estudo.
   Sem DOM: recebe dados e devolve planos, para poder ser testado em Node.

   Regras (concurso de nível médio, prova objetiva por disciplina + redação):
   - Cada disciplina tem um PESO (nº de questões na prova; quando o edital não informa, um peso estimado).
   - Cada assunto tem uma LACUNA (0 a 1): 1 = ainda não estudado; sobe quando o aluno erra questões
     e desce conforme acerta e marca domínio.
   - "O que estudar hoje": foca onde há mais PONTOS A GANHAR = peso × lacuna.
   - Cronograma: a 1ª matéria do dia é sempre de maior peso, a 2ª é de peso médio e, se sobrar tempo,
     a 3ª é de menor peso. Sobra de tempo vai para revisão e questões. Sábado = simulado e correção;
     domingo = redação e revisão geral. */
(function (root) {
  'use strict';

  // Pesos estimados quando o edital não traz o número de questões (varia por município).
  const PESOS_ESTIMADOS = {
    'gcm-geral': {
      'Língua Portuguesa': 20,
      'Legislação Específica das Guardas e Segurança Pública': 12,
      'Direito Constitucional': 10,
      'Direito Penal': 10,
      'Matemática': 8,
      'Legislação Penal Especial': 8,
      'Raciocínio Lógico': 6,
      'Direito Processual Penal': 6,
      'Legislação de Proteção a Grupos Vulneráveis': 5,
      'Direitos Humanos': 5,
      'Noções de Informática': 4,
      'Atualidades e Realidades Municipais': 4,
      'Código de Trânsito Brasileiro': 4,
      'Direito Administrativo': 3,
      'Legislação Municipal': 2,
    },
  };
  const ROTULO = { A: '1ª matéria', B: '2ª matéria', C: '3ª matéria' };
  const PAPEL_DESC = { A: 'maior peso na prova', B: 'peso médio', C: 'menor peso' };

  const r5 = (n) => Math.max(5, Math.round(n / 5) * 5);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  function pesoDisciplina(cursoId, di) {
    if (di.questoes) return { peso: di.questoes, estimado: false };
    const tab = PESOS_ESTIMADOS[cursoId] || {};
    return { peso: tab[di.nome] || 3, estimado: true };
  }

  // ---------- lacuna de cada assunto ----------
  function infoAssunto(a, di, ord, ctx) {
    const dom = (ctx.dom && ctx.dom[a.id]) || 0;
    const d = (ctx.porAssunto && ctx.porAssunto[a.id]) || {};
    const total = d.total || 0, acertos = d.acertos || 0;
    const estudado = dom > 0 || total > 0 || !!(ctx.estudados && ctx.estudados.has(a.id));
    const acc = total ? acertos / total : null;
    let tipo, gap;
    if (!estudado) { tipo = 'novo'; gap = 1; }
    else if (total >= 3) {
      const erro = 1 - (acertos + 1) / (total + 2);            // erro suavizado: poucas questões não enganam
      const domGap = dom > 0 ? 1 - dom / 4 : 0.5;
      gap = Math.max(0.05, 0.65 * erro + 0.35 * domGap);
      tipo = acc < 0.6 ? 'fraco' : 'bom';
    } else {
      const base = dom > 0 ? 1 - dom / 4 : 0.7;
      gap = Math.max(0.5, 0.85 * base + 0.05);                 // estudou mas ainda não praticou
      tipo = 'pratica';
    }
    return { a, di, ord, dom, total, acertos, acc, estudado, tipo, gap, prio: gap + (tipo === 'fraco' ? 0.15 : 0) };
  }

  function analisar(ctx) {
    const discs = ctx.est.map((di, i) => {
      const p = pesoDisciplina(ctx.cursoId, di);
      const assuntos = di.assuntos.map((a, j) => infoAssunto(a, di, j, ctx));
      const n = assuntos.length;
      const gapMedio = n ? assuntos.reduce((s, x) => s + x.gap, 0) / n : 0;
      const total = assuntos.reduce((s, x) => s + x.total, 0), acertos = assuntos.reduce((s, x) => s + x.acertos, 0);
      return { di, ord: i, peso: p.peso, estimado: p.estimado, assuntos, gapMedio, ganho: p.peso * gapMedio,
        novos: assuntos.filter((x) => x.tipo === 'novo').length, total, acertos, acc: total ? acertos / total : null };
    });
    const totalPeso = discs.reduce((s, d) => s + d.peso, 0) || 1;
    discs.forEach((d) => { d.pct = Math.round((d.peso / totalPeso) * 100); });
    // Faixas por "massa de peso": A = as que mais pesam (~28% da prova), B = até ~80%, C = o resto.
    const ordenadas = discs.slice().sort((x, y) => y.peso - x.peso || x.ord - y.ord);
    let acum = 0;
    ordenadas.forEach((d) => { const antes = acum / totalPeso; d.tier = antes < 0.28 ? 'A' : antes < 0.8 ? 'B' : 'C'; acum += d.peso; });
    const porAssunto = {};
    discs.forEach((d) => d.assuntos.forEach((x) => { porAssunto[x.a.id] = x; }));
    return { discs, totalPeso, porAssunto, estimado: discs.some((d) => d.estimado), cursoId: ctx.cursoId };
  }

  // ---------- passos de estudo de um assunto ----------
  const CUSTO = { novo: 30, fraco: 25, pratica: 20, bom: 15 };
  const TITULO_PASSO = {
    aula: 'Leia a aula e o “Bizu de prova”',
    lei_seca: 'Leia a lei seca do assunto',
    mapa_mental: 'Veja o mapa mental',
    flashcard: 'Flashcards: cubra a resposta e tente lembrar',
    revisao: 'Revise os pontos-chave',
  };
  function passosDe(info, min) {
    const c = info.a.conteudo || {};
    const tem = (k) => (c[k] || 0) > 0;
    let modelo;
    if (info.tipo === 'novo') modelo = [['aula', 0.35], [tem('lei_seca') ? 'lei_seca' : 'mapa_mental', 0.15], ['flashcard', 0.15], ['questoes', 0.35]];
    else if (info.tipo === 'fraco') modelo = [['revisao', 0.25], ['flashcard', 0.2], ['questoes', 0.55]];
    else if (info.tipo === 'pratica') modelo = [['revisao', 0.25], ['questoes', 0.75]];
    else modelo = [['flashcard', 0.3], ['questoes', 0.7]];
    modelo = modelo.filter(([k]) => k === 'questoes' || tem(k));
    while (modelo.length > 1 && min < 5 * modelo.length) {
      const i = modelo.findIndex(([k]) => k !== 'questoes' && k !== 'aula'); // corta o que é menos essencial
      modelo.splice(i < 0 ? 0 : i, 1);
    }
    const soma = modelo.reduce((s, [, p]) => s + p, 0);
    const passos = modelo.map(([k, p]) => ({ tipo: k, min: r5((p / soma) * min) }));
    let dif = min - passos.reduce((s, x) => s + x.min, 0);
    const maior = passos.reduce((m, x) => (x.min > m.min ? x : m), passos[0]);
    maior.min += dif;
    passos.forEach((p) => {
      p.titulo = p.tipo === 'questoes'
        ? (info.tipo === 'novo' ? 'Resolva as questões e leia cada comentário' : info.tipo === 'fraco' ? 'Refaça as questões e estude os comentários dos erros' : 'Resolva as questões do assunto')
        : TITULO_PASSO[p.tipo];
    });
    return passos;
  }

  // ---------- divisão do tempo do dia ----------
  const maxRevisoes = (M) => (M >= 240 ? 5 : M >= 150 ? 4 : 3);
  function alocar(M, nRev) {
    let rev = 0;
    if (nRev > 0) {
      rev = Math.min(Math.max(10, r5(M * 0.15)), 10 * Math.min(nRev, maxRevisoes(M)));
      rev = Math.min(rev, r5(M * 0.34));
    }
    const rem = M - rev;
    let sh;
    if (rem >= 150) sh = { A: 0.4, B: 0.28, C: 0.17, F: 0.15 };
    else if (rem >= 100) sh = { A: 0.45, B: 0.35, F: 0.2 };
    else if (rem >= 70) sh = { A: 0.55, B: 0.3, F: 0.15 };
    else if (rem >= 40) sh = { A: 0.7, F: 0.3 };
    else sh = { A: 1 };
    const al = { rev };
    Object.keys(sh).forEach((k) => { al[k] = r5(sh[k] * rem); });
    al.A += rem - Object.keys(sh).reduce((s, k) => s + al[k], 0);
    return al;
  }

  // Tira assuntos da fila da disciplina até acabar o tempo do bloco.
  function tomarAssuntos(d, minutos, est) {
    const fila = est.filas[d.di.id] || (est.filas[d.di.id] = d.assuntos.slice().sort((x, y) => y.prio - x.prio || x.ord - y.ord));
    const itens = []; let resta = minutos;
    while (resta >= 10 && itens.length < 4 && fila.length) {
      const i = est.cur[d.di.id] = est.cur[d.di.id] || 0;
      const base = fila[i % fila.length]; est.cur[d.di.id]++;
      if (itens.some((x) => x.info.a.id === base.a.id)) break;
      const visto = est.vistos.has(base.a.id);
      const info = visto ? Object.assign({}, base, { tipo: base.tipo === 'fraco' ? 'fraco' : 'pratica', reforco: true }) : base;
      est.vistos.add(base.a.id);
      let m = Math.min(CUSTO[info.tipo], resta);
      resta -= m;
      if (resta > 0 && resta < 12) { m += resta; resta = 0; }
      m = Math.max(5, Math.round(m / 5) * 5);
      itens.push({ info, min: m });
    }
    if (!itens.length && fila.length) { const info = fila[0]; itens.push({ info, min: Math.max(5, minutos) }); }
    const gasto = itens.reduce((s, x) => s + x.min, 0);
    if (itens.length && gasto !== minutos) itens[itens.length - 1].min += minutos - gasto;
    itens.forEach((x) => { x.passos = passosDe(x.info, x.min); });
    return itens;
  }

  function motivo(d, papel) {
    const partes = [];
    partes.push(`vale ${d.pct}% da prova${d.estimado ? ' (peso estimado)' : d.di.questoes ? ` (${d.di.questoes} questões)` : ''}`);
    if (d.total) partes.push(`seu acerto: ${Math.round((d.acertos / d.total) * 100)}% em ${d.total} questão(ões)`);
    if (d.novos) partes.push(`${d.novos} assunto(s) ainda não estudado(s)`);
    return (papel ? `${PAPEL_DESC[papel] ? 'Matéria de ' + PAPEL_DESC[papel] + ': ' : ''}` : '') + partes.join(' · ');
  }

  // ---------- O QUE ESTUDAR HOJE ----------
  // revs: [{ id, assunto_id }] revisões que vencem hoje ou já venceram.
  function sessaoHoje(an, minutos, revs) {
    revs = revs || [];
    const M = clamp(Math.round(minutos / 5) * 5, 20, 480);
    const al = alocar(M, revs.length);
    const est = { filas: {}, cur: {}, vistos: new Set() };
    const blocos = [];
    const vivas = an.discs.filter((d) => d.gapMedio >= 0.15 && d.assuntos.length);
    const rank = vivas.slice().sort((x, y) => y.ganho - x.ganho || y.peso - x.peso || x.ord - y.ord);
    const base = rank.length ? rank : an.discs.filter((d) => d.assuntos.length).sort((x, y) => y.peso - x.peso);
    const A = base[0] || null;
    const B = al.B ? base.find((d) => d !== A) || null : null;
    let C = null;
    if (al.C) {
      const cand = base.filter((d) => d !== A && d !== B && d.gapMedio >= 0.3);
      C = cand.sort((x, y) => x.peso - y.peso || y.gapMedio - x.gapMedio)[0] || null;   // a menos importante que ainda tem lacuna
    }
    // tempo de matérias que não existem volta para a principal
    let extra = 0;
    if (al.B && !B) { extra += al.B; al.B = 0; }
    if (al.C && !C) { extra += al.C; al.C = 0; }
    al.A += extra;

    if (al.rev) blocos.push({ papel: 'rev', min: al.rev, revs: revs.slice(0, maxRevisoes(M)) });
    const montar = (papel, d, min) => { blocos.push({ papel, d, min, motivo: motivo(d, papel), itens: tomarAssuntos(d, min, est) }); };
    if (A) montar('A', A, al.A);
    if (B && al.B) montar('B', B, al.B);
    if (C && al.C) montar('C', C, al.C);
    if (al.F) {
      const usados = new Set(); blocos.forEach((b) => (b.itens || []).forEach((x) => usados.add(x.info.a.id)));
      const fracos = []; an.discs.forEach((d) => d.assuntos.forEach((x) => { if (x.tipo === 'fraco' && !usados.has(x.a.id)) fracos.push(x); }));
      fracos.sort((x, y) => x.acc - y.acc || y.di.questoes - x.di.questoes);
      let alvo = fracos[0], porque;
      if (alvo) porque = `Ponto fraco: você acerta ${Math.round(alvo.acc * 100)}% em ${alvo.total} questões deste assunto.`;
      else {
        const prim = blocos.find((b) => b.itens && b.itens.length);
        alvo = prim ? prim.itens[0].info : null;
        porque = 'Fixação: questões do que você acabou de estudar.';
      }
      if (alvo) blocos.push({ papel: 'F', min: al.F, motivo: porque, itens: [{ info: alvo, min: al.F, passos: [{ tipo: 'questoes', min: al.F, titulo: 'Resolva as questões e leia os comentários dos erros' }] }] });
    }
    return { M, blocos, total: blocos.reduce((s, b) => s + b.min, 0), A, B, C };
  }

  // ---------- CRONOGRAMA ----------
  // cfg: { h, hSab, hDom, dias, sab, dom } · revsPend: [{ assunto_id, data }]
  function cronograma(an, cfg, hoje, revsPend, dias) {
    dias = dias || 14;
    const est = { filas: {}, cur: {}, vistos: new Set() };
    const rrA = {}, rrB = {}, rrC = {};
    const revDia = {};
    const pushRev = (i, id) => { if (i >= dias) return; (revDia[i] = revDia[i] || []).push(id); };
    (revsPend || []).forEach((r) => {
      const dt = new Date(r.data + 'T12:00:00'); const diff = Math.round((dt - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12)) / 86400000);
      if (diff < dias) pushRev(Math.max(0, diff), r.assunto_id);
    });
    const rrPick = (cands, rr) => {
      const total = cands.reduce((s, d) => s + d.peso, 0);
      cands.forEach((d) => { rr[d.di.id] = (rr[d.di.id] || 0) + d.peso; });
      const p = cands.slice().sort((x, y) => rr[y.di.id] - rr[x.di.id] || y.peso - x.peso || x.ord - y.ord)[0];
      rr[p.di.id] -= total; return p;
    };
    const escolher = (papel, usados, rr) => {
      let c = an.discs.filter((d) => d.tier === papel && !usados.has(d.di.id) && d.gapMedio >= 0.15 && d.assuntos.length);
      if (!c.length) {
        c = an.discs.filter((d) => !usados.has(d.di.id) && d.gapMedio >= 0.15 && d.assuntos.length);
        c.sort(papel === 'C' ? (x, y) => x.peso - y.peso : (x, y) => y.peso - x.peso);
        return c[0] || null;
      }
      return rrPick(c, rr);
    };
    const plano = []; let carry = [];
    for (let i = 0; i < dias; i++) {
      const dt = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i), wd = dt.getDay(), data = iso(dt);
      const sab = wd === 6 && cfg.sab, dom = wd === 0 && cfg.dom;
      const estuda = (wd >= 1 && wd <= 5) || (wd === 6 && cfg.dias >= 6) || (wd === 0 && cfg.dias >= 7);
      if (!estuda || sab || dom) carry = carry.concat(revDia[i] || []);   // revisões de dia sem estudo vão para o próximo
      if (sab) {
        const H = Math.max(210, Math.round((cfg.hSab || 4) * 60 / 5) * 5), corr = H - 180;
        const itens = [{ tipo: 'simulado', min: 180 }, { tipo: 'correcao', min: Math.min(corr, 60) }];
        if (corr > 60) itens.push({ tipo: 'questoes_fracas', min: corr - 60 });
        plano.push({ data, itens, foco: ['Simulado e correção'] }); continue;
      }
      if (dom) {
        const H = Math.max(120, Math.round((cfg.hDom || 3) * 60 / 5) * 5);
        const red = clamp(r5(H * 0.4), 45, 90), aut = 20, resto = H - red - aut;
        const rg = r5(resto * 0.5);
        plano.push({ data, itens: [{ tipo: 'redacao', min: red }, { tipo: 'autocorrecao', min: aut }, { tipo: 'revisao_geral', min: rg }, { tipo: 'questoes_fracas', min: resto - rg }], foco: ['Redação e revisão geral'] });
        continue;
      }
      if (!estuda) { plano.push({ data, folga: true, itens: [] }); continue; }

      const M = clamp(Math.round((cfg.h || 3) * 60 / 5) * 5, 30, 14 * 60);
      const pend = carry.concat(revDia[i] || []); carry = [];
      const unicas = Array.from(new Set(pend));
      // as mais importantes (maior peso na prova) primeiro; o excesso só é adiado 1 dia, nunca acumula
      const pesoDe = (id) => { const x = an.porAssunto[id]; const d = x && an.discs.find((q) => q.di.id === x.di.id); return d ? d.peso : 0; };
      unicas.sort((a, b) => pesoDe(b) - pesoDe(a));
      const cap = maxRevisoes(M);
      const hoje3 = unicas.slice(0, cap); carry = unicas.slice(cap, cap + cap);
      const al = alocar(M, hoje3.length);
      const usados = new Set(); const itens = []; const foco = [];
      if (al.rev && hoje3.length) {
        const un = Math.max(1, Math.round(al.rev / 5)); const baseU = Math.floor(un / hoje3.length), extraU = un % hoje3.length;
        hoje3.forEach((id, k) => itens.push({ tipo: 'revisao', assunto_id: id, min: 5 * Math.max(1, baseU + (k < extraU ? 1 : 0)) }));
      }
      const papeis = [['A', rrA], ['B', rrB], ['C', rrC]];
      let primeiroAss = null, extra = 0;
      papeis.forEach(([p, rr]) => {
        const min = al[p]; if (!min) return;
        const d = escolher(p, usados, rr);
        if (!d) { extra += min; return; }
        usados.add(d.di.id); foco.push(d.di.nome);
        tomarAssuntos(d, min, est).forEach((x) => {
          if (!primeiroAss) primeiroAss = x.info.a.id;
          itens.push({ tipo: 'estudo', assunto_id: x.info.a.id, min: x.min, papel: p, reforco: !!x.info.reforco });
          if (!x.info.reforco) { pushRev(i + 1, x.info.a.id); pushRev(i + 7, x.info.a.id); }
        });
      });
      const f = (al.F || 0) + extra;
      if (f >= 5 && primeiroAss) itens.push({ tipo: 'questoes', assunto_id: primeiroAss, min: f });
      else if (extra && itens.length) { const u = itens.filter((x) => x.tipo === 'estudo'); if (u.length) u[0].min += extra; }
      plano.push({ data, itens, foco });
    }
    return plano;
  }

  const api = { PESOS_ESTIMADOS, ROTULO, PAPEL_DESC, pesoDisciplina, infoAssunto, analisar, passosDe, alocar, sessaoHoje, cronograma, r5 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Plano = api;
})(typeof window !== 'undefined' ? window : globalThis);
