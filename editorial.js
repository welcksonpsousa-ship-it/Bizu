/*
 * Bizu do Concurseiro X — padrão editorial único.
 *
 * Um só leitor para todo o material: o Markdown salvo no banco vira uma árvore
 * de blocos (títulos, parágrafos, listas, tabelas, citações) e componentes
 * editoriais (Bizu, Atenção, Pegadinha, Lei Seca, Jurisprudência, Questão...).
 * A mesma árvore alimenta:
 *   - o desenho WEB  (Bizu PDF na tela, prévia do admin, Bizu IA)  → BizuEditorial.html()
 *   - o desenho PDF  (função gerar-apostila-pdf, no servidor)       → BizuEditorial.ler()
 *
 * Regra de ouro: nenhuma palavra do conteúdo pode sumir. BizuEditorial.verificar()
 * compara as palavras do texto original com as da árvore montada.
 *
 * Arquivo sem dependências; funciona no navegador (window.BizuEditorial) e no
 * Deno (globalThis.BizuEditorial). Não usar recursos que quebrem navegadores
 * antigos (nada de lookbehind em expressão regular).
 */
(function (G) {
  'use strict';
  var E = { versao: '1.0.0' };

  // ------------------------------------------------------------------ util
  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function norm(s) { return semAcento(s).toUpperCase(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  E.norm = norm;

  // Emojis e pictogramas: o site já os remove do conteúdo dinâmico; aqui alguns
  // viram símbolo tipográfico equivalente e o resto sai, igual no site e no PDF.
  var SIMBOLOS = { '✅': '✓', '✔': '✓', '❌': '✗', '✖': '✗', '⚠': '!' };
  function limparLinha(s) {
    var out = '';
    for (var ch of String(s)) {
      var cp = ch.codePointAt(0);
      if (SIMBOLOS[ch] !== undefined) { out += SIMBOLOS[ch]; continue; }
      if (cp === 0xFE0F || cp === 0x200D) continue;                       // seletor de variação / junção
      if ((cp >= 0x1F000 && cp <= 0x1FAFF) || (cp >= 0x2600 && cp <= 0x26FF && cp !== 0x2605 && cp !== 0x2606) ||
          (cp >= 0x2700 && cp <= 0x27BF && cp !== 0x2713 && cp !== 0x2717)) continue;
      out += ch;
    }
    return out;
  }

  // ------------------------------------------------------------------ inline
  // Devolve trechos [{t, b, i, c}] — b: negrito, i: itálico, c: código
  function pontuacaoOuEspaco(ch) { return ch === undefined || ch === '' || /[\s.,;:!?()\[\]{}"'“”‘’«»\-–—\/\\|<>…]/.test(ch); }
  function acharFecho(s, from, marca) {
    var i = from;
    while (true) {
      var j = s.indexOf(marca, i);
      if (j < 0) return -1;
      if (marca === '*') {
        // dentro do itálico, "**" é negrito aninhado: pula; em "***" o último fecha o itálico
        var e = j; while (s.charAt(e) === '*') e++;
        if (e - j === 2 || e - j > 3) { i = e; continue; }
        if (e - j === 3) j = e - 1;
      }
      var antes = s.charAt(j - 1), depois = s.charAt(j + marca.length);
      // "**" e "***" podem fechar no meio da palavra (**R**econhecimento); "*" simples, não
      if (antes && !/\s/.test(antes) && (marca !== '*' || depois !== '*') && (marca !== '*' || pontuacaoOuEspaco(depois)) && j > from) return j;
      i = j + marca.length;
    }
  }
  function inline(s, fl, out) {
    fl = fl || { b: false, i: false, c: false };
    out = out || [];
    var buf = '';
    var i = 0;
    function flush() { if (buf) { out.push({ t: buf, b: fl.b, i: fl.i, c: fl.c }); buf = ''; } }
    while (i < s.length) {
      var ch = s.charAt(i);
      if (ch === '\\' && i + 1 < s.length && /[*_`#|>\\]/.test(s.charAt(i + 1))) { buf += s.charAt(i + 1); i += 2; continue; }
      if (ch === '`') {
        var k = s.indexOf('`', i + 1);
        if (k > i + 1) { flush(); out.push({ t: s.slice(i + 1, k), b: fl.b, i: fl.i, c: true }); i = k + 1; continue; }
      }
      if (ch === '*') {
        var marca = s.substr(i, 3) === '***' ? '***' : s.substr(i, 2) === '**' ? '**' : '*';
        var prev = s.charAt(i - 1), prox = s.charAt(i + marca.length);
        var podeAbrir = prox && !/\s/.test(prox) && (i === 0 || pontuacaoOuEspaco(prev) || marca !== '*');
        if (podeAbrir) {
          var f = acharFecho(s, i + marca.length, marca);
          if (f > 0) {
            flush();
            var dentro = s.slice(i + marca.length, f);
            var nf = { b: fl.b || marca !== '*', i: fl.i || marca !== '**', c: fl.c };
            inline(dentro, nf, out);
            i = f + marca.length;
            continue;
          }
        }
      }
      buf += ch; i++;
    }
    flush();
    // junta trechos vizinhos iguais
    var r = [];
    for (var n = 0; n < out.length; n++) {
      var x = out[n], y = r[r.length - 1];
      if (y && y.b === x.b && y.i === x.i && y.c === x.c) y.t += x.t; else r.push({ t: x.t, b: x.b, i: x.i, c: x.c });
    }
    return r;
  }
  E.inline = function (s) { return inline(limparLinha(s)); };
  function textoInl(inl) { return (inl || []).map(function (x) { return x.t; }).join(''); }
  E.textoInl = textoInl;

  // ------------------------------------------------------------------ blocos
  var RX = {
    fence: /^\s*```/,
    regua: /^\s*(-{3,}|\*{3,}|_{3,})\s*$/,
    h: /^(#{1,6})\s+(.*?)\s*#*\s*$/,
    sepTab: /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/,
    bullet: /^(\s*)([-*•+])\s+(.*)$/,
    num: /^(\s*)(\d{1,3})([.)])\s+(.*)$/,
    letra: /^(\s*)\(?([a-z])\)\s+(.*)$/,
    alt: /^(\s*)\(?([A-E])\)\s+(.*)$/,
    romano: /^(\s*)([IVXLC]{1,6})\s*[–—-]\s+(.*)$/,
    cita: /^\s*>\s?(.*)$/,
    callout: /^\[!([A-ZÀ-Úa-zà-ú_ ]+)\]\s*(.*)$/
  };
  function celulas(l) {
    var s = l.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|' && s.charAt(s.length - 2) !== '\\') s = s.slice(0, -1);
    var out = [], buf = '';
    for (var i = 0; i < s.length; i++) {
      if (s.charAt(i) === '\\' && s.charAt(i + 1) === '|') { buf += '|'; i++; continue; }
      if (s.charAt(i) === '|') { out.push(buf.trim()); buf = ''; continue; }
      buf += s.charAt(i);
    }
    out.push(buf.trim());
    return out;
  }
  function itemLista(l) {
    var m;
    if ((m = l.match(RX.bullet)) && !RX.regua.test(l)) return { tipo: 'bullet', ind: m[1].length, marca: '', txt: m[3] };
    if ((m = l.match(RX.num))) return { tipo: 'num', ind: m[1].length, marca: m[2] + m[3], txt: m[4] };
    if ((m = l.match(RX.letra))) return { tipo: 'letra', ind: m[1].length, marca: m[2] + ')', txt: m[3] };
    if ((m = l.match(RX.alt))) return { tipo: 'alt', ind: m[1].length, marca: m[2] + ')', txt: m[3] };
    if ((m = l.match(RX.romano))) return { tipo: 'romano', ind: m[1].length, marca: m[2] + ' –', txt: m[3] };
    return null;
  }

  // Lê linhas → blocos simples. Cada linha não vazia é um parágrafo próprio:
  // é assim que o acervo foi escrito ("**Concurso:** ...", "**1. Ordem** ...").
  function blocosDe(linhas) {
    var out = [];
    for (var i = 0; i < linhas.length; i++) {
      var cru = linhas[i], l = cru.replace(/\s+$/, '');
      if (!l.trim()) continue;
      if (RX.fence.test(l)) {
        var corpo = []; i++;
        while (i < linhas.length && !RX.fence.test(linhas[i])) { corpo.push(linhas[i].replace(/\s+$/, '')); i++; }
        while (corpo.length && !corpo[0].trim()) corpo.shift();
        while (corpo.length && !corpo[corpo.length - 1].trim()) corpo.pop();
        if (corpo.length) out.push({ t: 'codigo', linhas: corpo.map(limparLinha) });
        continue;
      }
      if (RX.regua.test(l)) { out.push({ t: 'regua' }); continue; }
      var m = l.match(RX.h);
      if (m) { out.push({ t: 'h', n: Math.min(m[1].length, 4), inl: inline(limparLinha(m[2])) }); continue; }
      if (l.trim().charAt(0) === '|' && i + 1 < linhas.length && RX.sepTab.test(linhas[i + 1])) {
        var cab = celulas(l).map(function (c) { return inline(limparLinha(c)); });
        var rows = []; i += 2;
        while (i < linhas.length && linhas[i].trim().charAt(0) === '|') {
          if (!RX.sepTab.test(linhas[i])) rows.push(celulas(linhas[i]).map(function (c) { return inline(limparLinha(c)); }));
          i++;
        }
        i--;
        var nc = cab.length;
        rows.forEach(function (r) { nc = Math.max(nc, r.length); });
        while (cab.length < nc) cab.push([]);
        rows.forEach(function (r) { while (r.length < nc) r.push([]); });
        out.push({ t: 'tabela', cab: cab, linhas: rows });
        continue;
      }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i + 1])) {
        var semCab = [];
        while (i < linhas.length && /^\s*\|.*\|\s*$/.test(linhas[i])) { if (!RX.sepTab.test(linhas[i])) semCab.push(celulas(linhas[i]).map(function (c) { return inline(limparLinha(c)); })); i++; }
        i--;
        var nc2 = 0; semCab.forEach(function (r) { nc2 = Math.max(nc2, r.length); });
        semCab.forEach(function (r) { while (r.length < nc2) r.push([]); });
        out.push({ t: 'tabela', cab: null, linhas: semCab });
        continue;
      }
      if (RX.cita.test(l)) {
        var dentro = [];
        while (i < linhas.length && RX.cita.test(linhas[i])) { dentro.push(linhas[i].match(RX.cita)[1]); i++; }
        i--;
        var mc = (dentro[0] || '').trim().match(RX.callout);
        if (mc) {
          var resto = dentro.slice(1);
          if (mc[2]) resto.unshift(mc[2]);
          out.push({ t: 'callout', k: calloutTipo(mc[1]), blocos: blocosDe(resto) });
        } else out.push({ t: 'cita', blocos: blocosDe(dentro) });
        continue;
      }
      var it = itemLista(l);
      if (it) {
        var lista = { t: 'lista', tipo: it.tipo, itens: [] };
        var base = it.ind;
        while (i < linhas.length) {
          var li = linhas[i];
          if (!li.trim()) {
            // lista continua se a próxima linha não vazia for item do mesmo tipo
            var k2 = i + 1; while (k2 < linhas.length && !linhas[k2].trim()) k2++;
            var prox = k2 < linhas.length ? itemLista(linhas[k2]) : null;
            if (prox && prox.tipo === lista.tipo && prox.ind <= base) { i = k2; continue; }
            break;
          }
          var x = itemLista(li);
          if (x && x.ind <= base + 1 && x.tipo === lista.tipo) {
            lista.itens.push({ marca: x.marca, inl: inline(limparLinha(x.txt)), sub: null });
            i++; continue;
          }
          if (x && x.ind > base + 1 && lista.itens.length) {
            var ult = lista.itens[lista.itens.length - 1];
            var sub = [];
            while (i < linhas.length && linhas[i].trim() && (itemLista(linhas[i]) || {}).ind > base + 1) { sub.push(linhas[i].replace(/^\s{2,}/, '')); i++; }
            var sb = blocosDe(sub);
            ult.sub = (ult.sub || []).concat(sb);
            continue;
          }
          if (!x && /^\s{2,}\S/.test(li) && lista.itens.length) {
            var u2 = lista.itens[lista.itens.length - 1];
            u2.inl = u2.inl.concat([{ t: ' ', b: false, i: false, c: false }], inline(limparLinha(li.trim())));
            i++; continue;
          }
          break;
        }
        i--;
        out.push(lista);
        continue;
      }
      out.push({ t: 'p', inl: inline(limparLinha(l.trim())) });
    }
    return out;
  }

  // ------------------------------------------------------------ componentes
  var TIPOS_CAIXA = {
    bizu: 'BIZU', atencao: 'ATENÇÃO', pegadinha: 'PEGADINHA', exemplo: 'EXEMPLO', resumo: 'RESUMO',
    doutrina: 'DOUTRINA', revisao: 'REVISÃO', criticos: 'MAIS COBRADO', comparacao: 'COMPARAÇÃO',
    lei: 'LEI SECA', juris: 'JURISPRUDÊNCIA', questao: 'QUESTÃO DE FIXAÇÃO'
  };
  E.TIPOS_CAIXA = TIPOS_CAIXA;
  function calloutTipo(s) {
    var n = norm(s).replace(/[^A-Z]/g, '');
    if (/^(BIZU|MACETE|DICA)/.test(n)) return 'bizu';
    if (/^(ATENCAO|CUIDADO|IMPORTANTE|OBS)/.test(n)) return 'atencao';
    if (/^PEGADINHA/.test(n)) return 'pegadinha';
    if (/^EXEMPLO/.test(n)) return 'exemplo';
    if (/^RESUMO/.test(n)) return 'resumo';
    if (/^DOUTRINA/.test(n)) return 'doutrina';
    if (/^REVIS/.test(n)) return 'revisao';
    if (/^COMPARA/.test(n)) return 'comparacao';
    if (/^(LEI|LEGISLA)/.test(n)) return 'lei';
    if (/^JURIS|^SUMULA/.test(n)) return 'juris';
    if (/^QUEST/.test(n)) return 'questao';
    return 'atencao';
  }
  // Tipo de seção pelo título (há 232 variações de título no acervo)
  function tipoSecao(titulo) {
    var n = norm(titulo).replace(/^[\d.\s]+/, '');
    if (/PEGADINHA|ERROS QUE CUSTAM|ARMADILHA/.test(n)) return 'pegadinhas';
    if (/RESUMO DA VESPERA|REVISAO FINAL|RESUMO FINAL/.test(n)) return 'resumo';
    if (/PONTOS CRITICOS|MAIS COBRAD|O QUE MAIS CAI/.test(n)) return 'criticos';
    if (/^QUEST|EXERCICIO|FIXACAO/.test(n)) return 'questoes';
    if (/LEI SECA|LETRA DA LEI/.test(n)) return 'lei';
    if (/SUMULA/.test(n) && !/JURISPRUD/.test(n)) return 'sumulas';
    if (/JURISPRUD|PRECEDENTE|ENTENDIMENTO/.test(n)) return 'juris';
    if (/QUADRO|COMPARATIV|DIFERENCIA/.test(n)) return 'comparativo';
    if (/DOUTRIN/.test(n)) return 'doutrina';
    if (/ATIVIDADE POLICIAL|APLICACAO PRATICA|NA PRATICA/.test(n)) return 'aplicacao';
    if (/BASE LEGAL|BASE NORMATIVA|REFERENCIAS/.test(n)) return 'base';
    if (/APRESENTACAO|INTRODUC/.test(n)) return 'apresentacao';
    if (/CONCEITOS FUNDAMENTAIS/.test(n)) return 'conceitos';
    return 'outro';
  }
  E.tipoSecao = tipoSecao;
  var SELO_SECAO = {
    pegadinhas: 'PEGADINHA', resumo: 'REVISÃO', criticos: 'MAIS COBRADO', questoes: 'TREINO',
    lei: 'LEI SECA', sumulas: 'JURISPRUDÊNCIA', juris: 'JURISPRUDÊNCIA', comparativo: 'COMPARAÇÃO',
    doutrina: 'DOUTRINA', aplicacao: 'NA PRÁTICA', base: 'BASE LEGAL'
  };
  E.SELO_SECAO = SELO_SECAO;

  function comecaNegrito(b) { return b && b.t === 'p' && b.inl.length && b.inl[0].b && textoInl([b.inl[0]]).trim().length > 0; }
  function rotuloInicial(b) {
    if (!comecaNegrito(b)) return null;
    var lead = norm(b.inl[0].t).replace(/^[^A-Z]+/, '');
    if (/^(BIZU|MACETE|DICA DE PROVA|DICA)\b/.test(lead)) return 'bizu';
    if (/^(ATENCAO|CUIDADO|IMPORTANTE|OBSERVACAO|OBS\b|NOTA\b)/.test(lead)) return 'atencao';
    if (/^EXEMPLO/.test(lead)) return 'exemplo';
    if (/^PEGADINHA/.test(lead)) return 'pegadinha';
    if (/^(EM RESUMO|RESUMINDO|SINTESE)\b/.test(lead)) return 'resumo';
    return null;
  }
  // Selos do julgado: tribunal citado no título do item (ou no começo do texto),
  // súmula vinculante é sempre do STF (CF, art. 103-A). Nunca inventa.
  var RX_TRIB = /\b(STF|STJ|TST|TSE|STM|TJSP|TJ-SP|TRF\d?|CNJ|CORTE IDH|CIDH)\b/;
  function selosJuris(titulo, corpo) {
    var nt = norm(titulo), nc = norm(corpo || ''), n = nt + ' ' + nc, s = [];
    var vinc = /SUMULA VINCULANTE|\bSV\s*\d/.test(nt);
    var trib = nt.match(RX_TRIB) || (vinc ? ['', 'STF'] : null) || nc.slice(0, 70).match(RX_TRIB);
    if (trib) s.push(trib[1]);
    if (vinc) s.push('SÚMULA VINCULANTE');
    else if (/SUMULA/.test(nt)) s.push('SÚMULA');
    if (/REPERCUSSAO GERAL/.test(n)) s.push('REPERCUSSÃO GERAL');
    else if (/RECURSOS? REPETITIVOS?|\bREPETITIVO\b/.test(n)) s.push('REPETITIVO');
    return s.slice(0, 3);
  }
  function refLei(b) {
    if (!comecaNegrito(b)) return false;
    var lead = norm(b.inl[0].t);
    return /\b(ART|ARTS|§|CF|CP|CPP|CTN|CC|CLT|LEP|ECA|LCP|CTB|LEI|DECRETO|SUMULA|SV|PARAGRAFO|INCISO|CAPUT|EC)\b|ART\.|\bLC\b|§/.test(lead);
  }
  function eGabarito(b) { return b && b.t === 'p' && /^\s*gabarito/i.test(semAcento(textoInl(b.inl))); }
  function letraGabarito(b) {
    var m = semAcento(textoInl(b.inl)).match(/gabarito\s*(?:oficial)?\s*[:\-–—]?\s*(?:letra\s*)?\(?([A-Ea-e])\b/i);
    return m ? m[1].toUpperCase() : null;
  }
  function inicioQuestao(b) {
    if (!b) return false;
    if (b.t === 'h' && b.n >= 3 && /^\s*quest[aã]o\b/i.test(textoInl(b.inl))) return true;
    if (b.t === 'p' && b.inl.length && b.inl[0].b && /^\s*quest[aã]o\s*\d+/i.test(b.inl[0].t)) return true;
    return false;
  }

  // Agrupa uma seção de Lei Seca em cartões (referência + texto legal + comentário)
  function cartoesLei(bl) {
    var out = [], cur = null;
    for (var i = 0; i < bl.length; i++) {
      var b = bl[i];
      var inicio = (b.t === 'h' && b.n >= 3) || refLei(b) || (b.t === 'cita' && !cur);
      if (b.t === 'h' && b.n < 3) { cur = null; out.push(b); continue; }
      if (inicio) {
        cur = { t: 'lei', ref: [], blocos: [] };
        if (b.t === 'h') cur.ref = b.inl;
        else if (b.t === 'p') {
          cur.ref = [b.inl[0]];
          var resto = tirarSeparador(b.inl.slice(1));
          if (textoInl(resto).trim()) cur.blocos.push({ t: 'p', inl: resto });
        } else cur.blocos.push(b);
        out.push(cur);
        continue;
      }
      if (cur && (b.t === 'p' || b.t === 'cita' || b.t === 'lista')) { cur.blocos.push(b); continue; }
      cur = null; out.push(b);
    }
    return out;
  }
  function tirarSeparador(inl) {
    if (!inl.length) return inl;
    var r = inl.map(function (x) { return { t: x.t, b: x.b, i: x.i, c: x.c }; });
    r[0].t = r[0].t.replace(/^\s*[—–:-]?\s*/, '');
    if (!r[0].t) r.shift();
    return r;
  }
  function cartoesJuris(bl) {
    var out = [], cur = null;
    for (var i = 0; i < bl.length; i++) {
      var b = bl[i];
      if (b.t === 'h') { cur = null; out.push(b); continue; }
      if (comecaNegrito(b)) {
        var resto = tirarSeparador(b.inl.slice(1));
        cur = { t: 'juris', titulo: [b.inl[0]], selos: selosJuris(b.inl[0].t, textoInl(b.inl.slice(1))), blocos: textoInl(resto).trim() ? [{ t: 'p', inl: resto }] : [] };
        out.push(cur); continue;
      }
      if (cur && (b.t === 'p' || b.t === 'cita' || b.t === 'lista')) { cur.blocos.push(b); continue; }
      cur = null; out.push(b);
    }
    return out;
  }
  function painelPegadinhas(bl) {
    var out = [], painel = null, cur = null;
    for (var i = 0; i < bl.length; i++) {
      var b = bl[i];
      var item = null;
      if (comecaNegrito(b)) item = b;
      else if (b.t === 'lista' && b.itens.length && b.itens.every(function (x) { return x.inl.length && x.inl[0].b; })) {
        // lista de pegadinhas: cada item vira um par
        if (!painel) { painel = { t: 'pegadinhas', itens: [] }; out.push(painel); }
        b.itens.forEach(function (x) {
          painel.itens.push({ marca: x.marca, afirmacao: [x.inl[0]], correcao: textoInl(x.inl.slice(1)).trim() ? [{ t: 'p', inl: tirarSeparador(x.inl.slice(1)) }] : [] });
        });
        cur = null; continue;
      }
      if (item) {
        if (!painel) { painel = { t: 'pegadinhas', itens: [] }; out.push(painel); }
        var resto = item.inl.slice(1);
        cur = { marca: '', afirmacao: [item.inl[0]], correcao: textoInl(resto).trim() ? [{ t: 'p', inl: tirarSeparador(resto) }] : [] };
        painel.itens.push(cur); continue;
      }
      if (cur && (b.t === 'p' || b.t === 'lista' || b.t === 'cita')) { cur.correcao.push(b); continue; }
      painel = null; cur = null; out.push(b);
    }
    return out;
  }
  // Questões: título → enunciado → alternativas → gabarito → comentário
  function questoes(bl) {
    var out = [], i = 0;
    while (i < bl.length) {
      var b = bl[i];
      if (!inicioQuestao(b)) { out.push(b); i++; continue; }
      var j = i + 1;
      while (j < bl.length && !inicioQuestao(bl[j]) && !(bl[j].t === 'h' && bl[j].n <= 2)) j++;
      var partes = bl.slice(i + 1, j);
      var q = { t: 'questao', rotulo: [], enunciado: [], alts: [], gab: null, gabInl: null, comentario: [] };
      if (b.t === 'h') q.rotulo = b.inl;
      else {
        q.rotulo = [b.inl[0]];
        var r = tirarSeparador(b.inl.slice(1));
        if (textoInl(r).trim()) q.enunciado.push({ t: 'p', inl: r });
      }
      var fase = 'enunciado';
      partes.forEach(function (p) {
        if (fase !== 'comentario' && p.t === 'lista' && (p.tipo === 'alt' || p.tipo === 'letra') && p.itens.length >= 2) {
          p.itens.forEach(function (it) { q.alts.push({ letra: it.marca.charAt(0).toUpperCase(), marca: it.marca, inl: it.inl, sub: it.sub }); });
          fase = 'alts'; return;
        }
        if (fase !== 'comentario' && eGabarito(p)) {
          q.gab = letraGabarito(p); q.gabInl = p.inl; fase = 'comentario'; return;
        }
        if (fase === 'comentario') q.comentario.push(p);
        else if (fase === 'alts') q.comentario.push(p);   // texto entre alternativas e gabarito (raro): mantém
        else q.enunciado.push(p);
      });
      if (q.alts.length >= 2 && q.gabInl) out.push(q);
      else { out.push(b); partes.forEach(function (p) { out.push(p); }); }   // formato não reconhecido: fica como está
      i = j;
    }
    return out;
  }
  // Parte trechos inline numa posição de caractere, preservando a formatação
  function cortarInl(inl, pos) {
    var a = [], b = [], n = 0;
    inl.forEach(function (x) {
      if (n + x.t.length <= pos) a.push(x);
      else if (n >= pos) b.push(x);
      else { var k = pos - n; a.push({ t: x.t.slice(0, k), b: x.b, i: x.i, c: x.c }); b.push({ t: x.t.slice(k), b: x.b, i: x.i, c: x.c }); }
      n += x.t.length;
    });
    return [a, b];
  }
  var RX_REF = /\b(arts?\.?|§|s[uú]mula|lei|cf|cp|cpp|ctn|cc|clt|eca|lep|ctb|lcp|decreto|inciso|par[aá]grafo|caput|constitui[cç][aã]o|c[oó]digo)\b|§/i;
  // "Art. 13, § 1º: "texto da lei"" fora da seção de Lei Seca → cartão de texto legal
  function leiEmLinha(bl) {
    return bl.map(function (b) {
      if (b.t !== 'p') return b;
      var t = textoInl(b.inl), q = t.search(/["“]/);
      if (q < 3 || q > 90) return b;
      var pre = t.slice(0, q);
      if (!RX_REF.test(pre) || !/[:—–-]\s*$/.test(pre)) return b;
      var fim = t.slice(q + 1).search(/["”]/);
      if (fim < 60) return b;
      var partes = cortarInl(b.inl, q);
      return { t: 'lei', ref: partes[0], blocos: [{ t: 'p', inl: partes[1] }], emLinha: true };
    });
  }
  // Citação que começa com aspas ou "Art." é texto de lei
  function marcarCitaLei(bl) {
    bl.forEach(function (b) {
      if (b.t === 'cita') {
        var t = textoBlocos(b.blocos, []).join(' ').trim();
        if (/^["“]|^(art\.|§|s[uú]mula)/i.test(t)) b.lei = true;
        marcarCitaLei(b.blocos);
      } else if (b.blocos) marcarCitaLei(b.blocos);
    });
    return bl;
  }

  // Rótulos no início do parágrafo viram caixa ("**Atenção:** ..."); se o
  // parágrafo termina em ":" e vem uma lista logo depois, ela entra na caixa.
  function caixasPorRotulo(bl) {
    var out = [];
    for (var i = 0; i < bl.length; i++) {
      var b = bl[i], k = rotuloInicial(b);
      if (!k) { out.push(b); continue; }
      var cx = { t: 'caixa', k: k, blocos: [b] };
      if (/:\s*$/.test(textoInl(b.inl)) && bl[i + 1] && bl[i + 1].t === 'lista') { cx.blocos.push(bl[i + 1]); i++; }
      out.push(cx);
    }
    return out;
  }

  // ------------------------------------------------------------ documento
  E.ler = function (md, opcoes) {
    opcoes = opcoes || {};
    var linhas = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    var bl = blocosDe(linhas);
    var doc = { titulo: null, kicker: null, meta: [], preambulo: [], secoes: [] };
    var i = 0;
    // cabeçalho: primeiro "# TÍTULO" e as linhas "**Rótulo:** valor" logo abaixo
    if (!opcoes.simples) {
      while (i < bl.length && bl[i].t === 'regua') i++;
      if (bl[i] && bl[i].t === 'h' && bl[i].n === 1) {
        var tt = textoInl(bl[i].inl), mk = tt.match(/^\s*(APOSTILA|MATERIAL|RESUMO)\s*[:—–-]\s*(.+)$/i);
        if (mk) { doc.kicker = mk[1]; doc.titulo = inline(mk[2]); } else doc.titulo = bl[i].inl;
        i++;
        while (i < bl.length && bl[i].t === 'p' && bl[i].inl.length >= 2 && bl[i].inl[0].b && /:\s*$/.test(bl[i].inl[0].t) && bl[i].inl[0].t.length <= 40) {
          doc.meta.push({ rotulo: bl[i].inl[0].t.replace(/:\s*$/, '').trim(), valor: tirarSeparador(bl[i].inl.slice(1)) });
          i++;
        }
        while (i < bl.length && bl[i].t === 'regua') i++;
      }
    }
    var atual = null, cont = 0;
    for (; i < bl.length; i++) {
      var b = bl[i];
      if (b.t === 'h' && b.n <= 2) {
        cont++;
        var txt = textoInl(b.inl), mn = txt.match(/^\s*(\d{1,2})[.)]?\s+(.*)$/);
        atual = { id: 'sec-' + cont, tipo: b.n === 2 ? tipoSecao(txt) : 'parte', nivel: b.n, num: mn ? mn[1] : null,
                  titulo: mn ? inline(mn[2]) : b.inl, blocos: [] };
        doc.secoes.push(atual);
        continue;
      }
      (atual ? atual.blocos : doc.preambulo).push(b);
    }
    if (opcoes.simples) { doc.preambulo = caixasPorRotulo(doc.preambulo); return doc; }
    doc.secoes.forEach(function (s) {
      var x = s.blocos;
      if (s.tipo === 'lei') x = cartoesLei(x);
      else if (s.tipo === 'juris' || s.tipo === 'sumulas') x = cartoesJuris(x);
      else if (s.tipo === 'pegadinhas') x = painelPegadinhas(x);
      x = questoes(x);
      if (s.tipo !== 'lei') x = leiEmLinha(x);
      x = caixasPorRotulo(x);
      marcarCitaLei(x);
      s.blocos = x;
    });
    doc.preambulo = marcarCitaLei(caixasPorRotulo(leiEmLinha(doc.preambulo)));
    return doc;
  };

  // ------------------------------------------------------ texto e verificação
  function palavras(s) {
    return (semAcento(String(s || '')).toLowerCase().match(/[a-z0-9]+/g) || []);
  }
  function textoBlocos(bl, acc) {
    (bl || []).forEach(function (b) {
      switch (b.t) {
        case 'h': case 'p': acc.push(textoInl(b.inl)); break;
        case 'lista': b.itens.forEach(function (x) { acc.push(x.marca + ' ' + textoInl(x.inl)); if (x.sub) textoBlocos(x.sub, acc); }); break;
        case 'tabela': if (b.cab) acc.push(b.cab.map(textoInl).join(' ')); b.linhas.forEach(function (r) { acc.push(r.map(textoInl).join(' ')); }); break;
        case 'cita': case 'caixa': case 'callout': textoBlocos(b.blocos, acc); break;
        case 'codigo': acc.push(b.linhas.join('\n')); break;
        case 'lei': acc.push(textoInl(b.ref)); textoBlocos(b.blocos, acc); break;
        case 'juris': acc.push(textoInl(b.titulo)); textoBlocos(b.blocos, acc); break;
        case 'pegadinhas': b.itens.forEach(function (x) { acc.push(x.marca + ' ' + textoInl(x.afirmacao)); textoBlocos(x.correcao, acc); }); break;
        case 'questao':
          acc.push(textoInl(b.rotulo)); textoBlocos(b.enunciado, acc);
          b.alts.forEach(function (a) { acc.push(a.marca + ' ' + textoInl(a.inl)); if (a.sub) textoBlocos(a.sub, acc); });
          acc.push(textoInl(b.gabInl)); textoBlocos(b.comentario, acc); break;
      }
    });
    return acc;
  }
  E.texto = function (doc) {
    var acc = [];
    if (doc.kicker) acc.push(doc.kicker);
    if (doc.titulo) acc.push(textoInl(doc.titulo));
    doc.meta.forEach(function (m) { acc.push(m.rotulo + ': ' + textoInl(m.valor)); });
    textoBlocos(doc.preambulo, acc);
    doc.secoes.forEach(function (s) { acc.push((s.num ? s.num + '. ' : '') + textoInl(s.titulo)); textoBlocos(s.blocos, acc); });
    return acc.join('\n');
  };
  // Palavras do original (sem marcação) × palavras da árvore: nada pode faltar.
  E.verificar = function (md, doc) {
    doc = doc || E.ler(md);
    var fonte = String(md || '').split('\n').map(function (l) { return limparLinha(l); }).join('\n').replace(/[*`]/g, '');
    var cont = {};
    palavras(fonte).forEach(function (w) { cont[w] = (cont[w] || 0) + 1; });
    var txt = E.texto(doc);
    palavras(txt).forEach(function (w) { if (cont[w]) cont[w]--; });
    var faltando = [];
    Object.keys(cont).forEach(function (w) { for (var k = 0; k < cont[w]; k++) faltando.push(w); });
    var cru = [];
    function checar(t, cabecalho) {
      if (/\*\*/.test(t) || /\[![A-Z]/.test(t) || (cabecalho && /^\s*#{1,6}\s/.test(t)) || /^\s*\|.*\|\s*$/.test(t)) cru.push(t.slice(0, 90));
    }
    function varrer(bl) {
      (bl || []).forEach(function (b) {
        if (b.t === 'h' || b.t === 'p') checar(textoInl(b.inl), true);
        else if (b.t === 'lista') b.itens.forEach(function (x) { checar(textoInl(x.inl), true); varrer(x.sub); });
        else if (b.t === 'tabela') { (b.cab || []).concat.apply(b.cab || [], b.linhas).forEach(function (c) { checar(textoInl(c), false); }); }
        else if (b.t === 'lei') { checar(textoInl(b.ref), true); varrer(b.blocos); }
        else if (b.t === 'juris') { checar(textoInl(b.titulo), true); varrer(b.blocos); }
        else if (b.t === 'pegadinhas') b.itens.forEach(function (x) { checar(textoInl(x.afirmacao), true); varrer(x.correcao); });
        else if (b.t === 'questao') { checar(textoInl(b.rotulo), true); varrer(b.enunciado); b.alts.forEach(function (a) { checar(textoInl(a.inl), true); }); checar(textoInl(b.gabInl), true); varrer(b.comentario); }
        else if (b.blocos) varrer(b.blocos);
      });
    }
    varrer(doc.preambulo);
    doc.secoes.forEach(function (s) { checar(textoInl(s.titulo), true); varrer(s.blocos); });
    return { ok: !faltando.length && !cru.length, faltando: faltando, cru: cru, palavras: palavras(fonte).length };
  };
  // Resumo de conformidade ao padrão (usado na prévia do admin e nos testes)
  E.conformidade = function (md) {
    var doc = E.ler(md), v = E.verificar(md, doc);
    var tipos = {}, comp = {};
    doc.secoes.forEach(function (s) { tipos[s.tipo] = (tipos[s.tipo] || 0) + 1; });
    function contar(bl) {
      (bl || []).forEach(function (b) {
        var k = b.t === 'caixa' || b.t === 'callout' ? 'caixa:' + b.k : b.t;
        if (/^(caixa|callout|lei|juris|pegadinhas|questao|tabela)/.test(k)) comp[k] = (comp[k] || 0) + 1;
        if (b.blocos) contar(b.blocos);
      });
    }
    contar(doc.preambulo); doc.secoes.forEach(function (s) { contar(s.blocos); });
    var essenciais = ['apresentacao', 'criticos', 'pegadinhas', 'questoes', 'resumo'];
    var faltam = essenciais.filter(function (t) { return !tipos[t]; });
    return { ok: v.ok && !faltam.length, verificacao: v, secoes: doc.secoes.length, tipos: tipos, componentes: comp, faltam: faltam, titulo: doc.titulo ? textoInl(doc.titulo) : null };
  };

  // ------------------------------------------------------------ desenho WEB
  function htmlInl(inl) {
    return (inl || []).map(function (x) {
      var s = esc(x.t);
      if (x.c) s = '<code>' + s + '</code>';
      if (x.i) s = '<em>' + s + '</em>';
      if (x.b) s = '<strong>' + s + '</strong>';
      return s;
    }).join('');
  }
  // trechos entre aspas longos = texto legal; o resto = comentário do material
  function htmlLeiP(inl) {
    var s = textoInl(inl);
    if (!/["“”]/.test(s)) return '<p class="bx-com">' + htmlInl(inl) + '</p>';
    // separa preservando formatação: percorre os trechos procurando aspas
    var partes = [], atual = [], dentro = false;
    inl.forEach(function (x) {
      var buf = '';
      for (var ch of x.t) {
        var abre = !dentro && (ch === '"' || ch === '“'), fecha = dentro && (ch === '"' || ch === '”');
        if (abre) { if (buf) atual.push({ t: buf, b: x.b, i: x.i, c: x.c }); buf = ''; partes.push({ lei: false, inl: atual }); atual = []; dentro = true; buf = ch; continue; }
        if (fecha) { buf += ch; atual.push({ t: buf, b: x.b, i: x.i, c: x.c }); buf = ''; partes.push({ lei: true, inl: atual }); atual = []; dentro = false; continue; }
        buf += ch;
      }
      if (buf) atual.push({ t: buf, b: x.b, i: x.i, c: x.c });
    });
    if (atual.length) partes.push({ lei: dentro, inl: atual });
    var h = '';
    partes.forEach(function (p) {
      var t = textoInl(p.inl).trim();
      if (!t) return;
      if (p.lei && t.length >= 25) h += '<blockquote class="bx-leitxt">' + htmlInl(p.inl) + '</blockquote>';
      else h += '<p class="bx-com">' + htmlInl(p.inl) + '</p>';
    });
    return h;
  }
  function htmlLista(b) {
    var tag = b.tipo === 'bullet' ? 'ul' : 'ol';
    var cls = 'bx-lista bx-l-' + b.tipo;
    return '<' + tag + ' class="' + cls + '">' + b.itens.map(function (x) {
      return '<li>' + (x.marca ? '<span class="bx-mk">' + esc(x.marca) + '</span> ' : '') + htmlInl(x.inl) + (x.sub ? htmlBlocos(x.sub) : '') + '</li>';
    }).join('') + '</' + tag + '>';
  }
  function htmlTabela(b, rot) {
    var h = '<div class="bx-tabwrap">' + (rot ? '<div class="bx-tabrot">' + esc(rot) + '</div>' : '') + '<table class="bx-tab' + (b.cab ? '' : ' bx-semcab') + '">' + (b.cab ? '<thead><tr>' +
      b.cab.map(function (c) { return '<th>' + htmlInl(c) + '</th>'; }).join('') + '</tr></thead>' : '') + '<tbody>';
    b.linhas.forEach(function (r) { h += '<tr>' + r.map(function (c) { return '<td>' + htmlInl(c) + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table></div>';
  }
  function htmlCaixa(k, inner) {
    return '<div class="bx-caixa bx-' + k + '"><span class="bx-rot">' + esc(TIPOS_CAIXA[k] || k.toUpperCase()) + '</span>' + inner + '</div>';
  }
  function semPontaFinal(inl) {
    var r = inl.map(function (x) { return { t: x.t, b: x.b, i: x.i, c: x.c }; });
    while (r.length) { var u = r[r.length - 1]; u.t = u.t.replace(/[\s:—–-]+$/, ''); if (u.t) break; r.pop(); }
    return r;
  }
  function htmlBlocos(bl, ctx) {
    ctx = ctx || {};
    return (bl || []).map(function (b) {
      switch (b.t) {
        case 'h': return '<h' + (b.n + 1) + ' class="bx-h' + b.n + '">' + htmlInl(b.inl) + '</h' + (b.n + 1) + '>';
        case 'p': return '<p>' + htmlInl(b.inl) + '</p>';
        case 'lista': return htmlLista(b);
        case 'tabela': return htmlTabela(b, ctx.tabRot);
        case 'regua': return '<hr class="bx-regua">';
        case 'codigo': return '<pre class="bx-codigo">' + esc(b.linhas.join('\n')) + '</pre>';
        case 'cita': return '<blockquote class="' + (b.lei ? 'bx-leitxt bx-leisolo' : 'bx-cita') + '">' + htmlBlocos(b.blocos) + '</blockquote>';
        case 'caixa': case 'callout': return htmlCaixa(b.k, htmlBlocos(b.blocos));
        case 'lei':
          return '<div class="bx-lei' + (b.emLinha ? ' bx-lei-linha' : '') + '"><div class="bx-lei-cab"><span>' + htmlInl(semPontaFinal(b.ref)) + '</span><small>TEXTO LEGAL</small></div><div class="bx-lei-corpo">' +
            b.blocos.map(function (x) {
              if (x.t === 'p') return htmlLeiP(x.inl);
              if (x.t === 'cita') return '<blockquote class="bx-leitxt">' + htmlBlocos(x.blocos) + '</blockquote>';
              return htmlBlocos([x]);
            }).join('') + '</div></div>';
        case 'juris':
          return '<div class="bx-juris"><div class="bx-juris-cab">' + b.selos.map(function (s, n) { return '<span class="bx-selo' + (n ? ' bx-selo2' : '') + '">' + esc(s) + '</span>'; }).join('') +
            '<span class="bx-juris-tit">' + htmlInl(b.titulo) + '</span></div>' + (b.blocos.length ? '<div class="bx-juris-corpo">' + htmlBlocos(b.blocos) + '</div>' : '') + '</div>';
        case 'pegadinhas':
          return '<div class="bx-caixa bx-pegadinha"><span class="bx-rot">PEGADINHA</span>' + b.itens.map(function (x) {
            return '<div class="bx-peg"><div class="bx-peg-af"><span class="bx-x" aria-hidden="true">✗</span>' + (x.marca ? esc(x.marca) + ' ' : '') + htmlInl(x.afirmacao) + '</div>' +
              (x.correcao.length ? '<div class="bx-peg-cor">' + htmlBlocos(x.correcao) + '</div>' : '') + '</div>';
          }).join('') + '</div>';
        case 'questao':
          return '<div class="bx-questao" data-gab="' + esc(b.gab || '') + '"><div class="bx-q-rot">' + htmlInl(b.rotulo) + '</div>' + htmlBlocos(b.enunciado) +
            '<div class="bx-alts">' + b.alts.map(function (a) {
              return '<button type="button" class="bx-alt" data-letra="' + esc(a.letra) + '"><span class="bx-alt-l">' + esc(a.marca.replace(/\)$/, '')) + '</span><span class="bx-alt-t">' + htmlInl(a.inl) + (a.sub ? htmlBlocos(a.sub) : '') + '</span></button>';
            }).join('') + '</div><details class="bx-gab"><summary>Ver gabarito comentado</summary><p class="bx-gab-l">' + htmlInl(b.gabInl) + '</p>' + htmlBlocos(b.comentario) + '</details></div>';
      }
      return '';
    }).join('');
  }
  E.html = function (doc, o) {
    o = o || {};
    if (typeof doc === 'string') doc = E.ler(doc, o);
    var h = '<article class="bx' + (o.compacto ? ' bx-compacto' : '') + '">';
    if (!o.compacto && (doc.titulo || o.titulo)) {
      h += '<header class="bx-topo"><div class="bx-marca">BIZU DO CONCURSEIRO X' + (doc.kicker ? ' · ' + esc(doc.kicker.toUpperCase()) : '') + '</div>' +
        (o.trilha || o.materia ? '<div class="bx-trilha">' + esc([o.trilha, o.materia].filter(Boolean).join(' · ')) + '</div>' : '') +
        '<h1 class="bx-titulo">' + (doc.titulo ? htmlInl(doc.titulo) : esc(o.titulo)) + '</h1>' +
        (o.subtitulo ? '<div class="bx-sub">' + esc(o.subtitulo) + '</div>' : '') +
        (doc.meta.length ? '<div class="bx-meta">' + doc.meta.map(function (m) { return '<span><b>' + esc(m.rotulo) + ':</b> ' + htmlInl(m.valor) + '</span>'; }).join('') + '</div>' : '') +
        '</header>';
    }
    h += '<div class="bx-corpo">';
    var sec2 = doc.secoes.filter(function (s) { return s.nivel === 2; });
    if (!o.compacto && o.sumario !== false && sec2.length >= 4) {
      h += '<nav class="bx-sumario"><b>NESTA APOSTILA</b><ol>' + sec2.map(function (s) {
        return '<li><a href="#' + (o.prefixo || '') + s.id + '" data-bx-ir="' + (o.prefixo || '') + s.id + '">' + (s.num ? '<span class="bx-sn">' + esc(s.num) + '</span> ' : '') + htmlInl(s.titulo) + '</a></li>';
      }).join('') + '</ol></nav>';
    }
    h += htmlBlocos(doc.preambulo);
    doc.secoes.forEach(function (s) {
      var selo = SELO_SECAO[s.tipo];
      var corpo = htmlBlocos(s.blocos);
      if (s.tipo === 'resumo') corpo = htmlCaixa('revisao', corpo);
      else if (s.tipo === 'criticos') corpo = htmlCaixa('criticos', corpo);
      h += '<section class="bx-secao bx-s-' + s.tipo + '" id="' + (o.prefixo || '') + s.id + '">' +
        '<h2 class="bx-h' + s.nivel + ' bx-sh">' + (s.num ? '<span class="bx-num">' + esc(s.num) + '</span>' : '') + '<span class="bx-st">' + htmlInl(s.titulo) + '</span>' +
        (selo && !o.compacto ? '<span class="bx-selo-sec">' + esc(selo) + '</span>' : '') + '</h2>' + corpo + '</section>';
    });
    return h + '</div></article>';
  };
  // Liga as questões interativas (clique na alternativa) e o sumário
  E.ativar = function (raiz) {
    if (!raiz || raiz.__bxAtivo) return;
    raiz.__bxAtivo = true;
    raiz.addEventListener('click', function (ev) {
      var alt = ev.target.closest && ev.target.closest('.bx-alt');
      if (alt) {
        var q = alt.closest('.bx-questao'); if (!q || q.classList.contains('bx-respondida')) return;
        var gab = q.getAttribute('data-gab');
        q.classList.add('bx-respondida');
        q.querySelectorAll('.bx-alt').forEach(function (a) {
          if (a.getAttribute('data-letra') === gab) a.classList.add('bx-certa');
        });
        if (alt.getAttribute('data-letra') !== gab) alt.classList.add('bx-errada');
        var det = q.querySelector('details.bx-gab'); if (det) det.open = true;
        return;
      }
      var ir = ev.target.closest && ev.target.closest('[data-bx-ir]');
      if (ir) {
        var alvo = document.getElementById(ir.getAttribute('data-bx-ir'));
        if (alvo) { ev.preventDefault(); alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }
    });
  };

  // ------------------------------------------------------ sistema visual (tokens)
  E.cores = {
    navy: '#0F1B33', navy2: '#1B2B4B', azul: '#2447A8', ouro: '#B8860B', ouroClaro: '#FFF8E1', ouroBorda: '#E6C46A',
    verde: '#1E7B45', verdeClaro: '#EAF6EE', verdeBorda: '#A9D8B8', vermelho: '#B42318', vermelhoClaro: '#FDEDEC', vermelhoBorda: '#F2B8B5',
    azulClaro: '#EEF3FF', azulBorda: '#B7C8F0', cinza: '#F3F5F8', cinza2: '#E3E7EE', texto: '#1C2430', suave: '#5B6574', papel: '#FFFFFF', lei: '#FBFAF6',
    roxo: '#5B3FA0', roxoClaro: '#F3EFFB', roxoBorda: '#CFC3EC'
  };
  E.fontes = { texto: 'Source Sans 3', lei: 'Source Serif 4' };
  E.fontesCss = 'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap';
  E.css = [
    '.bx{--bx-navy:#0F1B33;--bx-azul:#2447A8;--bx-ouro:#B8860B;--bx-ouro-c:#FFF8E1;--bx-ouro-b:#E6C46A;--bx-verde:#1E7B45;--bx-verde-c:#EAF6EE;--bx-verde-b:#A9D8B8;',
    '--bx-verm:#B42318;--bx-verm-c:#FDEDEC;--bx-verm-b:#F2B8B5;--bx-azul-c:#EEF3FF;--bx-azul-b:#B7C8F0;--bx-cinza:#F3F5F8;--bx-cinza2:#E3E7EE;--bx-texto:#1C2430;--bx-suave:#5B6574;',
    '--bx-roxo:#5B3FA0;--bx-roxo-c:#F3EFFB;--bx-roxo-b:#CFC3EC;',
    'background:#fff;color:var(--bx-texto);font-family:"Source Sans 3",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:17px;line-height:1.62;border-radius:14px;overflow:hidden;text-align:left;-webkit-text-size-adjust:100%}',
    '.bx *{box-sizing:border-box}',
    '.bx-topo{background:var(--bx-navy);color:#fff;padding:26px 32px 22px;border-left:6px solid var(--bx-ouro)}',
    '.bx-marca{font-weight:800;letter-spacing:.08em;font-size:12px;color:var(--bx-ouro-b)}',
    '.bx-trilha{font-size:12px;color:#9FB0CC;margin-top:12px;text-transform:uppercase;letter-spacing:.06em}',
    '.bx .bx-titulo{font-size:26px;line-height:1.22;margin:6px 0 6px;color:#fff;font-weight:700;letter-spacing:0;border:0;padding:0}',
    '.bx-sub{color:#B9C5DA;font-size:14px}',
    '.bx-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}',
    '.bx-meta span{font-size:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);padding:3px 10px;border-radius:99px;color:#DCE3EE}',
    '.bx-meta b{color:#fff;font-weight:600}',
    '.bx-corpo{padding:6px 32px 30px}',
    '.bx p{margin:0 0 11px}',
    '.bx strong{color:var(--bx-navy);font-weight:700}',
    '.bx em{font-style:italic}',
    '.bx code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;background:var(--bx-cinza);padding:1px 5px;border-radius:4px}',
    '.bx-sumario{background:var(--bx-cinza);border-radius:10px;padding:14px 18px;margin:20px 0 6px;font-size:14px}',
    '.bx-sumario b{display:block;font-size:11.5px;letter-spacing:.07em;color:var(--bx-suave);margin-bottom:6px}',
    '.bx-sumario ol{margin:0;padding:0;list-style:none;columns:2;column-gap:28px}',
    '.bx-sumario li{break-inside:avoid;margin:3px 0}',
    '.bx-sumario a{color:var(--bx-texto);text-decoration:none}',
    '.bx-sumario a:hover{color:var(--bx-azul);text-decoration:underline}',
    '.bx-sn{display:inline-block;min-width:20px;color:var(--bx-ouro);font-weight:700}',
    '.bx-secao{scroll-margin-top:80px}',
    '.bx .bx-sh{font-size:19px;line-height:1.3;color:var(--bx-navy);margin:32px 0 12px;padding:0 0 8px;border:0;border-bottom:2px solid var(--bx-cinza2);display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-weight:700;background:none}',
    '.bx .bx-sh.bx-h1{font-size:21px;border-bottom-color:var(--bx-navy)}',
    '.bx-num{color:var(--bx-ouro);font-weight:800}',
    '.bx-st{flex:1 1 200px}',
    '.bx-selo-sec{font-size:10.5px;font-weight:800;letter-spacing:.07em;color:var(--bx-suave);border:1px solid var(--bx-cinza2);border-radius:5px;padding:2px 7px;white-space:nowrap}',
    '.bx-s-pegadinhas .bx-selo-sec{color:var(--bx-verm);border-color:var(--bx-verm-b)}',
    '.bx-s-resumo .bx-selo-sec{color:var(--bx-verde);border-color:var(--bx-verde-b)}',
    '.bx-s-criticos .bx-selo-sec{color:var(--bx-ouro);border-color:var(--bx-ouro-b)}',
    '.bx .bx-h3{font-size:16.5px;color:var(--bx-azul);margin:22px 0 8px;padding:0 0 0 10px;border:0;border-left:3px solid var(--bx-ouro);font-weight:700;background:none}',
    '.bx .bx-h4{font-size:15.5px;color:var(--bx-navy);margin:18px 0 6px;font-weight:700;border:0;padding:0;background:none}',
    '.bx .bx-h1:not(.bx-sh),.bx .bx-h2:not(.bx-sh){font-size:18px;color:var(--bx-navy);margin:24px 0 10px;font-weight:700;border:0;padding:0;background:none}',
    '.bx-lista{margin:4px 0 12px;padding-left:22px}',
    '.bx-lista li{margin:3px 0}',
    '.bx-l-num,.bx-l-letra,.bx-l-romano,.bx-l-alt{list-style:none;padding-left:4px}',
    '.bx-l-num>li,.bx-l-letra>li,.bx-l-romano>li,.bx-l-alt>li{padding-left:28px;text-indent:-28px}',
    '.bx-l-num>li>*,.bx-l-letra>li>*,.bx-l-romano>li>*{text-indent:0}',
    '.bx-mk{display:inline-block;min-width:24px;text-indent:0;color:var(--bx-azul);font-weight:700}',
    '.bx-l-bullet>li::marker{color:var(--bx-ouro)}',
    '.bx-regua{border:0;border-top:1px solid var(--bx-cinza2);margin:18px 0}',
    '.bx-codigo{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.45;background:var(--bx-cinza);border-radius:8px;padding:12px 14px;overflow-x:auto;white-space:pre;margin:10px 0 14px}',
    '.bx-cita{margin:12px 0;padding:10px 16px;border-left:4px solid var(--bx-azul-b);background:#F8FAFD;border-radius:0 8px 8px 0;color:#2A3442}',
    '.bx-cita p:last-child{margin-bottom:0}',
    '.bx-caixa{border-radius:10px;padding:12px 16px;margin:16px 0;border:1px solid var(--bx-cinza2);background:var(--bx-cinza)}',
    '.bx-caixa>p:last-child,.bx-caixa>.bx-lista:last-child{margin-bottom:0}',
    '.bx-rot{font-size:10.5px;font-weight:800;letter-spacing:.08em;display:inline-block;padding:2px 8px;border-radius:5px;margin-bottom:7px;background:var(--bx-navy);color:#fff}',
    '.bx-bizu{background:var(--bx-ouro-c);border-color:var(--bx-ouro-b)}.bx-bizu>.bx-rot{background:var(--bx-ouro)}',
    '.bx-criticos{background:var(--bx-ouro-c);border-color:var(--bx-ouro-b)}.bx-criticos>.bx-rot{background:var(--bx-ouro)}',
    '.bx-atencao{background:var(--bx-azul-c);border-color:var(--bx-azul-b)}.bx-atencao>.bx-rot{background:var(--bx-azul)}',
    '.bx-pegadinha{background:var(--bx-verm-c);border-color:var(--bx-verm-b)}.bx-pegadinha>.bx-rot{background:var(--bx-verm)}',
    '.bx-resumo,.bx-revisao{background:var(--bx-verde-c);border-color:var(--bx-verde-b)}.bx-resumo>.bx-rot,.bx-revisao>.bx-rot{background:var(--bx-verde)}',
    '.bx-exemplo{background:#F7F9FC;border-color:var(--bx-cinza2)}.bx-exemplo>.bx-rot{background:#4A5568}',
    '.bx-doutrina{background:var(--bx-roxo-c);border-color:var(--bx-roxo-b)}.bx-doutrina>.bx-rot{background:var(--bx-roxo)}',
    '.bx-comparacao{background:#fff}.bx-lei.bx-caixa{background:#fff}',
    '.bx-peg{padding:9px 0;border-top:1px dashed var(--bx-verm-b)}',
    '.bx-peg:first-of-type{border-top:0;padding-top:2px}',
    '.bx-peg-af{font-style:italic;color:#3A1F1C}',
    '.bx-peg-af strong{color:#3A1F1C}',
    '.bx-x{font-style:normal;font-weight:800;color:var(--bx-verm);margin-right:8px}',
    '.bx-peg-cor{padding-left:20px;margin-top:3px;font-size:15px}',
    '.bx-peg-cor p{margin-bottom:4px}',
    '.bx-lei{border:1px solid var(--bx-cinza2);border-radius:10px;margin:14px 0;overflow:hidden;background:#fff}',
    '.bx-lei-cab{background:var(--bx-navy);color:#fff;font-size:13px;font-weight:700;padding:7px 14px;display:flex;justify-content:space-between;gap:10px;align-items:baseline}',
    '.bx-lei-cab strong{color:#fff}',
    '.bx-lei-cab small{color:var(--bx-ouro-b);font-weight:800;letter-spacing:.08em;font-size:10.5px;white-space:nowrap}',
    '.bx-lei-corpo{padding:4px 0}',
    '.bx-leitxt{font-family:"Source Serif 4",Georgia,"Times New Roman",serif;font-size:16.5px;line-height:1.6;margin:8px 14px;padding:10px 14px;background:#FBFAF6;border-left:4px solid var(--bx-ouro);border-radius:0 6px 6px 0;color:#1F2530}',
    '.bx-leitxt p:last-child{margin-bottom:0}',
    '.bx-leisolo{margin:12px 0}',
    '.bx-com{font-size:14.5px;color:#46505E;padding:0 16px;margin:8px 0}',
    '.bx-lei-corpo>.bx-lista,.bx-lei-corpo>p:not(.bx-com){padding:0 16px}',
    '.bx-juris{border:1px solid var(--bx-cinza2);border-radius:10px;margin:14px 0;overflow:hidden;background:#fff}',
    '.bx-juris-cab{display:flex;gap:7px;flex-wrap:wrap;align-items:center;padding:9px 14px;background:var(--bx-cinza)}',
    '.bx-selo{font-size:10.5px;font-weight:800;letter-spacing:.06em;padding:2px 7px;border-radius:5px;background:var(--bx-navy);color:#fff}',
    '.bx-selo2{background:#fff;color:var(--bx-navy);border:1px solid var(--bx-cinza2)}',
    '.bx-juris-tit{font-weight:700;color:var(--bx-navy);font-size:15px;flex:1 1 220px}',
    '.bx-juris-corpo{padding:10px 16px 2px;font-size:15px}',
    '.bx-tabwrap{overflow-x:auto;margin:14px 0;-webkit-overflow-scrolling:touch}',
    '.bx-tabrot{font-size:10.5px;font-weight:800;letter-spacing:.08em;color:var(--bx-suave);margin-bottom:5px}',
    '.bx-tab{width:100%;border-collapse:separate;border-spacing:0;font-size:14px;border:1px solid var(--bx-cinza2);border-radius:10px;overflow:hidden;margin:0}',
    '.bx-tab th{background:var(--bx-navy);color:#fff;text-align:left;padding:9px 12px;font-weight:600;vertical-align:bottom}',
    '.bx-tab th strong{color:#fff}',
    '.bx-tab td{padding:9px 12px;border-top:1px solid var(--bx-cinza2);vertical-align:top;background:#fff;color:var(--bx-texto)}',
    '.bx-tab tr:nth-child(even) td{background:#F8FAFC}',
    '.bx-tab td:first-child{font-weight:600;color:var(--bx-navy)}',
    '.bx-questao{border:1px solid var(--bx-cinza2);border-radius:10px;margin:16px 0;padding:14px 16px;background:#fff}',
    '.bx-q-rot{font-size:12px;font-weight:800;letter-spacing:.06em;color:var(--bx-azul);margin-bottom:6px;text-transform:uppercase}',
    '.bx-q-rot strong{color:var(--bx-azul)}',
    '.bx-alts{display:flex;flex-direction:column;gap:6px;margin:8px 0 4px}',
    '.bx-alt{display:flex;gap:10px;align-items:flex-start;text-align:left;width:100%;padding:8px 10px;border:1px solid var(--bx-cinza2);border-radius:8px;background:#fff;color:var(--bx-texto);font:inherit;font-size:15px;line-height:1.5;cursor:pointer}',
    '.bx-alt:hover{border-color:var(--bx-azul-b);background:#FAFCFF}',
    '.bx-alt-l{flex:0 0 24px;height:24px;border-radius:50%;background:var(--bx-cinza);color:var(--bx-azul);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}',
    '.bx-alt-t{flex:1}',
    '.bx-respondida .bx-alt{cursor:default}',
    '.bx-alt.bx-certa{border-color:var(--bx-verde-b);background:var(--bx-verde-c)}.bx-alt.bx-certa .bx-alt-l{background:var(--bx-verde);color:#fff}',
    '.bx-alt.bx-errada{border-color:var(--bx-verm-b);background:var(--bx-verm-c)}.bx-alt.bx-errada .bx-alt-l{background:var(--bx-verm);color:#fff}',
    '.bx-gab{margin-top:10px;background:var(--bx-verde-c);border:1px solid var(--bx-verde-b);border-radius:8px;padding:8px 12px;font-size:15px}',
    '.bx-gab summary{cursor:pointer;font-weight:700;color:var(--bx-verde)}',
    '.bx-gab[open] summary{margin-bottom:6px}',
    '.bx-gab-l strong{color:var(--bx-verde)}',
    '.bx-compacto{background:transparent;border-radius:0;font-size:inherit;line-height:1.6;color:inherit}',
    '.bx-compacto .bx-corpo{padding:0}',
    '.bx-compacto .bx-sh{font-size:16px;margin:14px 0 8px;color:inherit}',
    '.bx-compacto strong{color:inherit}',
    '@media (max-width:640px){.bx{font-size:16.5px;border-radius:10px}.bx-topo{padding:20px 16px 16px}.bx .bx-titulo{font-size:22px}',
    '.bx-corpo{padding:4px 14px 22px}.bx-sumario ol{columns:1}.bx .bx-sh{font-size:17.5px}.bx-leitxt{margin:8px 10px;font-size:16px}.bx-com{padding:0 12px}',
    '.bx-tab{font-size:13.5px}.bx-tab th,.bx-tab td{padding:8px 9px}.bx-questao{padding:12px}}',
    '@media print{.bx{border-radius:0}.bx-gab{display:block}.bx-caixa,.bx-lei,.bx-juris,.bx-tab,.bx-questao{break-inside:avoid}.bx-sh,.bx-h3{break-after:avoid}}'
  ].join('\n');

  G.BizuEditorial = E;
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
