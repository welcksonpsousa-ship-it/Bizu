/* ==========================================================================
   Bizu do Concurseiro X — aplicação (app.js)
   Projeto independente. A organização (menu lateral, painel, cronômetro,
   cronograma, revisões, desempenho, administração) segue a lógica do Bizu
   Delta X, mas todo o código e a API (/api → Edge Function cx-api do projeto
   Supabase bizu-concurseiro-x) são próprios.
   Hierarquia: Curso → Disciplina → Assunto → Subassunto.
   Nesta etapa só existe a estrutura curricular: toda área de conteúdo mostra
   estado vazio até o material ser publicado pela administração.
   ========================================================================== */
'use strict';
const API = '/api';
const S = { cursos: [], curso: null, est: [], ass: {}, disc: {}, admin: false, dom: {}, perfil: {}, email: '', view: 'painel' };
const $ = (id) => document.getElementById(id);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pctOf = (o) => (o && o.total ? Math.round((o.acertos / o.total) * 100) : 0);
const corP = (p) => (p < 50 ? 'var(--err)' : p < 70 ? 'var(--warn)' : 'var(--ok)');
const hms = (s) => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':'); };
const hm = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h + 'h' + String(m).padStart(2, '0'); };
const diaISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const nomeDia = (iso, o) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d).toLocaleDateString('pt-BR', o || { weekday: 'long', day: '2-digit', month: '2-digit' }); };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function emp(txt, sub) { return `<div class="empty"><div class="empty-icon"></div><div class="empty-txt">${esc(txt)}</div>${sub ? `<div class="muted small mt1">${esc(sub)}</div>` : ''}</div>`; }
function ld(t) { return `<div style="padding:16px;color:var(--text-2);display:flex;align-items:center;gap:8px"><div class="ldots"><span></span><span></span><span></span></div>${t ? `<span>${esc(t)}</span>` : ''}</div>`; }
const EM_PREPARO = 'Conteúdo em preparação';
const EM_PREPARO_SUB = 'Nesta primeira etapa o Bizu do Concurseiro X tem apenas a estrutura do edital. O material será publicado aqui assim que estiver pronto.';

async function api(path, opts = {}) {
  opts.credentials = 'same-origin';
  opts.headers = opts.headers || {};
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  if (opts.body) { opts.headers['Content-Type'] = 'application/json'; opts.method = opts.method || 'POST'; }
  const r = await fetch(API + path, opts);
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && !path.startsWith('/login') && $('shell').classList.contains('on')) { location.reload(); throw new Error('Sessão expirada'); }
  if (r.status >= 400 || d.error) throw new Error(d.message || 'Erro ' + r.status);
  return d;
}
const cq = () => 'curso=' + encodeURIComponent(S.curso ? S.curso.id : '');

/* ---------------- LOGIN ---------------- */
async function doLogin() {
  const msg = $('loginMsg'); msg.textContent = '';
  try {
    await api('/login', { body: { email: $('loginEmail').value.trim(), password: $('loginSenha').value } });
    iniciar();
  } catch (e) { msg.textContent = e.message || 'E-mail ou senha incorretos'; }
}
$('btnLogin').addEventListener('click', doLogin);
$('loginSenha').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
$('lnkEsqueci').addEventListener('click', async (e) => {
  e.preventDefault();
  const msg = $('loginMsg');
  const email = ($('loginEmail').value || '').trim() || prompt('Digite seu e-mail cadastrado:') || '';
  if (!email) return;
  msg.textContent = 'Enviando...';
  try { await api('/password/recover', { body: { email, redirect_to: location.origin + location.pathname } }); } catch (err) {}
  msg.textContent = 'Se o e-mail existir, um link de recuperação foi enviado.';
});
$('btnReset').addEventListener('click', async () => {
  const msg = $('resetMsg'); const p1 = $('resetSenha').value, p2 = $('resetSenha2').value;
  if (p1.length < 6) { msg.textContent = 'A senha deve ter no mínimo 6 caracteres.'; return; }
  if (p1 !== p2) { msg.textContent = 'As senhas não coincidem.'; return; }
  const token = new URLSearchParams(location.hash.slice(1)).get('access_token');
  if (!token) { msg.textContent = 'Link de recuperação inválido ou expirado.'; return; }
  msg.textContent = 'Salvando...';
  try {
    await api('/password/redefinir', { body: { access_token: token, password: p1 } });
    history.replaceState(null, '', location.pathname);
    msg.textContent = 'Senha alterada! Você já pode entrar.';
    setTimeout(() => { $('resetPanel').classList.add('hidden'); $('loginPanel').classList.remove('hidden'); }, 1500);
  } catch (e) { msg.textContent = e.message; }
});
$('btnLogout').addEventListener('click', () => { api('/logout', { method: 'POST' }).catch(() => {}).finally(() => location.reload()); });

/* ---------------- INÍCIO ---------------- */
async function iniciar() {
  const d = await api('/bootstrap');
  $('gate').style.display = 'none'; $('shell').classList.add('on');
  S.cursos = d.cursos || []; S.admin = !!d.admin; S.perfil = d.profile || {}; S.email = d.profile?.email || '';
  S.metrics = d.metrics || {};
  S.curso = S.cursos.find((c) => c.id === d.curso_id) || S.cursos[0] || null;
  if (S.admin) { $('admNavSec').classList.remove('hidden'); $('admNavBtn').classList.remove('hidden'); }
  $('xpPill').textContent = (S.metrics.xp || 0) + ' XP';
  $('painelNome').textContent = (S.perfil.full_name || '').split(' ')[0] || 'Candidato';
  $('painelData').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  renderCursoSwitch();
  await Promise.all([carregarEstrutura(), carregarDominio()]);
  cronRecuperar();
  const v = (location.hash.match(/^#v=([\w-]+)/) || [])[1];
  showView(v && $('v-' + (v.startsWith('m-') ? 'material' : v)) ? v : 'painel');
}
async function carregarEstrutura() {
  if (!S.curso) return;
  const d = await api('/estrutura?' + cq());
  S.est = d.disciplinas || []; S.ass = {}; S.disc = {};
  S.est.forEach((di) => { S.disc[di.id] = di; di.assuntos.forEach((a) => { S.ass[a.id] = { ...a, disciplina: di.nome, disciplina_id: di.id }; }); });
  preencherCascatas();
}
async function carregarDominio() { try { S.dom = (await api('/dominio')).dominio || {}; } catch (e) { S.dom = {}; } }
function renderCursoSwitch() {
  $('cursoSwitch').innerHTML = S.cursos.map((c) => `<button type="button" class="career-btn${S.curso && c.id === S.curso.id ? ' on' : ''}" data-curso="${esc(c.id)}" aria-pressed="${S.curso && c.id === S.curso.id}" title="${esc(c.nome)}"><strong>${esc(c.nome.toUpperCase())}</strong></button>`).join('');
  $$('#cursoSwitch .career-btn').forEach((b) => b.addEventListener('click', () => trocarCurso(b.dataset.curso)));
  $('uiTrilhaNome').textContent = S.curso ? S.curso.nome.toUpperCase() : '—';
}
async function trocarCurso(id) {
  if (S.curso && S.curso.id === id) return;
  S.curso = S.cursos.find((c) => c.id === id) || S.curso;
  S.crono = undefined;
  renderCursoSwitch();
  api('/perfil', { body: { curso_id: id } }).catch(() => {});
  await carregarEstrutura();
  showView(S.view.startsWith('assunto') ? 'materias' : S.view);
}

/* ---------------- NAVEGAÇÃO ---------------- */
const TITULOS = {};
$$('.nav-btn[data-v]').forEach((b) => { TITULOS[b.dataset.v] = b.querySelector('.nl').textContent.trim(); });
Object.assign(TITULOS, { assunto: 'Assunto', admin: 'Central Administrativa' });
const TIPOS = {
  pdf: { nome: 'Bizu PDF', sub: 'Apostilas em PDF organizadas por assunto do edital' },
  aula: { nome: 'Aulas', sub: 'Aulas em texto, organizadas por assunto do edital' },
  lei_seca: { nome: 'Lei Seca', sub: 'Texto literal da legislação cobrada, com link para a fonte oficial' },
  jurisprudencia: { nome: 'Jurisprudência', sub: 'Súmulas e decisões relevantes, com link para a fonte oficial' },
  mapa_mental: { nome: 'Mapas Mentais', sub: 'Mapas mentais por assunto' },
  flashcard: { nome: 'Flashcards', sub: 'Cartões de memorização por assunto' },
  revisao: { nome: 'Revisões rápidas', sub: 'Material de revisão por assunto' },
};
const SLOTS = [['questoes', 'Questões'], ['pdf', 'Bizu PDF'], ['aula', 'Aulas'], ['flashcard', 'Flashcards'], ['mapa_mental', 'Mapas mentais'], ['lei_seca', 'Lei seca'], ['jurisprudencia', 'Jurisprudência'], ['revisao', 'Revisões rápidas']];

function showView(name, arg) {
  S.view = name;
  const alvo = name.startsWith('m-') ? 'material' : name;
  $$('.view').forEach((v) => v.classList.toggle('on', v.id === 'v-' + alvo));
  $$('.nav-btn').forEach((b) => b.classList.toggle('on', b.dataset.v === name));
  $('uiPageTitle').textContent = name.startsWith('m-') ? TIPOS[name.slice(2)].nome : TITULOS[name] || '';
  document.title = ($('uiPageTitle').textContent ? $('uiPageTitle').textContent + ' · ' : '') + 'Bizu do Concurseiro X';
  if (name !== 'assunto') history.replaceState(null, '', '#v=' + name);
  fecharDrawer();
  try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
  const fn = {
    painel: renderPainel, estudar: renderEstudar,
    cronograma: carregarCronograma, calendario: renderCalendario, cronometro: carregarCronometro,
    materias: renderMaterias, assunto: () => renderAssunto(arg), busca: () => { $('buscaInp').focus(); buscar(); },
    material: () => renderMaterial(name.slice(2)), meuresumo: renderMeuResumo, questoes: renderQuestoes,
    chatx: renderChatX, simulados: renderSimulados, salvas: renderSalvas, revisoes: renderRevisoes, redacao: renderRedacao,
    desempenho: renderDesempenho, dominio: renderDominio, conta: renderConta, admin: renderAdmin,
  }[alvo];
  if (fn) fn();
}
$$('.nav-btn[data-v]').forEach((b) => b.addEventListener('click', () => showView(b.dataset.v)));
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) showView(g.dataset.go); });

/* Menu lateral: recolher (desktop) e gaveta (mobile) */
const isMobile = () => window.innerWidth <= 860;
function abrirDrawer() { $('sidebar').classList.add('open'); $('uiBackdrop').hidden = false; $('menuToggle').setAttribute('aria-expanded', 'true'); }
function fecharDrawer() { $('sidebar').classList.remove('open'); $('uiBackdrop').hidden = true; $('menuToggle').setAttribute('aria-expanded', 'false'); }
$('menuToggle').addEventListener('click', () => ($('sidebar').classList.contains('open') ? fecharDrawer() : abrirDrawer()));
$('uiBackdrop').addEventListener('click', fecharDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharDrawer(); });
function setCollapsed(v) {
  $('shell').classList.toggle('ui-collapsed', !!v);
  $('uiCollapse').setAttribute('aria-pressed', v ? 'true' : 'false');
  $('uiCollapse').setAttribute('aria-label', v ? 'Expandir menu lateral' : 'Recolher menu lateral');
  lsSet('cx_sb_collapsed', v ? '1' : '0');
}
$('uiCollapse').addEventListener('click', () => setCollapsed(!$('shell').classList.contains('ui-collapsed')));
if (lsGet('cx_sb_collapsed', '0') === '1') setCollapsed(true);
$('uiTrilhaChip').addEventListener('click', () => { if (isMobile()) abrirDrawer(); else setCollapsed(false); const on = document.querySelector('#cursoSwitch .career-btn.on'); if (on) setTimeout(() => on.focus(), 250); });

/* ---------------- FILTROS EM CASCATA (Disciplina → Assunto → Subassunto) ---------------- */
const CASCATAS = [
  { d: 'qDisc', a: 'qAss', s: 'qSubA' }, { d: 'matlDisc', a: 'matlAss', s: 'matlSubA', onChange: () => renderMaterial(S.view.slice(2)) },
  { d: 'mrDisc', a: 'mrAss', onChange: () => abrirResumo() }, { d: 'cronDisc', a: 'cronAss' },
];
function opts(lista, vazio) { return `<option value="">${esc(vazio)}</option>` + lista.map((x) => `<option value="${esc(x.id)}">${esc(x.nome)}</option>`).join(''); }
function preencherCascatas() {
  CASCATAS.forEach((c) => {
    const d = $(c.d), val = d.value;
    d.innerHTML = opts(S.est, 'Todas as disciplinas');
    if (S.disc[val]) d.value = val;
    preencherAss(c);
  });
  $('domDisc').innerHTML = opts(S.est, 'Todas as disciplinas');
}
function preencherAss(c) {
  const di = S.disc[$(c.d).value], a = $(c.a), val = a.value;
  a.innerHTML = opts(di ? di.assuntos : [], di ? 'Todos os assuntos' : 'Escolha a disciplina');
  a.disabled = !di;
  if (di && di.assuntos.some((x) => x.id === val)) a.value = val;
  if (c.s) preencherSub(c);
}
function preencherSub(c) {
  const as = S.ass[$(c.a).value], s = $(c.s), val = s.value;
  s.innerHTML = opts(as ? as.subassuntos : [], as ? (as.subassuntos.length ? 'Todos os subassuntos' : 'Sem subassuntos') : 'Escolha o assunto');
  s.disabled = !as || !as.subassuntos.length;
  if (as && as.subassuntos.some((x) => x.id === val)) s.value = val;
}
CASCATAS.forEach((c) => {
  $(c.d).addEventListener('change', () => { preencherAss(c); if (c.onChange) c.onChange(); });
  $(c.a).addEventListener('change', () => { if (c.s) preencherSub(c); if (c.onChange) c.onChange(); });
  if (c.s) $(c.s).addEventListener('change', () => { if (c.onChange) c.onChange(); });
});
function filtroQS(c) {
  const p = [cq()];
  if ($(c.d).value) p.push('disciplina_id=' + $(c.d).value);
  if ($(c.a).value) p.push('assunto_id=' + $(c.a).value);
  if (c.s && $(c.s).value) p.push('subassunto_id=' + $(c.s).value);
  return p.join('&');
}
function selecionar(c, discId, assId, subId) {
  $(c.d).value = discId || ''; preencherAss(c);
  $(c.a).value = assId || ''; if (c.s) { preencherSub(c); $(c.s).value = subId || ''; }
}
const totalAssuntos = () => Object.keys(S.ass).length;
const totalSub = () => Object.values(S.ass).reduce((n, a) => n + a.subassuntos.length, 0);
const totalConteudo = (a) => Object.values(a.conteudo || {}).reduce((n, v) => n + v, 0);

/* ---------------- PAINEL ---------------- */
async function renderPainel() {
  const c = S.curso;
  const m = S.metrics || {};
  $('stQ').textContent = m.questions || 0; $('stA').textContent = Math.round(m.accuracy || 0) + '%';
  $('stXP').textContent = m.xp || 0; $('stNivel').textContent = m.nivel || 1;
  $('stAssuntos').textContent = totalAssuntos();
  $('stDom').textContent = Object.keys(S.ass).filter((id) => (S.dom[id] || 0) >= 4).length;
  if (c) {
    const nQ = S.est.reduce((n, d) => n + (d.questoes || 0), 0);
    $('painelCurso').innerHTML = `<div class="now-mat">${esc(c.nome)}</div>
      <div class="now-meta">${esc(c.banca || '')} · ${S.est.length} disciplinas · ${totalAssuntos()} assuntos · ${totalSub()} subassuntos${nQ ? ` · ${nQ} questões na prova objetiva` : ''}</div>
      <p class="muted small mt1">${esc(c.edital_ref || '')}</p>
      <div class="now-actions mt2"><button type="button" class="btn-blue" data-go="materias">Ver disciplinas do edital</button><button type="button" class="btn-ghost" data-go="redacao">Redação</button></div>`;
  }
  try {
    const d = await api('/desempenho?' + cq()); const pd = d.por_disciplina || {};
    const ms = Object.keys(pd).sort((a, b) => pctOf(pd[a]) - pctOf(pd[b]));
    $('painelDesemp').innerHTML = ms.length ? ms.slice(0, 8).map((mt) => { const p = pctOf(pd[mt]); return `<div class="prow"><div class="plabel" title="${esc(mt)}">${esc(mt)}</div><div class="pbar-bg"><div class="pbar" style="width:${p}%;background:${corP(p)}"></div></div><div class="ppct" style="color:${corP(p)}">${p}%</div></div>`; }).join('') : emp('Responda questões para ver aqui', 'As questões do curso ainda estão em preparação.');
  } catch (e) { $('painelDesemp').innerHTML = emp('Não foi possível carregar o desempenho'); }
  try {
    const r = await api('/revisoes?' + cq());
    $('stRevP').textContent = r.total || 0; badgeRev(r.total || 0);
    $('painelRevs').innerHTML = r.revisoes.length ? r.revisoes.slice(0, 5).map(revCard).join('') : emp('Sem revisões pendentes');
  } catch (e) { $('painelRevs').innerHTML = emp('Sem revisões pendentes'); }
  $('cobContainer').innerHTML = S.est.map((di) => {
    const com = di.assuntos.filter((a) => totalConteudo(a) > 0).length;
    return `<div class="prow"><div class="plabel" title="${esc(di.nome)}">${esc(di.nome)}</div><div class="pbar-bg"><div class="pbar" style="width:${di.assuntos.length ? Math.round((com / di.assuntos.length) * 100) : 0}%;background:var(--primary)"></div></div><div class="ppct">${com}/${di.assuntos.length}</div></div>`;
  }).join('') + `<p class="muted small mt1">Assuntos com algum material publicado. ${EM_PREPARO}.</p>`;
}
function badgeRev(n) { $('badgeRev').textContent = n; $('badgeRev').classList.toggle('hidden', !n); }

/* ---------------- CONTEXTO DO PLANO (desempenho + revisões + domínio) ---------------- */
// Junta o que o aluno já fez e entrega ao motor (plano.js), que decide o que estudar.
async function ctxPlano() {
  const [d, r, c, bi] = await Promise.all([
    api('/desempenho?' + cq()).catch(() => ({})),
    api('/revisoes?' + cq()).catch(() => ({ revisoes: [] })),
    api('/cron/resumo').catch(() => ({ sessoes: [] })),
    api('/banco/insights?' + cq()).catch(() => ({ assuntos: [] })),
  ]);
  const banco = {}; (bi.assuntos || []).forEach((x) => { banco[x.assunto_id] = x; });
  const estudados = new Set((c.sessoes || []).filter((x) => x.assunto_id && (x.liquido_s || 0) >= 300).map((x) => x.assunto_id));
  const an = Plano.analisar({ cursoId: S.curso.id, est: S.est, dom: S.dom, porAssunto: d.por_assunto || {}, estudados, banco });
  return { an, revs: (r.revisoes || []).filter((x) => S.ass[x.assunto_id]) };
}
function marcarEstudado(id) { if ((S.dom[id] || 0) < 1) { S.dom[id] = 1; api('/dominio', { body: { assunto_id: id, nivel: 1 } }).catch(() => {}); } }
function abrirPasso(tipo, id) {
  const a = S.ass[id]; if (!a) return;
  if (tipo === 'questoes') { showView('questoes'); selecionar(CASCATAS[0], a.disciplina_id, id); buscarQuestoes(); }
  else { showView('m-' + tipo); selecionar(CASCATAS[1], a.disciplina_id, id); renderMaterial(tipo); }
}

/* ---------------- O QUE ESTUDAR ---------------- */
const EA_TIPO = { novo: 'assunto novo', fraco: 'ponto fraco', pratica: 'falta praticar', bom: 'manutenção' };
const eaChaveDia = () => 'bizux.ea.' + S.curso.id + '.' + diaISO(new Date());
const eaFeitos = () => { try { return JSON.parse(lsGet(eaChaveDia(), '{}')) || {}; } catch (e) { return {}; } };
function renderEstudar() {
  const m = parseInt(lsGet('bizux.ea.min', '90'), 10);
  $('eaTempo').value = m >= 20 ? m : 90;
  gerarEA();
}
async function gerarEA() {
  const cont = $('eaContainer');
  let t = parseInt($('eaTempo').value, 10);
  if (!(t >= 20)) t = 90;
  t = Math.min(480, Math.round(t / 5) * 5); $('eaTempo').value = t; lsSet('bizux.ea.min', String(t));
  if (!S.est.length) { cont.innerHTML = emp('O curso ainda não tem assuntos cadastrados'); return; }
  cont.innerHTML = ld('Analisando seu desempenho...');
  try {
    const { an, revs } = await ctxPlano();
    const vencidas = revs.filter((r) => r.vencida || r.hoje);
    desenharEA(Plano.sessaoHoje(an, t, vencidas), an, t);
  } catch (e) { cont.innerHTML = emp(e.message); }
}
function desenharEA(s, an, t) {
  const feitos = eaFeitos(); let ini = 0;
  const passo = (key, titulo, min, extra, abrir) => `<li class="ea-passo${feitos[key] ? ' feito' : ''}"><label class="ea-chk"><input type="checkbox" data-k="${esc(key)}"${extra || ''}${feitos[key] ? ' checked' : ''}><span class="ea-ptxt">${esc(titulo)}</span></label><span class="ea-pmin">${min} min</span>${abrir ? `<button type="button" class="btn-ghost btn-sm" data-abrir="${abrir[0]}" data-ass="${abrir[1]}">Abrir</button>` : ''}</li>`;
  const blocos = s.blocos.map((b) => {
    const faixa = `${ini}–${ini + b.min} min`; ini += b.min;
    if (b.papel === 'rev') {
      const un = Math.max(1, Math.round(b.min / 5)), base = Math.floor(un / b.revs.length), ex = un % b.revs.length;
      return `<div class="ea-bloco ea-rev"><div class="ea-bh"><span class="ea-faixa">${faixa}</span><strong>Revisão relâmpago</strong><span class="badge">${b.min} min</span></div>
        <p class="muted small">Revisões que já venceram (24 horas, 7 ou 30 dias após estudar). Quanto antes, menos você esquece.</p>
        <ul class="ea-passos">${b.revs.map((r, i) => { const a = S.ass[r.assunto_id]; return passo('rev|' + r.id, `${a.disciplina} — ${a.nome} (revisão de ${r.tipo})`, 5 * Math.max(1, base + (i < ex ? 1 : 0)), ` data-rev="${r.id}"`, ['flashcard', r.assunto_id]); }).join('')}</ul></div>`;
    }
    const titulo = b.papel === 'F' ? 'Fechamento · questões' : `${Plano.ROTULO[b.papel]} · ${esc(b.d.di.nome)}`;
    const primeiro = b.itens[0] && b.itens[0].info.a.id;
    const itens = b.itens.map((it) => {
      const i = it.info, a = i.a;
      const tag = `${EA_TIPO[i.tipo]}${i.tipo === 'fraco' ? ` · ${Math.round(i.acc * 100)}% de acerto` : ''}${i.reforco ? ' · reforço' : ''}`;
      return `<div class="ea-item"><div class="ea-ih"><strong>${b.papel === 'F' ? esc(i.di.nome) + ' — ' : ''}${esc(a.nome)}</strong><span class="badge${i.tipo === 'fraco' ? ' berr' : i.tipo === 'novo' ? ' bok' : ''}">${tag}</span></div>
        ${i.motivos && i.motivos.length ? `<p class="ea-why small">Por quê: ${esc(i.motivos.slice(0, 3).join(' · '))}</p>` : ''}<div class="ea-go"><button type="button" class="btn-blue btn-sm" data-estudar="${a.id}">ESTUDAR AGORA</button></div>
        <ul class="ea-passos">${it.passos.map((p) => passo(`${b.papel}|${a.id}|${p.tipo}`, p.titulo, p.min, (i.tipo === 'novo' && p === it.passos[0]) ? ` data-estudou="${a.id}"` : '', [p.tipo, a.id])).join('')}</ul></div>`;
    }).join('');
    return `<div class="ea-bloco ea-${b.papel}"><div class="ea-bh"><span class="ea-faixa">${faixa}</span><strong>${titulo}</strong><span class="badge">${b.min} min</span></div>
      <p class="muted small">${esc(b.motivo || '')}</p>${itens}
      ${primeiro ? `<div class="ea-bf"><button type="button" class="btn-ghost btn-sm" data-crono="${primeiro}">Cronometrar este bloco</button></div>` : ''}</div>`;
  }).join('');
  const resp = an.discs.reduce((n, d) => n + d.total, 0), ac = an.discs.reduce((n, d) => n + d.acertos, 0);
  const fracos = []; an.discs.forEach((d) => d.assuntos.forEach((x) => { if (x.tipo === 'fraco') fracos.push(x); }));
  fracos.sort((x, y) => x.acc - y.acc);
  const novos = an.discs.reduce((n, d) => n + d.novos, 0);
  const sit = resp ? `Seu acerto geral é de ${Math.round((ac / resp) * 100)}% em ${resp} questões · ${fracos.length} ponto(s) fraco(s) · ${novos} assunto(s) ainda não estudado(s).`
    : `Você ainda não respondeu questões, então o plano começa pelo que mais pesa na prova (${novos} assuntos ainda não estudados). Resolva as questões dos passos para o plano passar a focar nos seus erros.`;
  const foco = s.blocos.filter((b) => b.d).map((b) => b.d.di.nome).join(' + ');
  const maxG = Math.max(0.0001, ...an.discs.map((d) => d.ganho));
  const porGanho = an.discs.slice().sort((x, y) => y.ganho - x.ganho || y.peso - x.peso);
  $('eaContainer').innerHTML = `<div class="ea-box">
      <div class="ea-lbl">Plano de hoje · ${t} min</div>
      <div class="ea-sessao">${esc(foco || 'Revisão e questões')}</div>
      <p class="muted small">${esc(sit)}</p>
      <div class="ea-prog"><div class="pbar-bg"><div class="pbar" id="eaProg" style="width:0%"></div></div><span class="small bold" id="eaProgTxt"></span></div>
    </div>${blocos}
    <div class="card mt2"><div class="card-title">Por que este plano?</div>
      <p class="muted small mb2">Pontos a ganhar = peso da matéria na prova × quanto ainda falta dominar (assuntos não estudados e questões erradas). O plano começa pelo maior potencial de ganho${s.C ? '; a 3ª matéria, quando há tempo, é a de menor peso que ainda tem lacuna' : ''}.</p>
      ${porGanho.map((d) => `<div class="prow"><div class="plabel" title="${esc(d.di.nome)}">${esc(d.di.nome)}</div><div class="pbar-bg"><div class="pbar" style="width:${Math.round((d.ganho / maxG) * 100)}%;background:var(--accent)"></div></div><div class="ppct">${d.pct}% da prova</div></div>`).join('')}
      ${fracos.length ? `<div class="card-title mt2">Onde você mais erra</div>${fracos.slice(0, 5).map((x) => `<div class="prow link-row" onclick="showView('assunto','${x.a.id}')"><div class="plabel" title="${esc(x.a.nome)}">${esc(x.a.nome)}</div><div class="pbar-bg"><div class="pbar" style="width:${Math.round(x.acc * 100)}%;background:${corP(Math.round(x.acc * 100))}"></div></div><div class="ppct">${Math.round(x.acc * 100)}%</div></div>`).join('')}` : ''}
    </div>`;
  atualizarProgEA();
}
function atualizarProgEA() {
  const todos = $$('#eaContainer .ea-passo input[data-k]'); if (!todos.length || !$('eaProg')) return;
  const fe = todos.filter((c) => c.checked).length;
  $('eaProg').style.width = Math.round((fe / todos.length) * 100) + '%';
  $('eaProgTxt').textContent = fe === todos.length ? 'Plano de hoje concluído! Amanhã ele muda conforme seu desempenho.' : `${fe} de ${todos.length} passos`;
}
$('btnEA').addEventListener('click', gerarEA);
$('eaTempo').addEventListener('keydown', (e) => { if (e.key === 'Enter') gerarEA(); });
$('eaChips').addEventListener('click', (e) => { const b = e.target.closest('[data-min]'); if (b) { $('eaTempo').value = b.dataset.min; gerarEA(); } });
$('eaContainer').addEventListener('click', (e) => {
  const ab = e.target.closest('[data-abrir]'); if (ab) { abrirPasso(ab.dataset.abrir, ab.dataset.ass); return; }
  const cr = e.target.closest('[data-crono]'); if (cr) { estudarNoCronometro(cr.dataset.crono); return; }
  const ea = e.target.closest('[data-estudar]'); if (ea) showView('assunto', ea.dataset.estudar);
});
$('eaContainer').addEventListener('change', (e) => {
  const c = e.target.closest('input[data-k]'); if (!c) return;
  const f = eaFeitos(); if (c.checked) f[c.dataset.k] = 1; else delete f[c.dataset.k];
  lsSet(eaChaveDia(), JSON.stringify(f));
  c.closest('.ea-passo').classList.toggle('feito', c.checked);
  atualizarProgEA();
  if (c.checked && c.dataset.estudou) marcarEstudado(c.dataset.estudou);
  if (c.checked && c.dataset.rev) api('/revisoes/feita', { body: { id: c.dataset.rev } }).then(() => api('/revisoes?' + cq())).then((r) => badgeRev(r.total || 0)).catch(() => {});
});

/* ---------------- DISCIPLINAS (estrutura) ---------------- */
function renderMaterias() {
  const c = S.curso;
  $('matSub').textContent = c ? `${c.nome} · ${S.est.length} disciplinas · ${totalAssuntos()} assuntos · ${totalSub()} subassuntos` : '';
  if (!S.est.length) { $('matContainer').innerHTML = emp('Nenhuma disciplina cadastrada neste curso'); return; }
  $('matContainer').innerHTML = S.est.map((di, i) => `<div class="cob-mat${i === 0 ? ' exp' : ''}">
      <div class="cob-hdr" role="button" tabindex="0" aria-expanded="${i === 0}"><span class="cob-nome">${esc(di.nome)}</span>${di.questoes ? `<span class="badge">${di.questoes} questões</span>` : ''}<span class="badge">${di.assuntos.length} assuntos</span><span aria-hidden="true">▾</span></div>
      <div class="cob-temas">${di.assuntos.map((a) => `<div class="cob-tema-row link-row" data-ass="${a.id}"><span>${esc(a.nome)}</span>${a.subassuntos.length ? `<span class="badge">${a.subassuntos.length} subassuntos</span>` : ''}${totalConteudo(a) ? `<span class="badge bok">${totalConteudo(a)} materiais</span>` : `<span class="badge">${EM_PREPARO}</span>`}${S.dom[a.id] ? `<span class="badge">${NIVEIS[S.dom[a.id]]}</span>` : ''}</div>`).join('')}</div>
    </div>`).join('');
  $$('#matContainer .cob-hdr').forEach((h) => {
    const t = () => { h.parentElement.classList.toggle('exp'); h.setAttribute('aria-expanded', h.parentElement.classList.contains('exp')); };
    h.addEventListener('click', t); h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } });
  });
  $$('#matContainer [data-ass]').forEach((r) => r.addEventListener('click', () => showView('assunto', r.dataset.ass)));
}

/* ---------------- ASSUNTO ---------------- */
const NIVEIS = ['Não estudei', 'Iniciante', 'Intermediário', 'Avançado', 'Dominado'];
let ASS_ATUAL = null, notaTimer = null;
async function renderAssunto(id) {
  const a = S.ass[id]; if (!a) { showView('materias'); return; }
  ASS_ATUAL = id;
  $('uiPageTitle').textContent = a.nome;
  $('assCrumb').innerHTML = `<a data-go="materias">${esc(S.curso.nome)}</a> › <a data-go="materias">${esc(a.disciplina)}</a>`;
  $('assTitulo').textContent = a.nome;
  $('assSub').textContent = `${a.subassuntos.length} subassuntos · ${totalConteudo(a)} materiais publicados`;
  $('assSubs').innerHTML = a.subassuntos.length ? `<ul class="sub-list">${a.subassuntos.map((s) => `<li>${esc(s.nome)}</li>`).join('')}</ul>` : '<p class="muted small">O edital não detalha subassuntos para este assunto.</p>';
  $('assConteudo').innerHTML = SLOTS.map(([k, n]) => { const q = (a.conteudo || {})[k] || 0; return `<button type="button" class="slot${q ? ' tem' : ''}" data-slot="${k}"><strong>${n}</strong><small>${q ? q + ' publicado(s)' : EM_PREPARO}</small></button>`; }).join('');
  $$('#assConteudo [data-slot]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.slot;
    if (k === 'questoes') { showView('questoes'); selecionar(CASCATAS[0], a.disciplina_id, id); buscarQuestoes(); }
    else { showView('m-' + k); selecionar(CASCATAS[1], a.disciplina_id, id); renderMaterial(k); }
  }));
  renderDomBtns($('assDominio'), id);
  $('assNota').value = ''; $('assNotaMsg').textContent = 'Carregando...';
  try { const n = (await api('/notas?assunto_id=' + id)).nota; if (ASS_ATUAL === id) { $('assNota').value = n ? n.texto : ''; $('assNotaMsg').textContent = n ? 'Salvo em ' + new Date(n.atualizado_em).toLocaleString('pt-BR') : ''; } } catch (e) { $('assNotaMsg').textContent = ''; }
}
$('assNota').addEventListener('input', () => {
  clearTimeout(notaTimer); $('assNotaMsg').textContent = 'Digitando...';
  const id = ASS_ATUAL, txt = $('assNota').value;
  notaTimer = setTimeout(() => api('/notas', { body: { assunto_id: id, texto: txt } }).then(() => { $('assNotaMsg').textContent = 'Salvo'; }).catch((e) => { $('assNotaMsg').textContent = e.message; }), 900);
});
$('assEstudar').addEventListener('click', () => estudarNoCronometro(ASS_ATUAL));
function estudarNoCronometro(id) { const a = S.ass[id]; showView('cronometro'); if (a) selecionar(CASCATAS[3], a.disciplina_id, id); }
function renderDomBtns(box, id) {
  box.innerHTML = NIVEIS.map((n, i) => `<button type="button" class="dom-btn d${Math.min(2, Math.floor(i / 2))}" aria-pressed="${(S.dom[id] || 0) === i}" data-n="${i}">${n}</button>`).join('');
  $$('.dom-btn', box).forEach((b) => b.addEventListener('click', async () => {
    S.dom[id] = +b.dataset.n; renderDomBtns(box, id);
    try { await api('/dominio', { body: { assunto_id: id, nivel: +b.dataset.n } }); } catch (e) { alert(e.message); }
  }));
}

/* ---------------- BUSCA ---------------- */
let buscaTimer = null;
$('buscaInp').addEventListener('input', () => { clearTimeout(buscaTimer); buscaTimer = setTimeout(buscar, 250); });
async function buscar() {
  const q = $('buscaInp').value.trim(), box = $('buscaRes');
  if (q.length < 2) { box.innerHTML = emp('Digite ao menos 2 letras'); return; }
  box.innerHTML = ld('Buscando...');
  try {
    const r = (await api('/busca?' + cq() + '&q=' + encodeURIComponent(q))).resultados;
    box.innerHTML = r.length ? `<div class="card">${r.map((x) => `<div class="cob-tema-row link-row" ${x.assunto_id ? `data-ass="${x.assunto_id}"` : `data-disc="${x.disciplina_id}"`}><span><strong>${esc(x.subassunto || x.assunto || x.disciplina)}</strong></span><span class="badge">${x.nivel}</span><span class="muted small">${esc([x.disciplina, x.subassunto ? x.assunto : ''].filter(Boolean).join(' › '))}</span></div>`).join('')}</div>` : emp('Nada encontrado no edital deste curso');
    $$('#buscaRes [data-ass]').forEach((el) => el.addEventListener('click', () => showView('assunto', el.dataset.ass)));
    $$('#buscaRes [data-disc]').forEach((el) => el.addEventListener('click', () => showView('materias')));
  } catch (e) { box.innerHTML = emp(e.message); }
}

/* ---------------- MATERIAIS (PDF, aulas, lei seca, jurisprudência, mapas, flashcards) ---------------- */
async function renderMaterial(tipo) {
  const t = TIPOS[tipo]; if (!t) return;
  $('matlTitulo').textContent = t.nome; $('matlSub').textContent = t.sub;
  const box = $('matlLista'); box.innerHTML = ld('Carregando...');
  const seq = (S.matSeq = (S.matSeq || 0) + 1);
  try {
    // Sem disciplina escolhida, busca por disciplina (a API devolve no máximo 200 itens por consulta).
    const itens = $(CASCATAS[1].d).value ? (await api('/materiais?tipo=' + tipo + '&' + filtroQS(CASCATAS[1]))).materiais
      : (await Promise.all(S.est.map((d) => api('/materiais?tipo=' + tipo + '&' + cq() + '&disciplina_id=' + d.id)))).flatMap((r) => r.materiais);
    if (seq !== S.matSeq) return; // outra tela de material foi aberta enquanto esta carregava
    if (!itens.length) { box.innerHTML = emp(EM_PREPARO, EM_PREPARO_SUB); return; }
    if (tipo === 'flashcard') {
      box.innerHTML = `<div class="res-grid" id="fcGrid">${itens.map((f) => `<div class="fccard" tabindex="0"><span class="badge">${esc(S.ass[f.assunto_id]?.nome || '')}</span><div class="fcfront">${esc(f.conteudo.pergunta || f.titulo)}</div><div class="fcback">${esc(f.conteudo.resposta || '')}</div></div>`).join('')}</div>`;
      $$('#fcGrid .fccard').forEach((c) => c.addEventListener('click', () => c.classList.toggle('flip')));
      return;
    }
    const aberto = !!$('matlAss').value;
    box.innerHTML = itens.map((m) => { const a = S.ass[m.assunto_id]; return `<details class="card mat-item"${aberto ? ' open' : ''}><summary><span class="card-title">${esc(m.titulo)}</span><span class="muted small">${esc(a ? a.disciplina + ' › ' + a.nome : '')}</span>${selo(m)}</summary><div class="mat-corpo">${tipo === 'aula' ? `<div class="vid-box" data-ass="${m.assunto_id}" data-mat="${m.id}"></div>` : ''}${corpoMaterial(m)}</div></details>`; }).join('');
    if (tipo === 'aula') {
      for (const k in VID_CACHE) delete VID_CACHE[k];
      $$('#matlLista details.mat-item').forEach((d) => { const vb = $$('.vid-box', d)[0]; const go = () => { if (vb.dataset.ok) return; vb.dataset.ok = '1'; carregarVideos(vb); }; if (d.open) go(); d.addEventListener('toggle', () => { if (d.open) go(); }); });
    }
  } catch (e) { if (seq === S.matSeq) box.innerHTML = emp(e.message); }
}

const selo = (m) => (m.compartilhado ? '<span class="badge badge-share" title="Este material é o mesmo nos dois cursos">Material compartilhado PM-SP + GCM</span>' : '');
const VID_CACHE = {};
async function carregarVideos(box) {
  const aid = box.dataset.ass;
  // o mesmo vídeo aparece só na primeira aula do assunto, para não repetir
  if (VID_CACHE[aid] && VID_CACHE[aid] !== box.dataset.mat) return;
  box.innerHTML = '';
  try {
    const vs = (await api('/videos?assunto_id=' + aid)).videos;
    if (!vs.length) return;
    VID_CACHE[aid] = box.dataset.mat;
    box.innerHTML = vs.map((v) => `<div class="vid-item"><div class="vid-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.video_id)}" title="${esc(v.titulo)}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><div class="vid-tit small"><strong>${esc(v.titulo)}</strong>${v.canal ? ' · <span class="muted">' + esc(v.canal) + '</span>' : ''}<a class="btn-ghost btn-sm" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.video_id)}" target="_blank" rel="noopener noreferrer">Abrir no YouTube</a></div></div>`).join('');
  } catch (e) { /* sem vídeo: a aula em texto continua */ }
}
/* Corpo de cada tipo de material. Texto vem do banco: sempre escapado. */
function textoFmt(t) {
  const linhas = String(t || '').split('\n'); let h = '', lista = [];
  const fecha = () => { if (lista.length) { h += '<ul class="mat-lista">' + lista.map((l) => `<li>${esc(l)}</li>`).join('') + '</ul>'; lista = []; } };
  linhas.forEach((l) => { const x = l.trim(); if (/^[•\-–]\s+/.test(x)) lista.push(x.replace(/^[•\-–]\s+/, '')); else { fecha(); if (x) h += `<p>${esc(x)}</p>`; } });
  fecha(); return h;
}
function corpoMaterial(m) {
  const c = m.conteudo || {};
  const fonte = m.fonte_oficial ? `<p class="mt1"><a class="btn-ghost btn-sm" href="${esc(m.fonte_oficial)}" target="_blank" rel="noopener">Fonte oficial</a></p>` : '';
  if (m.tipo === 'aula') return (c.secoes || []).map((sec) => `<h3 class="mat-h">${esc(sec.titulo)}</h3>${textoFmt(sec.texto)}`).join('') || textoFmt(c.texto);
  if (m.tipo === 'revisao') return `<ul class="mat-lista mat-bizus">${(c.pontos || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
  if (m.tipo === 'mapa_mental') return `<p class="small" style="margin:0 0 8px"><strong>${esc(c.no_central || m.titulo)}</strong></p><ul class="mapa-ul">${(c.ramos || []).map((r) => `<li><strong>${esc(r.label)}</strong>${(r.filhos || []).length ? `<ul class="mapa-ul">${r.filhos.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>`;
  if (m.tipo === 'lei_seca') return `${c.lei ? `<div class="badge">${esc(c.lei)}${c.artigo ? ' · ' + esc(c.artigo) : ''}</div>` : ''}<div class="scrl mt1">${esc(c.texto || '')}</div>${c.observacao ? `<p class="muted small mt1">${esc(c.observacao)}</p>` : ''}${fonte}`;
  if (m.tipo === 'jurisprudencia') return `<div class="juris-trib">${esc([c.tribunal, c.referencia].filter(Boolean).join(' · '))}</div><div class="juris-tese">${esc(c.enunciado || '')}</div>${fonte}`;
  return textoFmt(c.texto) + (m.url ? `<p class="mt1"><a class="btn-blue btn-sm" href="${esc(m.url)}" target="_blank" rel="noopener">Abrir</a></p>` : '') + fonte;
}

/* ---------------- MEU RESUMO ---------------- */
async function renderMeuResumo() {
  abrirResumo();
  const box = $('mrLista'); box.innerHTML = ld();
  try {
    const ns = (await api('/notas')).notas.filter((n) => S.ass[n.assunto_id] && n.texto.trim());
    box.innerHTML = ns.length ? ns.map((n) => `<div class="cob-tema-row link-row" data-ass="${n.assunto_id}"><span><strong>${esc(S.ass[n.assunto_id].nome)}</strong><br><span class="muted small">${esc(n.texto)}</span></span><span class="badge">${esc(S.ass[n.assunto_id].disciplina)}</span></div>`).join('') : emp('Você ainda não escreveu resumos neste curso');
    $$('#mrLista [data-ass]').forEach((el) => el.addEventListener('click', () => { const a = S.ass[el.dataset.ass]; selecionar(CASCATAS[2], a.disciplina_id, a.id); abrirResumo(); }));
  } catch (e) { box.innerHTML = emp(e.message); }
}
async function abrirResumo() {
  const id = $('mrAss').value;
  $('mrEditor').classList.toggle('hidden', !id); $('mrMsg').textContent = '';
  if (!id) return;
  $('mrTexto').value = '';
  try { const n = (await api('/notas?assunto_id=' + id)).nota; $('mrTexto').value = n ? n.texto : ''; } catch (e) {}
}
$('btnMrSalvar').addEventListener('click', async () => {
  try { await api('/notas', { body: { assunto_id: $('mrAss').value, texto: $('mrTexto').value } }); $('mrMsg').textContent = 'Salvo'; renderMeuResumo(); } catch (e) { $('mrMsg').textContent = e.message; }
});

/* ---------------- QUESTÕES ---------------- */
let QF = null;
const subNome = (q) => { const as = S.ass[q.assunto_id]; const s = as && q.subassunto_id ? as.subassuntos.find((x) => x.id === q.subassunto_id) : null; return s ? s.nome : ''; };
async function renderQuestoes() {
  $('qContainer').innerHTML = emp('Escolha os filtros e clique em Buscar questões, ou use GERAR TREINO');
  $('qInfo').textContent = ''; $('trDesc').textContent = '';
  try { QF = await api('/questoes/filtros?' + cq()); } catch (e) { QF = null; }
  const op = (m, vazio, ord) => `<option value="">${vazio}</option>` + Object.keys(m || {}).sort(ord).map((k) => `<option value="${esc(k)}">${esc(k)} (${m[k]})</option>`).join('');
  const sel = (id, html) => { const v = $(id).value; $(id).innerHTML = html; if ([...$(id).options].some((o) => o.value === v)) $(id).value = v; };
  sel('qBanca', op(QF && QF.bancas, 'Todas as bancas')); sel('qCargo', op(QF && QF.cargos, 'Todos os cargos'));
  sel('qAno', op(QF && QF.anos, 'Todos os anos', (x, y) => y - x)); sel('qNivel', op(QF && QF.niveis, 'Todos os níveis'));
}
function paramsQ() {
  const p = [filtroQS(CASCATAS[0])];
  [['qBanca', 'banca'], ['qCargo', 'cargo'], ['qAno', 'ano'], ['qNivel', 'nivel'], ['qOrigem', 'tipo'], ['qEstado', 'estado'], ['qDif', 'dificuldade'], ['qCompat', 'compat']].forEach(([id, k]) => { if ($(id).value) p.push(k + '=' + encodeURIComponent($(id).value)); });
  const b = $('qBusca').value.trim(); if (b.length >= 3) p.push('q=' + encodeURIComponent(b));
  return p;
}
$('btnQ').addEventListener('click', buscarQuestoes);
async function buscarQuestoes() {
  const box = $('qContainer'); box.innerHTML = ld('Buscando...'); $('trDesc').textContent = '';
  try {
    const r = await api('/questoes?limit=' + $('qQtd').value + '&' + paramsQ().join('&'));
    $('qInfo').textContent = `${r.candidatas} questão(ões) disponíveis com estes filtros · exibindo ${r.questoes.length} · banca-alvo do curso: ${r.banca_alvo || '—'}`;
    box.innerHTML = r.questoes.length ? r.questoes.map(qCard).join('') : emp('Nenhuma questão publicada para este filtro', 'Tente remover algum filtro ou use “Todos os níveis”.');
    ligarQuestoes(box);
  } catch (e) { box.innerHTML = emp(e.message); }
}
$('btnTreino').addEventListener('click', async () => {
  const box = $('qContainer'); box.innerHTML = ld('Montando seu treino...'); $('trDesc').textContent = '';
  try {
    const r = await api('/treino?modo=' + $('trModo').value + '&qtd=' + $('trQtd').value + '&' + [filtroQS(CASCATAS[0]), ...(($('qCompat').value ? ['compat=' + $('qCompat').value] : []))].join('&'));
    $('trDesc').textContent = r.descricao + (r.aviso ? ' — ' + r.aviso : '');
    $('qInfo').textContent = `Treino com ${r.questoes.length} questões (de ${r.candidatas} candidatas) · banca-alvo: ${r.banca_alvo || '—'}`;
    box.innerHTML = r.questoes.length ? r.questoes.map(qCard).join('') : emp('Nenhuma questão disponível para este objetivo', 'Tente outro objetivo de treino.');
    ligarQuestoes(box);
  } catch (e) { box.innerHTML = emp(e.message); }
});
function qCard(q) {
  const a = S.ass[q.assunto_id], real = q.tipo === 'real', sub = subNome(q);
  const i = (q.enunciado || '').lastIndexOf('\n\n— — —\n');
  const apoio = i >= 0 ? q.enunciado.slice(0, i) : '', enun = i >= 0 ? q.enunciado.slice(i + 8) : q.enunciado;
  const badges = [
    `<span class="badge ${real ? 'q-real' : 'q-aut'}">${real ? '🟦 QUESTÃO REAL' : '🟨 QUESTÃO AUTORAL'}</span>`,
    a ? `<span class="badge">${esc(a.disciplina)}</span><span class="badge">${esc(a.nome)}</span>` : '',
    sub ? `<span class="badge">${esc(sub)}</span>` : '',
    real ? `<span class="badge">${esc(q.banca_ref || q.banca || '')}${q.ano ? ' · ' + q.ano : ''}</span>` : `<span class="badge">Banca de referência: ${esc(q.banca_ref || '—')}</span>`,
    q.banca_alvo === false && q.banca_ref ? '<span class="badge berr">Outra banca (não é a banca-alvo)</span>' : '',
    q.nivel ? `<span class="badge">Nível ${esc(q.nivel)}${q.nivel_compat && q.nivel_compat !== 'Compatível' ? ' · ' + esc(q.nivel_compat) + ' do cargo' : ''}</span>` : '',
    q.dificuldade ? `<span class="badge">${({ facil: 'Fácil', media: 'Média', dificil: 'Difícil' })[q.dificuldade] || ''}</span>` : '',
    q.ultima === true ? '<span class="badge bok">Já acertei</span>' : q.ultima === false ? '<span class="badge berr">Já errei</span>' : '',
  ].join('');
  const origem = [q.origem, real && q.concurso ? q.concurso : '', real && q.numero_questao ? 'questão ' + q.numero_questao : ''].filter(Boolean).join(' · ');
  return `<div class="qcard" data-q="${q.id}"><div class="qmeta">${badges}</div>
    ${apoio ? `<div class="q-apoio">${esc(apoio)}</div>` : ''}<div class="qenunciado">${esc(enun)}</div>
    <div class="opcoes-w">${(q.opcoes || []).map((o, k) => `<button type="button" class="opcao" data-i="${k}"><span class="letra">${String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></button>`).join('')}</div>
    <div class="gab-box hidden"></div>${origem ? `<div class="q-origem muted small">Origem: ${esc(origem)}</div>` : ''}
    <button type="button" class="btn-ghost btn-sm btn-salvar">${q.salva ? 'Remover dos salvos' : 'Salvar questão'}</button></div>`;
}
function ligarQuestoes(box) {
  $$('.qcard', box).forEach((card) => {
    $$('.opcao', card).forEach((b) => b.addEventListener('click', async () => {
      $$('.opcao', card).forEach((x) => { x.disabled = true; });
      try {
        const r = await api('/responder', { body: { questao_id: card.dataset.q, resposta: +b.dataset.i } });
        $$('.opcao', card)[r.gabarito].classList.add('certa'); if (!r.correta) b.classList.add('errada');
        const g = $$('.gab-box', card)[0];
        const ex = [r.lei_relacionada ? `Lei relacionada: ${esc(r.lei_relacionada)}` : '', r.juris_relacionada ? `Jurisprudência: ${esc(r.juris_relacionada)}` : '', r.legislacao_considerada ? `Legislação considerada: ${esc(r.legislacao_considerada)}` : ''].filter(Boolean);
        g.innerHTML = `<div class="gab-title">${r.correta ? 'Você acertou!' : 'Você errou.'} Gabarito: ${String.fromCharCode(65 + r.gabarito)}</div>${r.comentario ? `<div>${esc(r.comentario)}</div>` : '<div class="muted small">Esta questão não tem comentário detalhado.</div>'}${ex.length ? `<div class="muted small mt1">${ex.join(' · ')}</div>` : ''}${r.fonte ? `<div class="muted small mt1">Fonte: ${esc(r.fonte)}</div>` : ''}`;
        g.classList.remove('hidden');
      } catch (e) { alert(e.message); $$('.opcao', card).forEach((x) => { x.disabled = false; }); }
    }));
    const sv = $$('.btn-salvar', card)[0];
    sv.addEventListener('click', () => { const rem = sv.textContent.startsWith('Remover'); api('/questoes/salvar', { body: { questao_id: card.dataset.q, salvar: rem ? false : true } }).then(() => { sv.textContent = rem ? 'Salvar questão' : 'Remover dos salvos'; }).catch((er) => alert(er.message)); });
  });
}
async function renderSalvas() {
  const box = $('salvasLista'); box.innerHTML = ld();
  try { const qs = (await api('/questoes/salvas')).questoes; box.innerHTML = qs.length ? qs.map(qCard).join('') : emp('Nenhuma questão salva'); ligarQuestoes(box); } catch (e) { box.innerHTML = emp(e.message); }
}

/* ---------------- CHAT X (mentor) ---------------- */
const CHAT = { hist: [], curso: null, ocupado: false };
const CHAT_SUG = ['O que estudar hoje?', 'Tenho 2 horas hoje', 'Qual minha matéria mais fraca?', 'Onde mais erro?', 'Minha revisão de amanhã', 'Como está minha evolução?', 'Montar meu cronograma'];
function chatAdd(papel, texto, acoes) {
  const log = $('chatLog'); const d = document.createElement('div'); d.className = 'chat-msg ' + (papel === 'user' ? 'eu' : 'x'); d.textContent = texto;
  if (acoes && acoes.length) {
    const w = document.createElement('div'); w.className = 'chat-acoes';
    const extra = []; const est = acoes.find((x) => x.tipo === 'estudar' && x.assunto_id);
    if (est && !acoes.some((x) => x.tipo === 'lei')) extra.push({ tipo: 'lei', rotulo: 'ABRIR LEI SECA', assunto_id: est.assunto_id });
    if (est && !acoes.some((x) => x.tipo === 'aula')) extra.push({ tipo: 'aula', rotulo: 'ABRIR AULA', assunto_id: est.assunto_id });
    [...acoes, ...extra].forEach((ac) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-ghost btn-sm'; b.textContent = ac.rotulo; b.addEventListener('click', () => chatAcao(ac)); w.appendChild(b); });
    d.appendChild(w);
  }
  log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
}
async function chatAcao(ac) {
  const id = ac.assunto_id;
  if (['estudar', 'aula', 'flashcards', 'lei'].includes(ac.tipo) && (!id || !S.ass[id])) { chatAdd('x', 'Esse assunto não pertence ao curso atual. Abra a lista de disciplinas para escolher.'); return showView('materias'); }
  if (ac.tipo === 'estudar') return showView('assunto', id);
  if (ac.tipo === 'aula') return abrirPasso('aula', id);
  if (ac.tipo === 'flashcards') return abrirPasso('flashcard', id);
  if (ac.tipo === 'lei') return abrirPasso('lei_seca', id);
  if (ac.tipo === 'revisar') return showView('revisoes');
  if (ac.tipo === 'simulado') return showView('simulados');
  if (ac.tipo === 'treino') { showView('questoes'); if ($('trModo').querySelector(`option[value="${ac.modo}"]`)) $('trModo').value = ac.modo; if (ac.qtd) $('trQtd').value = String(ac.qtd); return $('btnTreino').click(); }
  if (ac.tipo === 'plano') { showView('estudar'); $('eaTempo').value = Math.max(20, Math.min(600, ac.minutos || 90)); return gerarEA(); }
  if (ac.tipo === 'cronograma') { showView('cronograma'); await carregarCronograma(); $('cronoH').value = Math.max(1, Math.min(14, Math.round((ac.minutos || 120) / 60 * 2) / 2)); return $('btnCrono').click(); }
  showView('materias');
}
async function chatEnviar(txt) {
  txt = (txt || '').trim(); if (!txt || CHAT.ocupado) return;
  CHAT.ocupado = true; $('chatSend').disabled = true; $('chatInp').value = '';
  chatAdd('user', txt); const esp = chatAdd('x', 'Analisando seus dados...');
  try {
    const r = await api('/chatx', { body: { curso_id: S.curso.id, mensagem: txt, historico: CHAT.hist.slice(-6) } });
    esp.remove(); chatAdd('x', r.texto, r.acoes);
    CHAT.hist.push({ role: 'user', content: txt }, { role: 'assistant', content: r.texto });
  } catch (e) { esp.textContent = e.message || 'Não consegui responder agora.'; }
  CHAT.ocupado = false; $('chatSend').disabled = false; $('chatInp').focus();
}
function renderChatX() {
  if (CHAT.curso !== S.curso.id) { CHAT.curso = S.curso.id; CHAT.hist = []; $('chatLog').innerHTML = ''; chatAdd('x', `Olá! Sou o Chat X, seu mentor no ${S.curso.nome}. Posso dizer o que estudar hoje, onde você mais erra, sua matéria mais fraca, suas revisões e montar seu plano ou cronograma — sempre com os seus dados reais. Como posso ajudar?`); }
  $('chatSug').innerHTML = CHAT_SUG.map((s) => `<button type="button" class="btn-ghost btn-sm">${esc(s)}</button>`).join('');
  $$('#chatSug button').forEach((b) => b.addEventListener('click', () => chatEnviar(b.textContent)));
}
$('chatForm').addEventListener('submit', (e) => { e.preventDefault(); chatEnviar($('chatInp').value); });

/* ---------------- SIMULADOS (acervo por link do Drive) ---------------- */
const driveId = (u) => { const m = /\/d\/([^/?#]+)/.exec(u || '') || /[?&]id=([^&]+)/.exec(u || ''); return m ? m[1] : null; };
const driveView = (u) => { const id = driveId(u); return id ? `https://drive.google.com/file/d/${id}/view` : u; };
const driveDl = (u) => { const id = driveId(u); return id ? `https://drive.google.com/uc?export=download&id=${id}` : u; };
const lnk = (href, txt, cls) => `<a class="btn-ghost btn-sm ${cls || ''}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
function simCard(s, rs) {
  const igual = s.gabaritoUrl && s.gabaritoUrl === s.comentarioUrl;
  const acoes = [
    s.provaUrl ? lnk(driveView(s.provaUrl), 'Ver prova online') + lnk(driveDl(s.provaUrl), 'Baixar prova') : '<span class="muted small">Prova ainda não disponível</span>',
    s.gabaritoUrl ? lnk(driveView(s.gabaritoUrl), igual ? 'Gabarito comentado' : 'Gabarito') : '',
    s.comentarioUrl && !igual ? lnk(driveView(s.comentarioUrl), 'Gabarito comentado') : '',
  ].join('');
  const ult = rs[0] ? `<div class="small mt1">Último resultado: <strong>${rs[0].acertos}/${rs[0].total}</strong> (${Math.round(rs[0].acertos / rs[0].total * 100)}%) em ${new Date(rs[0].criado_em).toLocaleDateString('pt-BR')}${rs.length > 1 ? ` · ${rs.length} tentativas` : ''}</div>` : '';
  return `<div class="card sim-card" data-sim="${s.id}"><div class="card-title">${esc(s.titulo)}</div>
    <div class="qmeta">${s.tipo ? `<span class="badge ${/real/i.test(s.tipo) ? 'q-real' : 'q-aut'}">${esc(s.tipo)}</span>` : ''}${s.numero ? `<span class="badge">Nº ${s.numero}</span>` : ''}${s.data ? `<span class="badge">${new Date(s.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>` : ''}${s.banca ? `<span class="badge">${esc(s.banca)}</span>` : ''}${s.ano ? `<span class="badge">${esc(s.ano)}</span>` : ''}${s.cargo ? `<span class="badge">${esc(s.cargo)}</span>` : ''}</div>
    ${s.descricao ? `<p class="muted small">${esc(s.descricao)}</p>` : ''}<div class="sim-acoes">${acoes}</div>${ult}
    <details class="sim-reg"><summary>Registrar meu resultado</summary><div class="filters mt1"><div class="fgroup"><label>Acertos</label><input type="number" min="0" max="300" class="sr-ac"></div><div class="fgroup"><label>Total de questões</label><input type="number" min="1" max="300" value="60" class="sr-tt"></div><div class="fgroup"><label>Tempo (min, opcional)</label><input type="number" min="0" max="600" class="sr-tm"></div><button type="button" class="btn-blue btn-sm sr-ok">Registrar</button></div><div class="muted small sr-msg" role="status"></div></details></div>`;
}
let SIM_CAT = 'prova_real';
$$('#simTabs .tab').forEach((t) => t.addEventListener('click', () => { SIM_CAT = t.dataset.st; renderSimulados(); }));
async function renderSimulados() {
  const box = $('simLista'); box.innerHTML = ld();
  $$('#simTabs .tab').forEach((x) => x.classList.toggle('on', x.dataset.st === SIM_CAT));
  $('simTabInfo').textContent = SIM_CAT === 'prova_real' ? 'Provas oficiais de concursos anteriores, em ordem cronológica.' : 'Simulados exclusivos do Bizu: cada um tem seu próprio conjunto de questões, sem repetição entre eles nem com as provas reais.';
  try {
    const dAll = await api('/simulados-drive?' + cq()); const d = { ...dAll, simulados: dAll.simulados.filter((s) => (s.categoria || 'prova_real') === SIM_CAT).sort((x, y) => (x.numero || 0) - (y.numero || 0)) }; const por = {}; d.resultados.forEach((r) => { (por[r.simulado_id] = por[r.simulado_id] || []).push(r); });
    box.innerHTML = d.simulados.length ? `<div class="sim-grid">${d.simulados.map((s) => simCard(s, por[s.id] || [])).join('')}</div>` : emp(SIM_CAT === 'prova_real' ? 'Nenhuma prova real publicada para este curso ainda' : 'Os simulados deste curso serão publicados em breve', 'O administrador publica por aqui assim que estiverem prontos.');
    $$('.sim-card', box).forEach((c) => $$('.sr-ok', c)[0].addEventListener('click', async () => {
      const ac = parseInt($$('.sr-ac', c)[0].value, 10), tt = parseInt($$('.sr-tt', c)[0].value, 10), msg = $$('.sr-msg', c)[0];
      if (!(ac >= 0) || !(tt >= 1) || ac > tt) { msg.textContent = 'Informe acertos e total válidos.'; return; }
      try { await api('/simulados-drive/resultado', { body: { simulado_id: c.dataset.sim, acertos: ac, total: tt, tempo_min: parseInt($$('.sr-tm', c)[0].value, 10) || null } }); renderSimulados(); } catch (e) { msg.textContent = e.message; }
    }));
    const nome = {}; d.simulados.forEach((s) => { nome[s.id] = s.titulo; });
    $('simHist').innerHTML = d.resultados.length ? d.resultados.map((h) => `<div class="cob-tema-row"><span>${esc(nome[h.simulado_id] || 'Simulado')} · ${new Date(h.criado_em).toLocaleString('pt-BR')}</span><span><span class="badge">${h.acertos}/${h.total} · ${Math.round(h.acertos / h.total * 100)}%</span> <button type="button" class="btn-ghost btn-sm" data-delres="${h.id}">Excluir</button></span></div>`).join('') : emp('Nenhum simulado registrado ainda');
    $$('#simHist [data-delres]').forEach((b) => b.addEventListener('click', async () => { if (confirm('Excluir este resultado?')) { await api('/simulados-drive/resultado/excluir', { body: { id: b.dataset.delres } }).catch((e) => alert(e.message)); renderSimulados(); } }));
  } catch (e) { box.innerHTML = emp(e.message); }
}

/* ---------------- REVISÕES ---------------- */
function revCard(r) {
  const cor = r.vencida ? 'var(--err)' : r.hoje ? 'var(--warn)' : 'var(--info)';
  const lbl = r.vencida ? 'Vencida' : r.hoje ? 'Hoje' : nomeDia(r.vence_em, { day: '2-digit', month: '2-digit' });
  return `<div class="rev-card"><div class="rev-dot" style="background:${cor}"></div><div class="rev-info"><div class="rev-tema">${esc(r.assunto)}</div><div class="rev-meta">${esc(r.disciplina)} — revisão de ${r.tipo === '24h' ? '24 horas' : r.tipo === '7dias' ? '7 dias' : '30 dias'} · ${lbl}</div></div>
    <div class="rev-actions"><button type="button" class="btn-blue btn-sm" onclick="showView('assunto','${r.assunto_id}')">Revisar</button><button type="button" class="btn-ghost btn-sm" onclick="revFeita('${r.id}')">Feita</button></div></div>`;
}
async function renderRevisoes() {
  const box = $('revLista'); box.innerHTML = ld();
  try { const r = await api('/revisoes?' + cq()); badgeRev(r.total); box.innerHTML = r.revisoes.length ? r.revisoes.map(revCard).join('') : emp('Nenhuma revisão pendente', 'As revisões são criadas automaticamente quando você resolve questões de um assunto.'); } catch (e) { box.innerHTML = emp(e.message); }
}
window.revFeita = async (id) => { try { await api('/revisoes/feita', { body: { id } }); } catch (e) {} if (S.view === 'painel') renderPainel(); else renderRevisoes(); };

/* ---------------- REDAÇÃO ---------------- */
let RED = { id: null, tema_id: null };
function renderRedacao() {
  const c = S.curso;
  $('redSub').textContent = `${c.nome} — escreva, guarde e acompanhe suas redações`;
  $('redFormato').innerHTML = `<div class="card-title">Formato cobrado</div><p class="small">${esc(c.redacao_formato || 'Consulte o edital.')}</p>`;
  contarRed();
}
$$('#redTabs .tab').forEach((t) => t.addEventListener('click', () => {
  $$('#redTabs .tab').forEach((x) => x.classList.toggle('on', x === t));
  $$('#v-redacao [data-rp]').forEach((p) => p.classList.toggle('hidden', p.dataset.rp !== t.dataset.rt));
  if (t.dataset.rt === 'temas') carregarTemasRed(); if (t.dataset.rt === 'minhas') carregarMinhasRed();
}));
function abaRed(n) { $$('#redTabs .tab').find((t) => t.dataset.rt === n).click(); }
function contarRed() {
  const t = $('redTexto').value; const pal = (t.match(/\S+/g) || []).length;
  const linhas = t.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 75)), 0) * (t ? 1 : 0);
  $('redContagem').innerHTML = `<span>${pal} palavras</span><span>≈ ${linhas} linhas manuscritas (estimativa de 75 caracteres por linha)</span>`;
}
$('redTexto').addEventListener('input', contarRed);
async function salvarRed(status) {
  try {
    const r = await api('/redacoes/salvar', { body: { id: RED.id, curso_id: S.curso.id, tema_id: RED.tema_id, tema_livre: $('redTema').value, titulo: $('redTituloInp').value, texto: $('redTexto').value, status } });
    RED.id = r.id; $('redMsg').textContent = status === 'finalizada' ? 'Redação finalizada e guardada em Minhas redações.' : 'Rascunho salvo.';
  } catch (e) { $('redMsg').textContent = e.message; }
}
$('btnRedRasc').addEventListener('click', () => salvarRed('rascunho'));
$('btnRedFinal').addEventListener('click', () => { if (!$('redTexto').value.trim()) { $('redMsg').textContent = 'Escreva o texto antes de finalizar.'; return; } salvarRed('finalizada'); });
$('btnRedNova').addEventListener('click', () => { RED = { id: null, tema_id: null }; $('redTema').value = ''; $('redTituloInp').value = ''; $('redTexto').value = ''; $('redMsg').textContent = ''; contarRed(); });
async function carregarTemasRed() {
  const box = $('redTemasLista'); box.innerHTML = ld();
  try {
    const ts = (await api('/redacao/temas?' + cq())).temas;
    box.innerHTML = ts.length ? ts.map((t) => `<div class="card"><div class="card-title">${esc(t.titulo)}</div>${(t.textos_apoio || []).map((x, i) => `<div class="red-apoio"><div class="muted small">Texto ${i + 1}${x.fonte ? ' — ' + esc(x.fonte) : ''}</div>${textoFmt(x.texto || x)}</div>`).join('')}<p class="small red-proposta" style="white-space:pre-wrap">${esc(t.proposta)}</p><button type="button" class="btn-blue btn-sm mt1" data-tema="${t.id}" data-titulo="${esc(t.titulo)}">Escrever sobre este tema</button></div>`).join('') : emp('Nenhum tema de redação publicado ainda', 'Enquanto isso, você pode escrever sobre um tema de sua escolha na aba Escrever.');
    $$('#redTemasLista [data-tema]').forEach((b) => b.addEventListener('click', () => { $('btnRedNova').click(); RED.tema_id = b.dataset.tema; $('redTema').value = b.dataset.titulo; abaRed('escrever'); }));
  } catch (e) { box.innerHTML = emp(e.message); }
}
async function carregarMinhasRed() {
  const box = $('redMinhas'); box.innerHTML = ld();
  try {
    const rs = (await api('/redacoes?' + cq())).redacoes; S.redacoes = rs;
    box.innerHTML = rs.length ? `<div class="card">${rs.map((r) => `<div class="cob-tema-row"><span><strong>${esc(r.titulo || r.tema_livre || 'Sem título')}</strong><br><span class="muted small">${new Date(r.atualizado_em).toLocaleString('pt-BR')} · ${(r.texto.match(/\S+/g) || []).length} palavras</span></span><span class="badge ${r.status === 'finalizada' ? 'bok' : ''}">${r.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}</span><button type="button" class="btn-ghost btn-sm" data-abrir="${r.id}">Abrir</button><button type="button" class="btn-ghost btn-sm" data-excluir="${r.id}">Excluir</button></div>`).join('')}</div>` : emp('Você ainda não escreveu redações neste curso');
    $$('#redMinhas [data-abrir]').forEach((b) => b.addEventListener('click', () => { const r = S.redacoes.find((x) => x.id === b.dataset.abrir); RED = { id: r.id, tema_id: r.tema_id }; $('redTema').value = r.tema_livre || ''; $('redTituloInp').value = r.titulo || ''; $('redTexto').value = r.texto; $('redMsg').textContent = ''; contarRed(); abaRed('escrever'); }));
    $$('#redMinhas [data-excluir]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Excluir esta redação?')) return; await api('/redacoes/excluir', { body: { id: b.dataset.excluir } }).catch(() => {}); if (RED.id === b.dataset.excluir) RED.id = null; carregarMinhasRed(); }));
  } catch (e) { box.innerHTML = emp(e.message); }
}

/* ---------------- DESEMPENHO ---------------- */
async function renderDesempenho() {
  $('despKpis').innerHTML = ''; $('despDisc').innerHTML = ld(); $('despAss').innerHTML = '';
  try {
    const d = await api('/desempenho?' + cq());
    const pd = d.por_disciplina || {}, pa = d.por_assunto || {};
    const tot = Object.values(pd).reduce((o, x) => ({ acertos: o.acertos + x.acertos, total: o.total + x.total }), { acertos: 0, total: 0 });
    $('despKpis').innerHTML = `<div class="kpi"><span class="kpi-val">${tot.total}</span><span class="kpi-lbl">Questões resolvidas</span></div><div class="kpi"><span class="kpi-val">${pctOf(tot)}%</span><span class="kpi-lbl">Acerto geral</span></div><div class="kpi"><span class="kpi-val">${hm(d.tempo_s)}</span><span class="kpi-lbl">Tempo líquido no curso</span></div><div class="kpi"><span class="kpi-val">${Object.keys(pa).length}</span><span class="kpi-lbl">Assuntos praticados</span></div><div class="kpi"><span class="kpi-val">${Object.keys(S.ass).filter((id) => (S.dom[id] || 0) >= 4).length}</span><span class="kpi-lbl">Assuntos dominados</span></div>`;
    $('despDisc').innerHTML = S.est.map((di) => { const x = pd[di.nome]; const p = pctOf(x); return `<div class="prow"><div class="plabel" title="${esc(di.nome)}">${esc(di.nome)}</div><div class="pbar-bg"><div class="pbar" style="width:${p}%;background:${x ? corP(p) : 'transparent'}"></div></div><div class="ppct">${x ? p + '% · ' + x.total : '—'}</div></div>`; }).join('');
    const ks = Object.keys(pa).sort((a, b) => pctOf(pa[a]) - pctOf(pa[b]));
    $('despAss').innerHTML = ks.length ? ks.map((k) => { const p = pctOf(pa[k]); return `<div class="prow link-row" onclick="showView('assunto','${k}')"><div class="plabel" title="${esc(pa[k].assunto)}">${esc(pa[k].assunto)}</div><div class="pbar-bg"><div class="pbar" style="width:${p}%;background:${corP(p)}"></div></div><div class="ppct">${p}%</div></div>`; }).join('') : emp('Responda questões para ver o desempenho por assunto', 'As questões do curso ainda estão em preparação.');
  } catch (e) { $('despDisc').innerHTML = emp(e.message); }
}

/* ---------------- DOMÍNIO ---------------- */
function renderDominio() {
  const f = $('domDisc').value; const box = $('domLista');
  box.innerHTML = S.est.filter((di) => !f || di.id === f).map((di) => `<div class="card"><div class="card-title">${esc(di.nome)}</div>${di.assuntos.map((a) => `<div class="dom-item"><div class="link-row" onclick="showView('assunto','${a.id}')"><strong>${esc(a.nome)}</strong></div><div class="flex gap1 mt1" style="flex-wrap:wrap" data-dom="${a.id}"></div></div>`).join('')}</div>`).join('');
  $$('#domLista [data-dom]').forEach((b) => renderDomBtns(b, b.dataset.dom));
}
$('domDisc').addEventListener('change', renderDominio);

/* ---------------- CRONOGRAMA ---------------- */
// A 1ª matéria de cada dia é a de maior peso na prova; a 2ª, de peso médio; a 3ª (se houver tempo), a de menor peso.
// O tempo que sobra vai para questões e revisão. Sábado: simulado + correção. Domingo: redação + revisão geral.
const num = (id, d, mn, mx) => { const v = parseFloat($(id).value); return Math.min(mx, Math.max(mn, Number.isFinite(v) ? v : d)); };
function lerCfgCrono() {
  return { h: num('cronoH', 3, 1, 14), hSab: num('cronoHSab', 4, 3.5, 12), hDom: num('cronoHDom', 3, 2, 12), dias: parseInt($('cronoDias').value, 10) || 6, sab: $('cronoSabSim').checked, dom: $('cronoDomRed').checked };
}
function gerarPlano(ctx) {
  const config = lerCfgCrono();
  const revsPend = ctx.revs.map((r) => ({ assunto_id: r.assunto_id, data: r.vence_em }));
  return { plano: Plano.cronograma(ctx.an, config, new Date(), revsPend), config };
}
$('btnCrono').addEventListener('click', async () => {
  $('cronoContainer').innerHTML = ld('Montando seu cronograma...');
  let ctx; try { ctx = await ctxPlano(); } catch (e) { $('cronoContainer').innerHTML = emp(e.message); return; }
  const { plano, config } = gerarPlano(ctx); S.crono = { plano, config };
  desenharCronograma(plano, {}); renderPesos(ctx.an);
  try { await api('/cronograma/salvar', { body: { curso_id: S.curso.id, plano, config } }); } catch (e) { $('cronoContainer').insertAdjacentHTML('afterbegin', `<p class="err">O plano foi gerado, mas não foi salvo: ${esc(e.message)}</p>`); }
  carregarCronograma(true);
});
function renderPesos(an) {
  const ord = an.discs.slice().sort((x, y) => y.peso - x.peso || x.ord - y.ord), max = ord[0] ? ord[0].peso : 1;
  $('cronoPesos').innerHTML = ord.map((d) => `<div class="prow"><div class="plabel" title="${esc(d.di.nome)}">${esc(d.di.nome)}</div><div class="pbar-bg"><div class="pbar" style="width:${Math.round((d.peso / max) * 100)}%"></div></div><div class="ppct">${d.estimado ? '≈ ' : ''}${d.pct}% da prova</div><span class="badge">${Plano.ROTULO[d.tier]}</span></div>`).join('')
    + `<p class="muted small mt1">${an.estimado ? 'Este edital não informa quantas questões vêm de cada matéria; os pesos são estimativas baseadas em provas de guarda municipal e podem variar por município. ' : ''}No cronograma, a 1ª matéria do dia é sempre uma das que mais pesam e a 3ª é de menor peso.</p>`;
}
async function carregarCronograma(soReal) {
  let porDia = {};
  try { porDia = (await api('/cron/resumo')).por_dia || {}; } catch (e) {}
  if (!soReal) {
    try {
      const c = (await api('/cronograma?' + cq())).cronograma; S.crono = c;
      if (c && c.config) { $('cronoH').value = c.config.h; $('cronoDias').value = c.config.dias; $('cronoSabSim').checked = !!c.config.sab; $('cronoDomRed').checked = !!c.config.dom; $('cronoHSab').value = c.config.hSab || 4; $('cronoHDom').value = c.config.hDom || 3; }
    } catch (e) { S.crono = null; }
    ctxPlano().then((ctx) => renderPesos(ctx.an)).catch(() => { $('cronoPesos').textContent = ''; });
  }
  if (!S.crono || !S.crono.plano || !S.crono.plano.length) { $('cronoContainer').innerHTML = emp('Configure a agenda e clique em Gerar cronograma'); return; }
  desenharCronograma(S.crono.plano, porDia);
}
function nomeItemCrono(it) {
  const a = it.assunto_id ? S.ass[it.assunto_id] : null, ass = a ? `${a.disciplina} — ${a.nome}` : 'Assunto removido';
  switch (it.tipo) {
    case 'simulado': return 'Simulado completo (60 questões, 3 h): faça sem consulta';
    case 'correcao': return 'Corrija o simulado: refaça os erros e leia cada comentário';
    case 'redacao': return 'Redação: escreva um texto completo (até 30 linhas)';
    case 'autocorrecao': return 'Corrija sua redação pelos critérios: Tema, Estrutura, Língua e Coesão';
    case 'revisao_geral': return 'Revisão geral: erros da semana, flashcards e lei seca';
    case 'questoes_fracas': return 'Questões dos seus pontos fracos (assuntos com menor acerto)';
    case 'questoes': return 'Questões de fixação — ' + ass;
    case 'revisao': return 'Revisão — ' + ass;
    default: return ass;
  }
}
function desenharCronograma(plano, porDia) {
  const cls = { revisao: 'is-rev', simulado: 'is-sim', redacao: 'is-red' };
  const tagDe = (it) => {
    if (it.tipo === 'estudo') return it.papel ? `<span class="crono-tag t-${it.papel}">${Plano.ROTULO[it.papel]}${it.reforco ? ' · reforço' : ''}</span>` : '';
    const t = { revisao: ['rev', 'revisão'], simulado: ['sim', 'simulado'], redacao: ['red', 'redação'], correcao: ['q', 'correção'], autocorrecao: ['q', 'correção'], questoes: ['q', 'questões'], questoes_fracas: ['q', 'pontos fracos'], revisao_geral: ['rev', 'revisão geral'] }[it.tipo];
    return t ? `<span class="crono-tag t-${t[0]}">${t[1]}</span>` : '';
  };
  const alvo = (it) => {
    if (it.assunto_id && S.ass[it.assunto_id]) return ` data-cass="${it.assunto_id}"`;
    return { simulado: ' data-go="simulados"', correcao: ' data-go="simulados"', redacao: ' data-go="redacao"', autocorrecao: ' data-go="redacao"', questoes_fracas: ' data-go="desempenho"', revisao_geral: ' data-go="revisoes"' }[it.tipo] || '';
  };
  $('cronoContainer').innerHTML = plano.map((d) => {
    const plan = d.itens.reduce((n, i) => n + i.min, 0) * 60, real = porDia[d.data] || 0;
    return `<div class="crono-card"><div class="crono-dia">${esc(nomeDia(d.data))}</div>
      ${d.foco && d.foco.length ? `<div class="crono-foco">${esc(d.foco.join(' · '))}</div>` : ''}
      ${plan && d.data <= diaISO(new Date()) ? `<div class="crono-real"><span>Real ${hm(real)} / plano ${hm(plan)}</span><div class="pbar-bg" style="flex:1"><div class="pbar" style="width:${Math.min(100, Math.round((real / plan) * 100))}%;background:${corP(Math.round((real / plan) * 100))}"></div></div></div>` : ''}
      ${d.folga ? '<p class="muted small">Folga</p>' : d.itens.map((it) => `<div class="crono-sess ${cls[it.tipo] || ''}${alvo(it) ? ' link-row' : ''}"${alvo(it)}><span class="crono-t">${it.min}min</span><span>${esc(nomeItemCrono(it))}${tagDe(it)}</span></div>`).join('')}</div>`;
  }).join('');
}
$('cronoContainer').addEventListener('click', (e) => { const c = e.target.closest('[data-cass]'); if (c) showView('assunto', c.dataset.cass); });

/* ---------------- CALENDÁRIO ---------------- */
let CAL = { ano: new Date().getFullYear(), mes: new Date().getMonth(), sel: diaISO(new Date()), eventos: [] };
async function renderCalendario() {
  const ini = new Date(CAL.ano, CAL.mes, 1), fim = new Date(CAL.ano, CAL.mes + 1, 0);
  $('calMes').textContent = ini.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  try { CAL.eventos = (await api(`/eventos?de=${diaISO(new Date(CAL.ano, CAL.mes, -6))}&ate=${diaISO(new Date(CAL.ano, CAL.mes + 1, 7))}`)).eventos; } catch (e) { CAL.eventos = []; }
  if (S.crono === undefined) { try { S.crono = (await api('/cronograma?' + cq())).cronograma; } catch (e) { S.crono = null; } }
  const plano = {}; ((S.crono && S.crono.plano) || []).forEach((d) => { if (d.itens.length) plano[d.data] = d; });
  const hoje = diaISO(new Date());
  let h = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => `<div class="cal-h">${d}</div>`).join('');
  const start = new Date(CAL.ano, CAL.mes, 1 - ini.getDay());
  const semanas = Math.ceil((ini.getDay() + fim.getDate()) / 7);
  for (let i = 0; i < semanas * 7; i++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), iso = diaISO(dt);
    const evs = CAL.eventos.filter((e) => e.data === iso);
    h += `<button type="button" class="cal-cell${dt.getMonth() !== CAL.mes ? ' fora' : ''}${iso === hoje ? ' hoje' : ''}${iso === CAL.sel ? ' sel' : ''}" data-dia="${iso}" aria-label="${esc(nomeDia(iso))}: ${evs.length} compromissos"><span class="n">${dt.getDate()}</span><span class="cal-dots">${plano[iso] ? '<span class="cal-dot t-plano" title="Cronograma"></span>' : ''}${evs.map((e) => `<span class="cal-dot t-${e.tipo}"></span>`).join('')}</span></button>`;
  }
  $('calGrid').innerHTML = h;
  $$('#calGrid [data-dia]').forEach((b) => b.addEventListener('click', () => { CAL.sel = b.dataset.dia; $$('#calGrid .cal-cell').forEach((x) => x.classList.toggle('sel', x === b)); renderDia(plano); }));
  renderDia(plano);
}
function renderDia(plano) {
  $('calDiaTitulo').textContent = nomeDia(CAL.sel, { weekday: 'long', day: '2-digit', month: 'long' });
  const evs = CAL.eventos.filter((e) => e.data === CAL.sel);
  const p = plano[CAL.sel];
  $('calDiaLista').innerHTML = (p ? `<div class="ev-row"><span class="badge">cronograma</span><span class="grow">${p.itens.length} bloco(s) planejado(s)</span><button type="button" class="btn-ghost btn-sm" data-go="cronograma">Ver</button></div>` : '') +
    (evs.map((e) => `<div class="ev-row${e.feito ? ' feito' : ''}"><input type="checkbox" ${e.feito ? 'checked' : ''} data-feito="${e.id}" aria-label="Concluído"><span class="badge">${esc(e.tipo)}</span><span class="grow">${esc(e.titulo)}</span><button type="button" class="btn-ghost btn-sm" data-del="${e.id}">Excluir</button></div>`).join('') || (p ? '' : '<p class="muted small">Nenhum compromisso neste dia.</p>'));
  $$('#calDiaLista [data-feito]').forEach((c) => c.addEventListener('change', async () => { const e = CAL.eventos.find((x) => x.id === c.dataset.feito); await api('/eventos/salvar', { body: { ...e, feito: c.checked } }).catch(() => {}); renderCalendario(); }));
  $$('#calDiaLista [data-del]').forEach((b) => b.addEventListener('click', async () => { await api('/eventos/excluir', { body: { id: b.dataset.del } }).catch(() => {}); renderCalendario(); }));
}
$('calPrev').addEventListener('click', () => { CAL.mes--; if (CAL.mes < 0) { CAL.mes = 11; CAL.ano--; } renderCalendario(); });
$('calNext').addEventListener('click', () => { CAL.mes++; if (CAL.mes > 11) { CAL.mes = 0; CAL.ano++; } renderCalendario(); });
$('btnCalAdd').addEventListener('click', async () => {
  const t = $('calTitulo').value.trim(); if (!t) { $('calTitulo').focus(); return; }
  try { await api('/eventos/salvar', { body: { data: CAL.sel, titulo: t, tipo: $('calTipo').value } }); $('calTitulo').value = ''; renderCalendario(); } catch (e) { alert(e.message); }
});

/* ---------------- CRONÔMETRO X ---------------- */
let CRON = null, CRON_T = null, CRON_OFF = 0;
function cronLiquido() {
  if (!CRON) return 0;
  const agora = Date.now() + CRON_OFF;
  let pausa = CRON.pausas_s || 0;
  if (CRON.pausado_em) pausa += (agora - Date.parse(CRON.pausado_em)) / 1000;
  return Math.min(16 * 3600, (agora - Date.parse(CRON.inicio)) / 1000 - pausa);
}
function cronTick() {
  const l = cronLiquido(), rod = CRON && !CRON.pausado_em;
  $('cronDisplay').textContent = hms(CRON ? l : 0);
  $('cronDisplay').className = 'cron-display' + (CRON ? (rod ? ' rodando' : ' pausado') : '');
  const pill = $('cronPill'); pill.className = 'cron-pill' + (CRON ? (rod ? ' rodando' : ' pausado') : ' vazio');
  $('cronPillTxt').textContent = CRON ? hms(l) : 'Estudar';
}
function cronUI() {
  const on = !!CRON;
  $('cronEstado').textContent = on ? (CRON.pausado_em ? 'Sessão pausada' : 'Estudando') : 'Nenhuma sessão em andamento';
  const a = on && CRON.assunto_id ? S.ass[CRON.assunto_id] : null, d = on && CRON.disciplina_id ? S.disc[CRON.disciplina_id] : null;
  $('cronAlvo').textContent = on ? [a ? a.disciplina : d ? d.nome : '', a ? a.nome : '', CRON.atividade].filter(Boolean).join(' · ') : '';
  $('cronSetup').classList.toggle('hidden', on);
  $('btnCronIniciar').classList.toggle('hidden', on);
  $('btnCronPausar').classList.toggle('hidden', !on || !!CRON.pausado_em);
  $('btnCronRetomar').classList.toggle('hidden', !on || !CRON.pausado_em);
  $('btnCronEncerrar').classList.toggle('hidden', !on);
  clearInterval(CRON_T); if (on) CRON_T = setInterval(cronTick, 1000);
  cronTick();
}
async function cronRecuperar() { try { const d = await api('/cron/ativa'); CRON = d.sessao; CRON_OFF = Date.parse(d.agora) - Date.now(); } catch (e) { CRON = null; } cronUI(); }
async function cronAcao(p, body) { $('cronMsg').textContent = ''; try { const d = await api('/cron/' + p, { body: body || {} }); CRON = d.sessao && d.sessao.ativa ? d.sessao : null; if (p === 'encerrar') $('cronMsg').textContent = 'Sessão registrada: ' + hm(d.sessao.liquido_s) + ' de estudo líquido.'; cronUI(); carregarCronometro(true); } catch (e) { $('cronMsg').textContent = e.message; } }
$('btnCronIniciar').addEventListener('click', () => cronAcao('iniciar', { curso_id: S.curso.id, disciplina_id: $('cronDisc').value || null, assunto_id: $('cronAss').value || null, atividade: $('cronAtiv').value }));
$('btnCronPausar').addEventListener('click', () => cronAcao('pausar'));
$('btnCronRetomar').addEventListener('click', () => cronAcao('retomar'));
$('btnCronEncerrar').addEventListener('click', () => cronAcao('encerrar'));
async function carregarCronometro(soResumo) {
  if (!soResumo) cronRecuperar();
  try {
    const r = await api('/cron/resumo');
    $('cronKHoje').textContent = hm(r.hoje_s); $('cronKSess').textContent = r.sessoes_hoje; $('cronKSem').textContent = hm(r.semana_s); $('cronKTotal').textContent = hm(r.total_s);
    const fe = r.sessoes.filter((s) => !s.ativa);
    $('cronHist').innerHTML = fe.length ? fe.map((s) => { const a = S.ass[s.assunto_id], d = S.disc[s.disciplina_id]; return `<div class="crono-sess"><span class="crono-t">${hm(s.liquido_s)}</span><span>${esc(new Date(s.inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))} · ${esc([a ? a.disciplina : d ? d.nome : 'Sem disciplina', a ? a.nome : '', s.atividade].filter(Boolean).join(' · '))}</span></div>`; }).join('') : emp('Nenhuma sessão registrada ainda');
  } catch (e) { $('cronHist').innerHTML = emp(e.message); }
}

/* ---------------- MINHA CONTA ---------------- */
function renderConta() { $('contaEmail').textContent = S.email; $('contaNome').value = S.perfil.full_name || ''; $('contaMsg').textContent = ''; }
$('btnContaNome').addEventListener('click', async () => { try { await api('/perfil', { body: { nome: $('contaNome').value } }); S.perfil.full_name = $('contaNome').value; $('painelNome').textContent = $('contaNome').value.split(' ')[0] || 'Candidato'; $('contaMsg').textContent = 'Nome salvo.'; } catch (e) { $('contaMsg').textContent = e.message; } });
$('btnContaSenha').addEventListener('click', async () => {
  const p1 = $('contaSenha').value, p2 = $('contaSenha2').value;
  if (p1.length < 6) { $('contaMsg').textContent = 'A senha deve ter no mínimo 6 caracteres.'; return; }
  if (p1 !== p2) { $('contaMsg').textContent = 'As senhas não coincidem.'; return; }
  try { await api('/senha/alterar', { body: { password: p1 } }); $('contaSenha').value = $('contaSenha2').value = ''; $('contaMsg').textContent = 'Senha alterada.'; } catch (e) { $('contaMsg').textContent = e.message; }
});

/* ---------------- CENTRAL ADMINISTRATIVA ---------------- */
$$('#admTabs .tab').forEach((t) => t.addEventListener('click', () => {
  $$('#admTabs .tab').forEach((x) => x.classList.toggle('on', x === t));
  $$('#v-admin [data-ap]').forEach((p) => p.classList.toggle('hidden', p.dataset.ap !== t.dataset.at));
  ({ estrutura: renderAdmEstrutura, cobertura: renderAdmCobertura, banco: renderAdmBanco, simulados: renderAdmSimulados, videos: renderAdmVideos, usuarios: renderAdmUsuarios })[t.dataset.at]();
}));
function renderAdmin() { if (!S.admin) { showView('painel'); return; } const t = $$('#admTabs .tab.on')[0]; t.click(); }
function renderAdmEstrutura() {
  const box = $('admEstrutura');
  const btn = (acao, nivel, id, pai, rot) => `<button type="button" class="btn-ghost" data-ae="${acao}" data-nivel="${nivel}" data-id="${id || ''}" data-pai="${pai || ''}">${rot}</button>`;
  box.innerHTML = `<div class="card"><div class="flex between center"><div class="card-title">${esc(S.curso.nome)}</div>${btn('criar', 'disciplina', '', S.curso.id, '+ Disciplina')}</div><p class="muted small">Curso → Disciplina → Assunto → Subassunto. Alterações valem só para o Bizu do Concurseiro X.</p></div>
    <div class="adm-tree">${S.est.map((di) => `<div class="cob-mat"><div class="cob-hdr"><span class="cob-nome">${esc(di.nome)}</span><span class="adm-acts">${btn('criar', 'assunto', '', di.id, '+ Assunto')}${btn('renomear', 'disciplina', di.id, '', 'Renomear')}${btn('excluir', 'disciplina', di.id, '', 'Excluir')}</span><span aria-hidden="true">▾</span></div>
      <div class="cob-temas">${di.assuntos.map((a) => `<div class="cob-tema-row"><span>${esc(a.nome)}</span><span class="adm-acts">${btn('criar', 'subassunto', '', a.id, '+ Sub')}${btn('renomear', 'assunto', a.id, '', 'Renomear')}${btn('excluir', 'assunto', a.id, '', 'Excluir')}</span></div>
        ${a.subassuntos.length ? `<ul class="adm-sub">${a.subassuntos.map((s) => `<li><span>• ${esc(s.nome)}</span><span class="adm-acts">${btn('renomear', 'subassunto', s.id, '', 'Renomear')}${btn('excluir', 'subassunto', s.id, '', 'Excluir')}</span></li>`).join('')}</ul>` : ''}`).join('')}</div></div>`).join('')}</div>`;
  $$('#admEstrutura .cob-hdr').forEach((h) => h.addEventListener('click', (e) => { if (!e.target.closest('button')) h.parentElement.classList.toggle('exp'); }));
  $$('#admEstrutura [data-ae]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const { ae, nivel, id, pai } = b.dataset; let nome = '';
    if (ae === 'criar') { nome = prompt(`Nome do novo ${nivel}:`); if (!nome) return; }
    if (ae === 'renomear') { nome = prompt('Novo nome:', b.closest('.cob-hdr,.cob-tema-row,li').querySelector('span').textContent.replace(/^•\s*/, '')); if (!nome) return; }
    if (ae === 'excluir' && !confirm(`Excluir este ${nivel} e tudo o que estiver dentro dele?`)) return;
    try { await api('/admin/estrutura', { body: { acao: ae, nivel, id, pai_id: pai, nome } }); const abertos = $$('#admEstrutura .cob-mat.exp').map((m) => m.querySelector('.cob-nome').textContent); await carregarEstrutura(); renderAdmEstrutura(); $$('#admEstrutura .cob-mat').forEach((m) => { if (abertos.includes(m.querySelector('.cob-nome').textContent)) m.classList.add('exp'); }); } catch (er) { alert(er.message); }
  }));
}
async function renderAdmCobertura() {
  const box = $('admCobertura'); box.innerHTML = ld();
  try {
    const est = (await api('/admin/cobertura?' + cq())).disciplinas;
    box.innerHTML = `<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Disciplina / assunto</th>${SLOTS.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>${est.map((di) => `<tr><td colspan="${SLOTS.length + 1}"><strong>${esc(di.nome)}</strong></td></tr>${di.assuntos.map((a) => `<tr><td>${esc(a.nome)}</td>${SLOTS.map(([k]) => `<td>${a.conteudo[k] || 0}</td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table><p class="muted small mt1">Inclui material ainda não publicado.</p></div>`;
  } catch (e) { box.innerHTML = emp(e.message); }
}
/* ---------------- ADMIN: BANCO DE QUESTÕES E SIMULADOS ---------------- */
const FAIXA = { verde: '🟢', amarelo: '🟡', vermelho: '🔴' };
const FLAG_TXT = { sem_questoes: 'sem questões', poucas: 'poucas questões', excesso: 'excesso', sem_banca_alvo: 'sem questão real da banca-alvo', sem_recente: 'sem questão recente', sem_nivel_adequado: 'sem nível adequado', precisa_complemento_autoral: 'precisa de complemento autoral' };
let ADM_REV = { status: 'revisao', pagina: 0 };
async function renderAdmBanco() {
  await renderAdmBanco0();
  const box = $('admBanco'); if (!box.firstChild || box.querySelector('.empty')) return;
  box.insertAdjacentHTML('afterbegin', '<div class="card mb2" id="admDup"><div class="card-title">Controle de duplicidade (uma questão, um uso)</div><div class="muted small">Verificando...</div></div>');
  try {
    const d = await api('/admin/banco/duplicidade');
    const prov = Object.entries(d.questoes_ligadas_a_prova_real || {}).map(([k, v]) => `<span class="badge">${esc(k)}: ${v}</span>`).join(' ');
    $('admDup').innerHTML = `<div class="card-title">Controle de duplicidade (uma questão, um uso)</div>
      <div class="qmeta"><span class="badge">Questões no banco: ${d.total_questoes}</span><span class="badge ${d.hash_repetido ? 'berr' : 'bok'}">Hash repetido: ${d.hash_repetido}</span><span class="badge ${d.grupos_texto_repetido ? 'berr' : 'bok'}">Grupos de texto repetido: ${d.grupos_texto_repetido}</span><span class="badge">Provas reais cadastradas: ${d.provas_reais_cadastradas}</span><span class="badge">Simulados cadastrados: ${d.simulados_cadastrados}</span></div>
      <p class="small mt1">${esc(d.regra)}</p>${prov ? `<p class="small"><strong>Questões do banco por prova de origem:</strong> ${prov}</p>` : ''}
      <p class="muted small">Ao publicar um novo simulado ou prova com questões do banco, rode esta verificação antes: o conjunto de cada simulado deve ser exclusivo.</p>`;
  } catch (e) { $('admDup').innerHTML = '<div class="card-title">Controle de duplicidade</div>' + emp(e.message); }
}
async function renderAdmBanco0() {
  const box = $('admBanco'); box.innerHTML = ld('Calculando indicadores do banco...');
  try {
    const r = await api('/admin/banco/resumo?' + cq()); const c = r.cursos[S.curso.id]; const t = r.totais;
    if (!c) { box.innerHTML = emp('Sem dados para este curso'); return; }
    const kv = (o) => Object.entries(o || {}).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<span class="badge">${esc(k)}: ${v}</span>`).join(' ');
    const e = c.edital;
    box.innerHTML = `<div class="card mb2"><div class="card-title">Banco de Questões — ${esc(S.curso.nome)}</div>
      <div class="qmeta"><span class="badge q-real">🟦 Reais: ${c.reais}</span><span class="badge q-aut">🟨 Autorais: ${c.autorais}</span><span class="badge">Total: ${c.total}</span><span class="badge berr">Em revisão administrativa: ${c.sem_classificacao}</span><span class="badge">Desatualizadas: ${c.desatualizadas}</span><span class="badge">Possíveis duplicadas: ${c.duplicadas_possiveis}</span><span class="badge">Assuntos sem questões: ${c.assuntos_sem_questoes}</span></div>
      <p class="small mt1"><strong>Edital:</strong> ${e.disciplinas_com_questoes_pct}% das disciplinas · ${e.assuntos_com_questoes_pct}% dos assuntos com questões · ${e.assuntos_banca_alvo_pct === null ? 'banca-alvo (' + esc(c.banca_alvo) + '): ainda sem provas reais da banca no banco' : e.assuntos_banca_alvo_pct + '% dos assuntos com questão real da banca-alvo (' + esc(c.banca_alvo) + ')'} · ${e.assuntos_precisam_complemento} assunto(s) precisam de complementação · 🟢 ${e.verde} 🟡 ${e.amarelo} 🔴 ${e.vermelho}</p>
      <p class="small">Por status: ${kv(c.por_status)}</p><p class="small">Por banca: ${kv(c.por_banca)}</p><p class="small">Por nível: ${kv(c.por_nivel)} · Compatibilidade: ${kv(c.por_compat)}</p><p class="small">Por ano (reais): ${kv(c.por_ano)}</p>
      <p class="small">Por disciplina: ${Object.entries(c.por_disciplina).map(([d, o]) => `<span class="badge">${esc(d)}: ${o.total} (${o.reais} reais · ${o.autorais} autorais)</span>`).join(' ')}</p>
      <p class="muted small">Total geral (todos os cursos): ${t.total} questões — ${t.reais} reais, ${t.autorais} autorais.</p></div>
    <div class="card tbl-wrap mb2"><div class="card-title">Cobertura por assunto</div><table class="tbl"><thead><tr><th></th><th>Disciplina / assunto</th><th>Reais</th><th>Banca-alvo</th><th>Recentes</th><th>Autorais</th><th>Total</th><th>Revisão</th><th>Alertas</th></tr></thead><tbody>${c.cobertura.map((l) => `<tr><td>${FAIXA[l.faixa]}</td><td><span class="muted small">${esc(l.disciplina)}</span><br>${esc(l.assunto)}</td><td>${l.reais}</td><td>${l.reais_alvo}</td><td>${l.recentes}</td><td>${l.autorais}</td><td><strong>${l.total}</strong></td><td>${l.em_revisao + l.desatualizadas}</td><td class="small">${l.flags.map((f) => FLAG_TXT[f] || f).join('; ')}</td></tr>`).join('')}</tbody></table><p class="muted small mt1">🟢 boa (≥ 10 questões e questões reais da banca-alvo quando existem provas) · 🟡 média · 🔴 insuficiente (&lt; 6). Contam apenas questões publicadas, atualizadas e compatíveis com o nível do cargo.</p></div>
    <div class="card mb2"><div class="card-title">Fila de revisão administrativa</div><div class="filters"><div class="fgroup"><label for="admRevSt">Status</label><select id="admRevSt"><option value="revisao">Em revisão</option><option value="desatualizada">Desatualizadas</option><option value="anulada">Anuladas</option><option value="duplicada">Duplicadas</option></select></div></div><div id="admRevLista"></div></div>
    <div class="card tbl-wrap"><div class="card-title">Arquivos do Drive processados</div><div id="admFontes">${ld()}</div></div>`;
    $('admRevSt').value = ADM_REV.status; $('admRevSt').addEventListener('change', () => { ADM_REV = { status: $('admRevSt').value, pagina: 0 }; carregarRev(); });
    carregarRev();
    api('/admin/fontes').then((f) => { $('admFontes').innerHTML = `<table class="tbl"><thead><tr><th>Arquivo</th><th>Pasta</th><th>Tipo</th><th>Questões</th><th>Status</th></tr></thead><tbody>${f.fontes.filter((x) => !x.curso_id || x.curso_id === S.curso.id).map((x) => `<tr><td>${esc(x.nome)}</td><td>${esc(x.pasta || '')}</td><td>${esc(x.categoria)}</td><td>${x.qtd_questoes || '—'}</td><td>${esc(x.status)}${x.obs ? `<br><span class="muted small">${esc(x.obs)}</span>` : ''}</td></tr>`).join('')}</tbody></table>`; }).catch(() => { $('admFontes').innerHTML = ''; });
  } catch (e) { box.innerHTML = emp(e.message); }
}
async function carregarRev() {
  const box = $('admRevLista'); box.innerHTML = ld();
  try {
    const r = await api(`/admin/banco/revisao?${cq()}&status=${ADM_REV.status}&pagina=${ADM_REV.pagina}`);
    box.innerHTML = `<p class="muted small">${r.total} questão(ões) · página ${ADM_REV.pagina + 1}</p>` + (r.questoes.length ? r.questoes.map((q) => `<div class="qcard" data-q="${q.id}"><div class="qmeta"><span class="badge ${q.tipo === 'real' ? 'q-real' : 'q-aut'}">${q.tipo === 'real' ? '🟦 REAL' : '🟨 AUTORAL'}</span><span class="badge">${esc(q.concurso || q.origem || '')}${q.numero_questao ? ' · Q' + q.numero_questao : ''}</span><span class="badge">${esc(q.disciplina)} › ${esc(q.assunto)}</span></div>
      <div class="qenunciado small">${esc((q.enunciado || '').slice(-600))}</div><ol type="A" class="small">${(q.opcoes || []).map((o, i) => `<li${i === q.gabarito ? ' class="bold"' : ''}>${esc(o)}</li>`).join('')}</ol>
      <p class="small"><strong>Motivo:</strong> ${esc(q.motivo_status || '—')}</p>${q.legislacao_considerada ? `<p class="small muted">Legislação considerada: ${esc(q.legislacao_considerada)}</p>` : ''}
      <div class="sim-acoes"><button type="button" class="btn-blue btn-sm" data-st="publicada">Publicar</button><button type="button" class="btn-ghost btn-sm" data-st="revisao">Revisão</button><button type="button" class="btn-ghost btn-sm" data-st="desatualizada">Desatualizada</button><button type="button" class="btn-ghost btn-sm" data-st="anulada">Anulada</button><button type="button" class="btn-ghost btn-sm" data-st="excluir">Excluir</button></div></div>`).join('') : emp('Nada nesta fila')) +
      `<div class="sim-acoes">${ADM_REV.pagina > 0 ? '<button type="button" class="btn-ghost btn-sm" id="revAnt">‹ Anterior</button>' : ''}${(ADM_REV.pagina + 1) * 30 < r.total ? '<button type="button" class="btn-ghost btn-sm" id="revProx">Próxima ›</button>' : ''}</div>`;
    $$('#admRevLista [data-st]').forEach((b) => b.addEventListener('click', async () => {
      const id = b.closest('.qcard').dataset.q, st = b.dataset.st;
      try {
        if (st === 'excluir') { if (!confirm('Excluir definitivamente esta questão?')) return; await api('/admin/banco/questao', { body: { id, acao: 'excluir' } }); }
        else { const motivo = st === 'publicada' ? null : prompt('Motivo (opcional):') || null; await api('/admin/banco/questao', { body: { id, acao: 'status', status: st, motivo } }); }
        carregarRev();
      } catch (e) { alert(e.message); }
    }));
    if ($('revAnt')) $('revAnt').addEventListener('click', () => { ADM_REV.pagina--; carregarRev(); });
    if ($('revProx')) $('revProx').addEventListener('click', () => { ADM_REV.pagina++; carregarRev(); });
  } catch (e) { box.innerHTML = emp(e.message); }
}
let ADM_SIM_ED = null;
async function renderAdmSimulados() {
  const box = $('admSimulados'); box.innerHTML = ld();
  try {
    const l = (await api('/admin/simulados?' + cq())).simulados; ADM_SIM_ED = null;
    const f = (id, rot, v, ph) => `<div class="fgroup"><label for="${id}">${rot}</label><input id="${id}" value="${esc(v || '')}" placeholder="${esc(ph || '')}"></div>`;
    box.innerHTML = `<div class="card mb2"><div class="card-title" id="asTit">Novo simulado — ${esc(S.curso.nome)}</div><p class="muted small">Cole os links de compartilhamento do Google Drive (“qualquer pessoa com o link”). O simulado só aparece para os alunos depois de publicado.</p>
      <div class="filters">${f('asTitulo', 'Título')}${f('asCargo', 'Cargo')}${f('asBanca', 'Banca')}${f('asAno', 'Ano')}<div class="fgroup"><label for="asCat">Categoria</label><select id="asCat"><option value="prova_real">Prova real</option><option value="simulado">Simulado</option></select></div>${f('asNum', 'Número')}<div class="fgroup"><label for="asData">Data da prova</label><input id="asData" type="date"></div>${f('asTipo', 'Tipo', 'Prova real', 'Prova real / Simulado autoral')}${f('asProva', 'Link da prova')}${f('asGab', 'Link do gabarito')}${f('asCom', 'Link do gabarito comentado')}${f('asDesc', 'Descrição (opcional)')}
      <div class="fgroup"><label><input type="checkbox" id="asPub"> Publicado</label></div><button type="button" class="btn-blue" id="asSalvar">Salvar simulado</button><button type="button" class="btn-ghost hidden" id="asCancel">Cancelar edição</button></div><div class="muted small" id="asMsg" role="status"></div></div>
    <div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Simulado</th><th>Categoria</th><th>Banca / ano</th><th>Links</th><th>Status</th><th></th></tr></thead><tbody>${l.map((s) => `<tr data-id="${s.id}"><td>${esc(s.titulo)}<br><span class="muted small">${esc(s.tipo || '')} · ${esc(s.cargo || '')}</span></td><td>${s.categoria === 'simulado' ? 'Simulado' : 'Prova real'}${s.numero ? ' nº ' + s.numero : ''}</td><td>${esc(s.banca || '')} ${esc(s.ano || '')}</td><td class="small">${s.prova_url ? '✔ prova ' : '✘ prova '}${s.gabarito_url ? '✔ gabarito ' : '✘ gabarito '}${s.comentario_url ? '✔ comentado' : '✘ comentado'}</td><td>${s.publicado ? '<span class="badge bok">Publicado</span>' : '<span class="badge">Rascunho</span>'}</td><td class="adm-acts"><button type="button" class="btn-ghost btn-sm" data-ed="${s.id}">Editar</button><button type="button" class="btn-ghost btn-sm" data-pub="${s.id}" data-v="${s.publicado ? 0 : 1}">${s.publicado ? 'Despublicar' : 'Publicar'}</button><button type="button" class="btn-ghost btn-sm" data-del="${s.id}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`;
    const corpo = () => ({ titulo: $('asTitulo').value, cargo: $('asCargo').value, banca: $('asBanca').value, ano: $('asAno').value, tipo: $('asTipo').value || ($('asCat').value === 'simulado' ? 'Simulado autoral' : 'Prova real'), categoria: $('asCat').value, numero: parseInt($('asNum').value, 10) || null, data_prova: $('asData').value || null, prova_url: $('asProva').value.trim(), gabarito_url: $('asGab').value.trim(), comentario_url: $('asCom').value.trim(), descricao: $('asDesc').value, publicado: $('asPub').checked });
    $('asSalvar').addEventListener('click', async () => {
      try { await api('/admin/simulados', { body: { ...corpo(), acao: ADM_SIM_ED ? 'editar' : 'criar', id: ADM_SIM_ED, curso_id: S.curso.id } }); renderAdmSimulados(); } catch (e) { $('asMsg').textContent = e.message; }
    });
    $('asCancel').addEventListener('click', renderAdmSimulados);
    $$('#admSimulados [data-ed]').forEach((b) => b.addEventListener('click', () => {
      const s = l.find((x) => x.id === b.dataset.ed); ADM_SIM_ED = s.id; $('asTit').textContent = 'Editar simulado'; $('asCancel').classList.remove('hidden');
      [['asTitulo', 'titulo'], ['asCargo', 'cargo'], ['asBanca', 'banca'], ['asAno', 'ano'], ['asTipo', 'tipo'], ['asProva', 'prova_url'], ['asGab', 'gabarito_url'], ['asCom', 'comentario_url'], ['asDesc', 'descricao'], ['asNum', 'numero'], ['asData', 'data_prova']].forEach(([i, k]) => { $(i).value = s[k] || ''; }); $('asCat').value = s.categoria || 'prova_real'; $('asPub').checked = !!s.publicado; window.scrollTo(0, 0);
    }));
    $$('#admSimulados [data-pub]').forEach((b) => b.addEventListener('click', async () => { await api('/admin/simulados', { body: { acao: 'publicar', id: b.dataset.pub, publicado: b.dataset.v === '1' } }).catch((e) => alert(e.message)); renderAdmSimulados(); }));
    $$('#admSimulados [data-del]').forEach((b) => b.addEventListener('click', async () => { if (confirm('Excluir este simulado?')) { await api('/admin/simulados', { body: { acao: 'excluir', id: b.dataset.del } }).catch((e) => alert(e.message)); renderAdmSimulados(); } }));
  } catch (e) { box.innerHTML = emp(e.message); }
}
async function renderAdmVideos() {
  const box = $('admVideos'); box.innerHTML = ld();
  try {
    const vs = (await api('/admin/videos?' + cq())).videos;
    box.innerHTML = `<div class="card mb2"><div class="card-title">Adicionar vídeo do YouTube — ${esc(S.curso.nome)}</div><p class="muted small">Só vídeos reais, que permitem incorporação. O vídeo é validado no YouTube antes de salvar; nada é baixado nem hospedado aqui.</p>
      <div class="filters"><div class="fgroup"><label for="avAss">Assunto</label><select id="avAss">${S.est.map((d) => `<optgroup label="${esc(d.nome)}">${d.assuntos.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</optgroup>`).join('')}</select></div>
      <div class="fgroup"><label for="avUrl">Link do vídeo</label><input id="avUrl" placeholder="https://www.youtube.com/watch?v=..."></div><div class="fgroup"><label for="avOrd">Ordem</label><input id="avOrd" type="number" min="1" value="1"></div><button type="button" class="btn-blue" id="avAdd">Adicionar</button></div><div class="muted small" id="avMsg" role="status"></div></div>
    <div class="card tbl-wrap"><div class="card-title">${vs.length} vídeo(s) neste curso</div><table class="tbl"><thead><tr><th>Disciplina / assunto</th><th>Vídeo</th><th>Status</th><th></th></tr></thead><tbody>${vs.map((v) => `<tr><td>${esc(v.disciplina)}<br><span class="muted small">${esc(v.assunto)}</span></td><td><a href="https://www.youtube.com/watch?v=${encodeURIComponent(v.video_id)}" target="_blank" rel="noopener noreferrer">${esc(v.titulo)}</a><br><span class="muted small">${esc(v.canal || '')}</span></td><td>${v.publicado ? '<span class="badge bok">Publicado</span>' : '<span class="badge">Oculto</span>'}</td><td class="adm-acts"><button type="button" class="btn-ghost btn-sm" data-pub="${v.id}" data-v="${v.publicado ? 0 : 1}">${v.publicado ? 'Ocultar' : 'Publicar'}</button><button type="button" class="btn-ghost btn-sm" data-del="${v.id}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`;
    $('avAdd').addEventListener('click', async () => { $('avMsg').textContent = 'Validando...'; try { await api('/admin/videos', { body: { acao: 'criar', assunto_id: $('avAss').value, url: $('avUrl').value.trim(), ordem: $('avOrd').value } }); renderAdmVideos(); } catch (e) { $('avMsg').textContent = e.message; } });
    $$('#admVideos [data-pub]').forEach((b) => b.addEventListener('click', async () => { await api('/admin/videos', { body: { acao: 'publicar', id: b.dataset.pub, publicado: b.dataset.v === '1' } }).catch((e) => alert(e.message)); renderAdmVideos(); }));
    $$('#admVideos [data-del]').forEach((b) => b.addEventListener('click', async () => { if (confirm('Excluir este vídeo?')) { await api('/admin/videos', { body: { acao: 'excluir', id: b.dataset.del } }).catch((e) => alert(e.message)); renderAdmVideos(); } }));
  } catch (e) { box.innerHTML = emp(e.message); }
}
async function renderAdmUsuarios() {
  $('admUCurso').innerHTML = S.cursos.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('');
  const box = $('admUsuarios'); box.innerHTML = ld();
  try {
    const us = (await api('/admin/usuarios')).usuarios;
    const nomeC = (id) => (S.cursos.find((c) => c.id === id) || {}).nome || '—';
    box.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>E-mail</th><th>Nome</th><th>Curso</th><th>XP</th><th>Último acesso</th></tr></thead><tbody>${us.map((u) => `<tr><td>${esc(u.email)}${u.admin ? ' <span class="badge bgold">admin</span>' : ''}</td><td>${esc(u.nome || '—')}</td><td>${esc(nomeC(u.curso_id))}</td><td>${u.xp}</td><td>${u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-BR') : '—'}</td></tr>`).join('')}</tbody></table></div>`;
  } catch (e) { box.innerHTML = emp(e.message); }
}
$('btnAdmUCriar').addEventListener('click', async () => {
  try { await api('/admin/usuarios/criar', { body: { nome: $('admUNome').value, email: $('admUEmail').value, password: $('admUSenha').value, curso_id: $('admUCurso').value } }); $('admUMsg').textContent = 'Usuário criado.'; ['admUNome', 'admUEmail', 'admUSenha'].forEach((i) => { $(i).value = ''; }); renderAdmUsuarios(); } catch (e) { $('admUMsg').textContent = e.message; }
});

/* ---------------- PARTIDA ---------------- */
window.showView = showView; window.estudarNoCronometro = estudarNoCronometro;
if (location.hash.includes('type=recovery') && location.hash.includes('access_token')) {
  $('loginPanel').classList.add('hidden'); $('resetPanel').classList.remove('hidden');
} else {
  api('/session').then(() => iniciar()).catch(() => {});
}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
