// Bizu do Concurseiro X — API (Edge Function cx-api, projeto Supabase bizu-concurseiro-x).
// Projeto independente do Bizu Delta X: banco, funções e sessão próprios.
// As rotas de conteúdo (questões, materiais, simulados, temas de redação) devolvem
// apenas o que foi publicado. O conteúdo entra pelas rotas /admin/* (importação por
// assunto, montagem de simulados e temas de redação), restritas a administradores.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ADMIN_EMAILS = ['welcksonpsousa@gmail.com', 'bizudoconcurseirox@gmail.com'];
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const C_ACCESS = 'cx_session', C_REFRESH = 'cx_refresh';
const TIPOS_MATERIAL = ['pdf', 'aula', 'flashcard', 'mapa_mental', 'lei_seca', 'jurisprudencia', 'revisao'];
const TETO_SESSAO_S = 16 * 3600;

// ---------- utilidades HTTP ----------
type H = Record<string, string>;
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function fail(m: string, s = 400) { return json({ error: true, message: m }, s); }
function readCookie(req: Request, name: string) {
  const raw = req.headers.get('cookie'); if (!raw) return null;
  for (const part of raw.split(';')) { const [k, ...v] = part.trim().split('='); if (k === name) return decodeURIComponent(v.join('=')); }
  return null;
}
// Cookies a enviar na resposta: uma lista por requisição (nunca global).
type Ck = string[];
function setCookie(ck: Ck, name: string, val: string, maxAge: number) {
  ck.push(`${name}=${encodeURIComponent(val)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}
function setSession(ck: Ck, s: { access_token: string; refresh_token: string }) {
  setCookie(ck, C_ACCESS, s.access_token, 60 * 60 * 24 * 30);
  setCookie(ck, C_REFRESH, s.refresh_token, 60 * 60 * 24 * 30);
}
function clearSession(ck: Ck) { setCookie(ck, C_ACCESS, '', 0); setCookie(ck, C_REFRESH, '', 0); }
function anon() { return createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } }); }

async function getUser(req: Request, ck: Ck) {
  const t = readCookie(req, C_ACCESS);
  if (t) { const { data } = await db.auth.getUser(t); if (data?.user) return data.user; }
  const r = readCookie(req, C_REFRESH);
  if (!r) return null;
  const { data, error } = await anon().auth.refreshSession({ refresh_token: r });
  if (error || !data.session || !data.user) { clearSession(ck); return null; }
  setSession(ck, data.session);
  return data.user;
}
const ehAdmin = (u: { email?: string }) => ADMIN_EMAILS.includes((u.email ?? '').toLowerCase());
const nivelDe = (xp: number) => Math.floor(xp / 500) + 1;
const hojeISO = (d = new Date()) => new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10); // Brasília
const addDias = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const uuidOk = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);

// ---------- estrutura curricular ----------
// Filtro de conteúdo por curso/disciplina feito no banco (junção), sem listas de ids na URL.
const JOIN_CURSO = ',cx_assuntos!inner(disciplina_id,cx_disciplinas!inner(curso_id))';
const porCurso = (qb: any, curso: string) => qb.eq('cx_assuntos.cx_disciplinas.curso_id', curso);
const semJoin = (rows: any[] | null) => (rows ?? []).map(({ cx_assuntos: _j, ...r }: any) => r);
async function carregarEstrutura(curso: string, incluirNaoPublicado = false) {
  const { data: disc, error } = await db.from('cx_disciplinas')
    .select('id,nome,questoes,ordem,cx_assuntos(id,nome,ordem,cx_subassuntos(id,nome,ordem))')
    .eq('curso_id', curso).order('ordem');
  if (error) throw error;
  const cont: Record<string, Record<string, number>> = {};
  let qq = porCurso(db.from('cx_questoes').select('assunto_id' + JOIN_CURSO), curso);
  let qm = porCurso(db.from('cx_materiais').select('assunto_id,tipo' + JOIN_CURSO), curso);
  if (!incluirNaoPublicado) { qq = qq.eq('publicado', true); qm = qm.eq('publicado', true); }
  const [{ data: qs }, { data: ms }] = await Promise.all([qq, qm]);
  (qs ?? []).forEach((q: any) => { (cont[q.assunto_id] ??= {}).questoes = (cont[q.assunto_id].questoes ?? 0) + 1; });
  (ms ?? []).forEach((m: any) => { (cont[m.assunto_id] ??= {})[m.tipo] = (cont[m.assunto_id][m.tipo] ?? 0) + 1; });
  const ord = (a: any, b: any) => a.ordem - b.ordem || String(a.nome).localeCompare(b.nome);
  return (disc ?? []).map((d: any) => ({
    id: d.id, nome: d.nome, questoes: d.questoes,
    assuntos: (d.cx_assuntos ?? []).sort(ord).map((a: any) => ({
      id: a.id, nome: a.nome,
      subassuntos: (a.cx_subassuntos ?? []).sort(ord).map((s: any) => ({ id: s.id, nome: s.nome })),
      conteudo: cont[a.id] ?? {},
    })),
  }));
}
async function assuntosDoCurso(curso: string) {
  const { data } = await db.from('cx_assuntos').select('id,nome,disciplina_id,cx_disciplinas!inner(nome,curso_id)').eq('cx_disciplinas.curso_id', curso);
  return (data ?? []).map((a: any) => ({ id: a.id, nome: a.nome, disciplina_id: a.disciplina_id, disciplina: a.cx_disciplinas.nome }));
}
async function cursoValido(c: unknown) {
  if (typeof c !== 'string' || !c) return false;
  const { data } = await db.from('cx_cursos').select('id').eq('id', c).eq('ativo', true).maybeSingle();
  return !!data;
}

// ---------- banco de questões: metadados, estatísticas, cobertura ----------
const BANCA_ALVO: Record<string, string> = { 'pm-sp-soldado': 'VUNESP', 'gcm-geral': 'VUNESP' };
const CARGO_CURSO: Record<string, string> = { 'pm-sp-soldado': 'Soldado PM 2ª Classe', 'gcm-geral': 'Guarda Civil Municipal' };
const ANO_RECENTE = 2022;
const STATUS_Q = ['publicada', 'revisao', 'desatualizada', 'anulada', 'duplicada'];
const NIVEIS = ['Fundamental', 'Médio', 'Técnico', 'Superior', 'Específico'];
const COLS_Q = 'id,assunto_id,subassunto_id,enunciado,opcoes,banca,ano,orgao,dificuldade,tipo,cargo,banca_ref,concurso,numero_questao,nivel,nivel_compat,fonte,origem,lei_relacionada,juris_relacionada,legislacao_considerada,status,incluida_em';
const COLS_Q_ADMIN = COLS_Q + ',gabarito,comentario,motivo_status,publicado,arquivo_id,hash';
const normTxt = (s: string) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
async function sha1(s: string) {
  const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const hashQuestao = (enun: string, ops: string[]) => sha1(normTxt(enun) + '|' + ops.map(normTxt).join('|'));
const embaralhar = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
// PostgREST limita 1000 linhas por resposta: lê página a página.
async function todos(mk: (a: number, b: number) => any) {
  const out: any[] = [];
  for (let i = 0; i < 20; i++) {
    const { data, error } = await mk(i * 1000, i * 1000 + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
const questoesDoCurso = (curso: string, cols: string, soPublicadas = true) => todos((a, b) => {
  let qb = porCurso(db.from('cx_questoes').select(cols + JOIN_CURSO), curso);
  if (soPublicadas) qb = qb.eq('publicado', true).eq('status', 'publicada');
  return qb.order('id').range(a, b);
});
const diasEntre = (iso: string, hoje: string) => Math.max(0, Math.round((Date.parse(hoje + 'T12:00:00Z') - Date.parse(iso.slice(0, 10) + 'T12:00:00Z')) / 86400000));

// Estatísticas por assunto: banco (reais/autorais/banca-alvo/recentes) + desempenho do aluno + prioridade adaptativa.
async function insightsAssuntos(curso: string, uid: string) {
  const alvo = BANCA_ALVO[curso] ?? '';
  const hoje = hojeISO();
  const [est, qs, tent, revs, dom] = await Promise.all([
    carregarEstrutura(curso),
    questoesDoCurso(curso, 'id,assunto_id,tipo,banca_ref,ano,nivel_compat'),
    todos((a, b) => db.from('cx_tentativas').select('questao_id,correta,criado_em,cx_questoes!inner(assunto_id,cx_assuntos!inner(cx_disciplinas!inner(curso_id)))').eq('user_id', uid).eq('cx_questoes.cx_assuntos.cx_disciplinas.curso_id', curso).order('criado_em').range(a, b)),
    db.from('cx_revisoes').select('assunto_id,vence_em').eq('user_id', uid).is('feita_em', null).lte('vence_em', hoje).then((r: any) => r.data ?? []),
    db.from('cx_dominio').select('assunto_id,nivel,atualizado_em').eq('user_id', uid).then((r: any) => r.data ?? []),
  ]);
  const compat = qs.filter((x: any) => x.nivel_compat === 'Compatível');
  const reaisCurso = compat.filter((x: any) => x.tipo === 'real');
  const porA: Record<string, any> = {};
  est.forEach((d: any) => d.assuntos.forEach((a: any) => {
    porA[a.id] = { assunto_id: a.id, assunto: a.nome, disciplina_id: d.id, disciplina: d.nome, peso_disc: d.questoes ?? 0, n_assuntos_disc: d.assuntos.length,
      reais: 0, autorais: 0, reais_alvo: 0, recentes: 0, total: 0, nao_compat: 0, tentativas: 0, acertos: 0, ultima: null as string | null, revisoes_pendentes: 0, dominio: 0, anos: [] as number[] };
  }));
  qs.forEach((x: any) => {
    const s = porA[x.assunto_id]; if (!s) return;
    if (x.nivel_compat !== 'Compatível') { s.nao_compat++; return; }
    s.total++;
    if (x.tipo === 'real') { s.reais++; if (x.banca_ref === alvo) s.reais_alvo++; if ((x.ano ?? 0) >= ANO_RECENTE) s.recentes++; if (x.ano) s.anos.push(x.ano); } else s.autorais++;
  });
  const ultimaPorQ: Record<string, any> = {};
  tent.forEach((t: any) => { ultimaPorQ[t.questao_id] = t; const s = porA[t.cx_questoes?.assunto_id]; if (!s) return; s.tentativas++; if (t.correta) s.acertos++; if (!s.ultima || t.criado_em > s.ultima) s.ultima = t.criado_em; });
  const erradasPorA: Record<string, number> = {};
  Object.values(ultimaPorQ).forEach((t: any) => { if (!t.correta) { const a = t.cx_questoes?.assunto_id; erradasPorA[a] = (erradasPorA[a] ?? 0) + 1; } });
  revs.forEach((r: any) => { if (porA[r.assunto_id]) porA[r.assunto_id].revisoes_pendentes++; });
  dom.forEach((d: any) => { const s = porA[d.assunto_id]; if (s) { s.dominio = d.nivel; if (d.atualizado_em && (!s.ultima || d.atualizado_em > s.ultima)) s.ultima = d.atualizado_em; } });
  const arr = Object.values(porA);
  const totReais = reaisCurso.length;
  const maxPeso = Math.max(0.0001, ...arr.map((s: any) => s.peso_disc / Math.max(1, s.n_assuntos_disc)));
  const maxInc = Math.max(0.0001, ...arr.map((s: any) => totReais ? s.reais / totReais : 0));
  arr.forEach((s: any) => {
    s.incidencia_pct = totReais ? Math.round((s.reais / totReais) * 1000) / 10 : null;
    s.peso_edital = Math.round((s.peso_disc / Math.max(1, s.n_assuntos_disc)) * 100) / 100;
    s.acerto_pct = s.tentativas ? Math.round((s.acertos / s.tentativas) * 100) : null;
    s.erradas = erradasPorA[s.assunto_id] ?? 0;
    s.dias_sem_estudo = s.ultima ? diasEntre(s.ultima, hoje) : null;
    const falha = s.tentativas ? 1 - (s.acertos + 1) / (s.tentativas + 2) : 0.5;
    const tempo = s.dias_sem_estudo === null ? 1 : Math.min(1, s.dias_sem_estudo / 30);
    const inc = totReais ? s.reais / totReais / maxInc : (s.peso_disc / Math.max(1, s.n_assuntos_disc)) / maxPeso;
    s.prioridade = Math.round(100 * (0.35 * inc + 0.25 * (s.peso_edital / maxPeso) + 0.25 * falha + 0.15 * tempo));
    const m: string[] = [];
    if (s.tentativas >= 3 && s.acerto_pct !== null && s.acerto_pct < 60) m.push(`${s.acerto_pct}% de acertos`);
    if (s.incidencia_pct !== null && s.incidencia_pct >= 3) m.push(`alta incidência na banca (${s.incidencia_pct}% das questões reais)`);
    if (s.erradas >= 2) m.push(`${s.erradas} questões erradas`);
    if (s.revisoes_pendentes) m.push('revisão atrasada');
    if (s.dias_sem_estudo !== null && s.dias_sem_estudo >= 14) m.push(`${s.dias_sem_estudo} dias sem estudar`);
    if (s.dias_sem_estudo === null) m.push('ainda não estudado');
    if (s.peso_edital >= maxPeso * 0.8) m.push('alto peso no edital');
    s.motivos = m;
    delete s.anos;
  });
  return { assuntos: arr, banca_alvo: alvo, total_reais: totReais, total_questoes: qs.length };
}

// Cobertura do banco por assunto (visão do administrador): faixas 🟢🟡🔴 e sinalizações.
async function coberturaBanco(curso: string) {
  const alvo = BANCA_ALVO[curso] ?? '';
  const [est, qs] = await Promise.all([carregarEstrutura(curso, true), questoesDoCurso(curso, 'id,assunto_id,tipo,banca_ref,ano,nivel_compat,nivel,dificuldade,status,publicado', false)]);
  const pub = qs; // inclui todos os status, filtrados abaixo
  const porA: Record<string, any> = {};
  est.forEach((d: any) => d.assuntos.forEach((a: any) => { porA[a.id] = { curso, disciplina: d.nome, assunto: a.nome, assunto_id: a.id, subassuntos: a.subassuntos.length, reais: 0, autorais: 0, reais_alvo: 0, recentes: 0, total: 0, em_revisao: 0, desatualizadas: 0, nao_compat: 0 }; }));
  const curTemReais = qs.some((x: any) => x.tipo === 'real');
  pub.forEach((x: any) => {
    const s = porA[x.assunto_id]; if (!s) return;
    if (x.status === 'revisao') { s.em_revisao++; return; }
    if (x.status === 'desatualizada') { s.desatualizadas++; return; }
    if (x.status !== 'publicada' || !x.publicado) return;
    if (x.nivel_compat !== 'Compatível') { s.nao_compat++; return; }
    s.total++;
    if (x.tipo === 'real') { s.reais++; if (x.banca_ref === alvo) s.reais_alvo++; if ((x.ano ?? 0) >= ANO_RECENTE) s.recentes++; } else s.autorais++;
  });
  const linhas = Object.values(porA).map((s: any) => {
    const f: string[] = [];
    if (s.total === 0) f.push('sem_questoes'); else if (s.total < 6) f.push('poucas');
    if (s.total > 60) f.push('excesso');
    if (curTemReais && s.reais_alvo === 0) f.push('sem_banca_alvo');
    if (curTemReais && s.reais > 0 && s.recentes === 0) f.push('sem_recente');
    if (s.total === 0 && s.nao_compat > 0) f.push('sem_nivel_adequado');
    if (s.total < 12 || (curTemReais && s.reais < 3)) f.push('precisa_complemento_autoral');
    const faixa = s.total < 6 ? 'vermelho' : (s.total >= 12 && (!curTemReais || s.reais_alvo >= 3)) ? 'verde' : 'amarelo';
    return { ...s, flags: f, faixa };
  });
  return { banca_alvo: alvo, tem_reais: curTemReais, linhas };
}

// Resumo do edital por curso (ex.: "100% disciplinas · 94% assuntos com questões · 78% banca-alvo").
function resumoEdital(cob: any, est: any[]) {
  const L = cob.linhas; const nA = L.length || 1;
  const discComQ = new Set(L.filter((l: any) => l.total > 0).map((l: any) => l.disciplina));
  const comQ = L.filter((l: any) => l.total > 0).length;
  const comAlvo = L.filter((l: any) => l.reais_alvo > 0).length;
  return {
    disciplinas: est.length, disciplinas_com_questoes_pct: Math.round(100 * discComQ.size / Math.max(1, est.length)),
    assuntos: L.length, assuntos_com_questoes_pct: Math.round(100 * comQ / nA),
    assuntos_banca_alvo_pct: cob.tem_reais ? Math.round(100 * comAlvo / nA) : null,
    assuntos_precisam_complemento: L.filter((l: any) => l.flags.includes('precisa_complemento_autoral')).length,
    verde: L.filter((l: any) => l.faixa === 'verde').length, amarelo: L.filter((l: any) => l.faixa === 'amarelo').length, vermelho: L.filter((l: any) => l.faixa === 'vermelho').length,
  };
}
// Resolve assunto/subassunto por nome dentro do curso e grava questões com deduplicação por hash.
async function gravarQuestoes(curso: string, lote: any[], padrao: any = {}) {
  const est = await carregarEstrutura(curso, true);
  const idx: Record<string, any> = {};
  est.forEach((d: any) => d.assuntos.forEach((a: any) => { idx[d.nome + '||' + a.nome] = { id: a.id, subs: Object.fromEntries(a.subassuntos.map((s: any) => [s.nome, s.id])) }; }));
  const existentes = new Set((await todos((a, b) => db.from('cx_questoes').select('hash').not('hash', 'is', null).order('hash').range(a, b))).map((r: any) => r.hash));
  const rows: any[] = []; const rej: string[] = []; let dup = 0;
  for (const q of lote) {
    const a = idx[q.disciplina + '||' + q.assunto];
    if (!a) { rej.push(`assunto não encontrado: ${q.disciplina} / ${q.assunto}`); continue; }
    if (!q.enunciado || !Array.isArray(q.opcoes) || q.opcoes.length !== 5 || !Number.isInteger(q.gabarito) || q.gabarito < 0 || q.gabarito > 4) { rej.push(`questão inválida: ${String(q.enunciado ?? '').slice(0, 40)}`); continue; }
    const h = await hashQuestao(String(q.enunciado), q.opcoes.map(String));
    if (existentes.has(h)) { dup++; continue; }
    existentes.add(h);
    const status = STATUS_Q.includes(q.status) ? q.status : 'publicada';
    rows.push({
      assunto_id: a.id, subassunto_id: q.subassunto ? (a.subs[q.subassunto] ?? null) : null, enunciado: String(q.enunciado), opcoes: q.opcoes.map(String), gabarito: q.gabarito,
      comentario: q.comentario ?? null, banca: q.banca ?? padrao.banca ?? 'Bizu do Concurseiro X (inédita)', ano: q.ano ?? null, orgao: q.orgao ?? null,
      dificuldade: ['facil', 'media', 'dificil'].includes(q.dificuldade) ? q.dificuldade : null,
      tipo: q.tipo === 'real' ? 'real' : 'autoral', cargo: q.cargo ?? CARGO_CURSO[curso] ?? null, banca_ref: q.banca_ref ?? BANCA_ALVO[curso] ?? null, concurso: q.concurso ?? null,
      numero_questao: q.numero_questao ?? null, nivel: NIVEIS.includes(q.nivel) ? q.nivel : 'Médio', nivel_compat: ['Compatível', 'Abaixo', 'Acima'].includes(q.nivel_compat) ? q.nivel_compat : 'Compatível',
      fonte: q.fonte ?? null, origem: q.origem ?? null, arquivo_id: q.arquivo_id ?? null, lei_relacionada: q.lei_relacionada ?? null, juris_relacionada: q.juris_relacionada ?? null,
      legislacao_considerada: q.legislacao_considerada ?? null, status, motivo_status: q.motivo_status ?? null, publicado: status === 'publicada' && q.publicado !== false, hash: h,
    });
  }
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from('cx_questoes').insert(rows.slice(i, i + 100));
    if (error) throw new Error('Erro ao gravar questões: ' + error.message);
  }
  return { inseridas: rows.length, duplicadas: dup, rejeitadas: rej };
}
const limparSim = (s: any) => ({
  titulo: String(s.titulo ?? '').trim().slice(0, 200), cargo: s.cargo ? String(s.cargo).slice(0, 120) : null, banca: s.banca ? String(s.banca).slice(0, 80) : null,
  ano: s.ano ? String(s.ano).slice(0, 20) : null, tipo: s.tipo ? String(s.tipo).slice(0, 40) : 'Prova real',
  prova_url: s.prova_url ? String(s.prova_url).slice(0, 600) : null, gabarito_url: s.gabarito_url ? String(s.gabarito_url).slice(0, 600) : null,
  comentario_url: s.comentario_url ? String(s.comentario_url).slice(0, 600) : null, descricao: s.descricao ? String(s.descricao).slice(0, 600) : null,
  publicado: s.publicado === true, ordem: Number.isInteger(s.ordem) ? s.ordem : 0,
});

// ---------- cronômetro ----------
function liquido(s: any, agora = Date.now()) {
  const fim = s.fim ? Date.parse(s.fim) : agora;
  let pausa = s.pausas_s ?? 0;
  if (s.pausado_em && !s.fim) pausa += Math.floor((agora - Date.parse(s.pausado_em)) / 1000);
  return Math.max(0, Math.min(TETO_SESSAO_S, Math.floor((fim - Date.parse(s.inicio)) / 1000) - pausa));
}

// ---------- roteador ----------
Deno.serve(async (req) => {
  const ck: Ck = [];
  const res = await handle(req, ck);
  ck.forEach((c) => res.headers.append('set-cookie', c));
  return res;
});

async function handle(req: Request, ck: Ck): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/cx-api/, '') || '/';
  const q = url.searchParams;
  let body: any = {};
  if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }

  try {
    // ----- públicas -----
    if (path === '/health') return json({ ok: true, projeto: 'bizu-concurseiro-x' });
    if (path === '/login' && req.method === 'POST') {
      const { data, error } = await anon().auth.signInWithPassword({ email: String(body.email ?? '').trim(), password: String(body.password ?? '') });
      if (error || !data.session) return fail('E-mail ou senha incorretos', 401);
      setSession(ck, data.session);
      await db.from('cx_perfis').upsert({ user_id: data.user.id }, { onConflict: 'user_id', ignoreDuplicates: true });
      return json({ ok: true });
    }
    if (path === '/logout') { clearSession(ck); return json({ ok: true }); }
    if (path === '/password/recover' && req.method === 'POST') {
      await anon().auth.resetPasswordForEmail(String(body.email ?? '').trim(), { redirectTo: body.redirect_to });
      return json({ ok: true });
    }
    if (path === '/password/redefinir' && req.method === 'POST') {
      const { data } = await db.auth.getUser(String(body.access_token ?? ''));
      if (!data?.user) return fail('Link de recuperação inválido ou expirado.', 401);
      if (String(body.password ?? '').length < 6) return fail('A senha deve ter no mínimo 6 caracteres.');
      const { error } = await db.auth.admin.updateUserById(data.user.id, { password: body.password });
      if (error) return fail('Não foi possível salvar a nova senha.');
      return json({ ok: true });
    }

    // ----- autenticadas -----
    const user = await getUser(req, ck);
    if (!user) return fail('Sessão expirada. Entre novamente.', 401);
    const uid = user.id;
    const admin = ehAdmin(user);

    if (path === '/session') return json({ user: { id: uid, email: user.email }, admin });

    if (path === '/bootstrap') {
      await db.from('cx_perfis').upsert({ user_id: uid }, { onConflict: 'user_id', ignoreDuplicates: true });
      const [{ data: perfil }, { data: cursos }, { data: tent }] = await Promise.all([
        db.from('cx_perfis').select('nome,curso_id,xp').eq('user_id', uid).maybeSingle(),
        db.from('cx_cursos').select('id,nome,banca,edital_ref,redacao_formato,fontes').eq('ativo', true).order('ordem'),
        db.from('cx_tentativas').select('correta').eq('user_id', uid),
      ]);
      const total = tent?.length ?? 0, acertos = (tent ?? []).filter((t: any) => t.correta).length;
      const xp = perfil?.xp ?? 0;
      return json({
        profile: { full_name: perfil?.nome ?? (user.user_metadata as any)?.full_name ?? null, email: user.email },
        curso_id: perfil?.curso_id ?? cursos?.[0]?.id ?? null,
        cursos: cursos ?? [], admin,
        metrics: { questions: total, accuracy: total ? (acertos / total) * 100 : 0, xp, nivel: nivelDe(xp) },
      });
    }
    if (path === '/perfil' && req.method === 'POST') {
      const upd: any = { user_id: uid };
      if (body.curso_id !== undefined) { if (!(await cursoValido(body.curso_id))) return fail('Curso inválido'); upd.curso_id = body.curso_id; }
      if (typeof body.nome === 'string') upd.nome = body.nome.trim().slice(0, 120);
      await db.from('cx_perfis').upsert(upd, { onConflict: 'user_id' });
      return json({ ok: true });
    }
    if (path === '/senha/alterar' && req.method === 'POST') {
      if (String(body.password ?? '').length < 6) return fail('A senha deve ter no mínimo 6 caracteres.');
      const { error } = await db.auth.admin.updateUserById(uid, { password: body.password });
      if (error) return fail('Não foi possível alterar a senha.');
      return json({ ok: true });
    }

    // ----- estrutura, busca -----
    const curso = q.get('curso') ?? body.curso_id ?? '';
    if (path === '/estrutura') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      return json({ curso, disciplinas: await carregarEstrutura(curso), tipos: ['questoes', ...TIPOS_MATERIAL] });
    }
    if (path === '/busca') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const termo = (q.get('q') ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (termo.length < 2) return json({ resultados: [] });
      const est = await carregarEstrutura(curso);
      const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const res: any[] = [];
      est.forEach((d: any) => {
        if (n(d.nome).includes(termo)) res.push({ nivel: 'disciplina', disciplina_id: d.id, disciplina: d.nome });
        d.assuntos.forEach((a: any) => {
          if (n(a.nome).includes(termo)) res.push({ nivel: 'assunto', disciplina_id: d.id, disciplina: d.nome, assunto_id: a.id, assunto: a.nome });
          a.subassuntos.forEach((s: any) => { if (n(s.nome).includes(termo)) res.push({ nivel: 'subassunto', disciplina_id: d.id, disciplina: d.nome, assunto_id: a.id, assunto: a.nome, subassunto_id: s.id, subassunto: s.nome }); });
        });
      });
      return json({ resultados: res.slice(0, 60) });
    }

    // ----- questões -----
    // Seleção de questões do aluno: filtros do banco + estado do aluno + prioridade. Devolve só o que está publicado e atualizado.
    async function selecionarQuestoes(curso: string, p: URLSearchParams, opt: { pesoAssunto?: Record<string, number>; apenasIds?: Set<string>; qtd?: number } = {}) {
      const alvo = BANCA_ALVO[curso] ?? '';
      const cols = 'id,assunto_id,subassunto_id,tipo,banca_ref,banca,ano,dificuldade,nivel,nivel_compat,cargo';
      const rows = await todos((a, b) => {
        let qb = porCurso(db.from('cx_questoes').select(cols + JOIN_CURSO).eq('publicado', true).eq('status', 'publicada'), curso);
        if (uuidOk(p.get('disciplina_id'))) qb = qb.eq('cx_assuntos.disciplina_id', p.get('disciplina_id'));
        if (uuidOk(p.get('assunto_id'))) qb = qb.eq('assunto_id', p.get('assunto_id'));
        if (uuidOk(p.get('subassunto_id'))) qb = qb.eq('subassunto_id', p.get('subassunto_id'));
        if (p.get('banca')) qb = qb.eq('banca_ref', p.get('banca'));
        if (p.get('cargo')) qb = qb.eq('cargo', p.get('cargo'));
        if (parseInt(p.get('ano') ?? '')) qb = qb.eq('ano', parseInt(p.get('ano')!));
        if (NIVEIS.includes(p.get('nivel') ?? '')) qb = qb.eq('nivel', p.get('nivel'));
        const tipo = p.get('tipo') ?? p.get('origem'); if (tipo === 'real' || tipo === 'autoral') qb = qb.eq('tipo', tipo);
        if (['facil', 'media', 'dificil'].includes(p.get('dificuldade') ?? '')) qb = qb.eq('dificuldade', p.get('dificuldade'));
        if ((p.get('compat') ?? 'compativeis') !== 'todas') qb = qb.eq('nivel_compat', 'Compatível');
        const termo = (p.get('q') ?? '').trim().replace(/[%,()]/g, ' ').slice(0, 80);
        if (termo.length >= 3) qb = qb.ilike('enunciado', `%${termo}%`);
        return qb.order('id').range(a, b);
      });
      let cand = rows as any[];
      const estado = p.get('estado') ?? '';
      let ultima: Record<string, boolean> = {};
      const { data: tentAll } = await db.from('cx_tentativas').select('questao_id,correta,criado_em').eq('user_id', uid).order('criado_em').limit(20000);
      (tentAll ?? []).forEach((t: any) => { ultima[t.questao_id] = t.correta; });
      if (estado === 'nao_respondidas') cand = cand.filter((x) => !(x.id in ultima));
      else if (estado === 'erradas') cand = cand.filter((x) => ultima[x.id] === false);
      else if (estado === 'acertadas') cand = cand.filter((x) => ultima[x.id] === true);
      else if (estado === 'salvas') {
        const { data: sv } = await db.from('cx_questoes_salvas').select('questao_id').eq('user_id', uid);
        const s = new Set((sv ?? []).map((r: any) => r.questao_id)); cand = cand.filter((x) => s.has(x.id));
      }
      if (opt.apenasIds) cand = cand.filter((x) => opt.apenasIds!.has(x.id));
      const limite = Math.min(100, opt.qtd ?? (parseInt(p.get('limit') ?? '') || 10));
      const ordem = p.get('ordem') ?? 'aleatoria';
      let esc: any[];
      if (opt.pesoAssunto || ordem === 'prioridade') {
        // pontuação: peso do assunto × (não respondida) × (mesma banca > outra banca > autoral) × ruído; teto por assunto para diversificar
        const w = opt.pesoAssunto ?? {};
        const pts = cand.map((x) => ({ x, s: (w[x.assunto_id] ?? 1) * (x.id in ultima ? (ultima[x.id] ? 0.35 : 1.2) : 1) * (x.tipo === 'real' ? (x.banca_ref === alvo ? 1.3 : 1) : 0.8) * (0.7 + Math.random() * 0.6) }));
        pts.sort((a, b) => b.s - a.s);
        const teto = Math.max(2, Math.ceil(limite * 0.35)); const cont: Record<string, number> = {}; esc = [];
        for (const e of pts) { const k = e.x.assunto_id; if ((cont[k] ?? 0) >= teto) continue; cont[k] = (cont[k] ?? 0) + 1; esc.push(e.x); if (esc.length >= limite) break; }
        if (esc.length < limite) { const ja = new Set(esc.map((z) => z.id)); for (const e of pts) { if (!ja.has(e.x.id)) { esc.push(e.x); if (esc.length >= limite) break; } } }
      } else if (ordem === 'recentes') esc = [...cand].sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0)).slice(0, limite);
      else esc = embaralhar(cand).slice(0, limite);
      const ids = esc.map((x) => x.id);
      let full: any[] = [];
      if (ids.length) { const { data } = await db.from('cx_questoes').select(COLS_Q + ',cx_assuntos(nome,cx_disciplinas(nome))').in('id', ids); full = data ?? []; }
      const { data: sv2 } = ids.length ? await db.from('cx_questoes_salvas').select('questao_id').eq('user_id', uid).in('questao_id', ids) : { data: [] as any[] };
      const savedSet = new Set((sv2 ?? []).map((r: any) => r.questao_id));
      const byId: Record<string, any> = {}; full.forEach((f) => byId[f.id] = f);
      const out = ids.map((id) => byId[id]).filter(Boolean).map((f: any) => {
        const { cx_assuntos: a, status: _s, ...r } = f;
        return { ...r, assunto: a?.nome ?? null, disciplina: a?.cx_disciplinas?.nome ?? null, salva: savedSet.has(r.id), ultima: r.id in ultima ? ultima[r.id] : null, banca_alvo: r.banca_ref === alvo, rotulo: r.tipo === 'real' ? 'QUESTÃO REAL' : 'QUESTÃO AUTORAL' };
      });
      return { questoes: out, candidatas: cand.length };
    }
    if (path === '/questoes') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const r = await selecionarQuestoes(curso, q);
      return json({ ...r, banca_alvo: BANCA_ALVO[curso] ?? null });
    }
    // Opções dos filtros (contagens por banca, ano, cargo, nível, origem) para o curso.
    if (path === '/questoes/filtros') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const rows = await questoesDoCurso(curso, 'id,tipo,banca_ref,ano,cargo,nivel,nivel_compat,dificuldade');
      const c = (k: string, f: (x: any) => any = (x) => x[k]) => { const m: Record<string, number> = {}; rows.forEach((x: any) => { const v = f(x); if (v !== null && v !== undefined && v !== '') m[String(v)] = (m[String(v)] ?? 0) + 1; }); return m; };
      return json({ total: rows.length, banca_alvo: BANCA_ALVO[curso] ?? null, bancas: c('banca_ref'), anos: c('ano'), cargos: c('cargo'), niveis: c('nivel'), origem: c('tipo'), dificuldades: c('dificuldade'), compat: c('nivel_compat') });
    }
    // Indicadores por assunto (banco + desempenho do aluno + prioridade): alimenta "O que estudar" e o cronograma.
    if (path === '/banco/insights') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      return json(await insightsAssuntos(curso, uid));
    }
    // GERAR TREINO: monta o treino conforme o objetivo (edital, banca, nível, incidência, desempenho, erros, não estudados, baixa cobertura, revisões).
    if (path === '/treino') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const modo = q.get('modo') ?? 'edital'; const qtd = Math.min(100, Math.max(5, parseInt(q.get('qtd') ?? '20') || 20));
      const ins = await insightsAssuntos(curso, uid); const A = ins.assuntos as any[];
      const peso: Record<string, number> = {}; let desc = ''; let apenas: Set<string> | undefined; const p2 = new URLSearchParams(q); let aviso: string | null = null;
      const maxPeso = Math.max(0.0001, ...A.map((a) => a.peso_edital));
      if (modo === 'edital') { A.forEach((a) => peso[a.assunto_id] = 0.2 + a.peso_edital / maxPeso); desc = 'Distribuição proporcional ao peso das disciplinas no edital.'; }
      else if (modo === 'banca') { p2.set('tipo', 'real'); A.forEach((a) => peso[a.assunto_id] = 0.2 + a.reais_alvo); desc = `Questões reais da banca-alvo (${ins.banca_alvo}), priorizando o que mais cai.`; if (!ins.total_reais) { p2.delete('tipo'); aviso = `Este curso ainda não tem provas reais da banca ${ins.banca_alvo || 'alvo'} no banco: o treino usa questões autorais com banca de referência ${ins.banca_alvo}.`; } }
      else if (modo === 'nivel') { A.forEach((a) => peso[a.assunto_id] = 1); desc = 'Somente questões compatíveis com o nível do cargo (Médio).'; }
      else if (modo === 'incidencia') { A.forEach((a) => peso[a.assunto_id] = 0.1 + (a.incidencia_pct ?? a.peso_edital)); desc = 'Assuntos que mais caem nas provas reais.'; }
      else if (modo === 'desempenho') { A.forEach((a) => peso[a.assunto_id] = 0.2 + (a.tentativas ? 1 - a.acertos / a.tentativas : 0.5) * 3); desc = 'Assuntos em que seu índice de acertos é menor.'; }
      else if (modo === 'erros') { p2.set('estado', 'erradas'); A.forEach((a) => peso[a.assunto_id] = 1 + a.erradas); desc = 'Questões que você errou na última tentativa.'; }
      else if (modo === 'nao_estudados') { A.forEach((a) => peso[a.assunto_id] = a.tentativas === 0 && a.dominio === 0 ? 3 : 0.1); desc = 'Assuntos ainda não estudados nem praticados.'; }
      else if (modo === 'baixa_cobertura') { A.forEach((a) => peso[a.assunto_id] = a.tentativas === 0 ? 3 : 3 / (1 + a.tentativas / Math.max(1, a.total) * 5)); desc = 'Assuntos em que você respondeu pouco do que o banco oferece.'; }
      else if (modo === 'revisoes') { A.forEach((a) => peso[a.assunto_id] = a.revisoes_pendentes ? 4 : 0.05); desc = 'Assuntos com revisões pendentes (24h, 7 dias, 30 dias).'; }
      else if (modo === 'adaptativo') { A.forEach((a) => peso[a.assunto_id] = 0.1 + a.prioridade / 25); desc = 'Prioridade = incidência na banca + peso no edital + desempenho + tempo sem revisar.'; }
      else return fail('Modo de treino inválido');
      const r = await selecionarQuestoes(curso, p2, { pesoAssunto: peso, apenasIds: apenas, qtd });
      return json({ modo, descricao: desc, aviso, banca_alvo: ins.banca_alvo, ...r });
    }
    if (path === '/responder' && req.method === 'POST') {
      if (!uuidOk(body.questao_id)) return fail('Questão inválida');
      const { data: qt } = await db.from('cx_questoes').select('id,gabarito,comentario,assunto_id,lei_relacionada,juris_relacionada,legislacao_considerada,tipo,origem,fonte').eq('id', body.questao_id).eq('publicado', true).maybeSingle();
      if (!qt) return fail('Questão não encontrada', 404);
      const correta = Number(body.resposta) === qt.gabarito;
      await db.from('cx_tentativas').insert({ user_id: uid, questao_id: qt.id, resposta: Number(body.resposta), correta });
      const { data: p } = await db.from('cx_perfis').select('xp').eq('user_id', uid).maybeSingle();
      await db.from('cx_perfis').upsert({ user_id: uid, xp: (p?.xp ?? 0) + (correta ? 10 : 2) }, { onConflict: 'user_id' });
      const hoje = hojeISO();
      await db.from('cx_revisoes').upsert([
        { user_id: uid, assunto_id: qt.assunto_id, tipo: '24h', vence_em: addDias(hoje, 1) },
        { user_id: uid, assunto_id: qt.assunto_id, tipo: '7dias', vence_em: addDias(hoje, 7) },
        { user_id: uid, assunto_id: qt.assunto_id, tipo: '30dias', vence_em: addDias(hoje, 30) },
      ], { onConflict: 'user_id,assunto_id,tipo', ignoreDuplicates: true });
      return json({ correta, gabarito: qt.gabarito, comentario: qt.comentario, lei_relacionada: qt.lei_relacionada, juris_relacionada: qt.juris_relacionada, legislacao_considerada: qt.legislacao_considerada, tipo: qt.tipo, origem: qt.origem, fonte: qt.fonte });
    }
    if (path === '/questoes/salvas') {
      const { data } = await db.from('cx_questoes_salvas').select('criado_em,cx_questoes(id,enunciado,opcoes,assunto_id,banca,banca_ref,ano,tipo,concurso,origem,nivel,nivel_compat)').eq('user_id', uid).order('criado_em', { ascending: false });
      return json({ questoes: (data ?? []).map((r: any) => r.cx_questoes).filter(Boolean) });
    }
    if (path === '/questoes/salvar' && req.method === 'POST') {
      if (!uuidOk(body.questao_id)) return fail('Questão inválida');
      if (body.salvar === false) await db.from('cx_questoes_salvas').delete().eq('user_id', uid).eq('questao_id', body.questao_id);
      else await db.from('cx_questoes_salvas').upsert({ user_id: uid, questao_id: body.questao_id });
      return json({ ok: true });
    }

    // ----- materiais (PDF, aulas, flashcards, mapas, lei seca, jurisprudência, revisões) -----
    if (path === '/materiais') {
      const tipo = q.get('tipo') ?? '';
      if (!TIPOS_MATERIAL.includes(tipo)) return fail('Tipo de material inválido');
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      let qb = porCurso(db.from('cx_materiais').select('id,assunto_id,subassunto_id,tipo,titulo,conteudo,url,fonte_oficial' + JOIN_CURSO).eq('publicado', true).eq('tipo', tipo), curso);
      if (uuidOk(q.get('disciplina_id'))) qb = qb.eq('cx_assuntos.disciplina_id', q.get('disciplina_id'));
      if (uuidOk(q.get('assunto_id'))) qb = qb.eq('assunto_id', q.get('assunto_id'));
      if (uuidOk(q.get('subassunto_id'))) qb = qb.eq('subassunto_id', q.get('subassunto_id'));
      const { data } = await qb.limit(200);
      return json({ materiais: semJoin(data) });
    }

    // ----- desempenho -----
    if (path === '/desempenho') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const as = await assuntosDoCurso(curso);
      const porAssunto: Record<string, any> = {};
      as.forEach((a) => porAssunto[a.id] = a);
      const { data: tent } = await db.from('cx_tentativas').select('correta,criado_em,cx_questoes(assunto_id)').eq('user_id', uid);
      const por_disciplina: Record<string, { acertos: number; total: number }> = {};
      const por_assunto: Record<string, { assunto: string; disciplina: string; acertos: number; total: number }> = {};
      (tent ?? []).forEach((t: any) => {
        const a = porAssunto[t.cx_questoes?.assunto_id]; if (!a) return;
        const d = (por_disciplina[a.disciplina] ??= { acertos: 0, total: 0 }); d.total++; if (t.correta) d.acertos++;
        const x = (por_assunto[a.id] ??= { assunto: a.nome, disciplina: a.disciplina, acertos: 0, total: 0 }); x.total++; if (t.correta) x.acertos++;
      });
      const { data: sess } = await db.from('cx_sessoes').select('inicio,fim,pausado_em,pausas_s,liquido_s,disciplina_id').eq('user_id', uid).eq('curso_id', curso);
      const tempo_s = (sess ?? []).reduce((acc: number, s: any) => acc + (s.liquido_s ?? liquido(s)), 0);
      return json({ por_disciplina, por_assunto, tempo_s });
    }

    // ----- revisões -----
    if (path === '/revisoes') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const as = await assuntosDoCurso(curso); const mapa: Record<string, any> = {}; as.forEach((a) => mapa[a.id] = a);
      const hoje = hojeISO();
      const { data } = await db.from('cx_revisoes').select('id,assunto_id,tipo,vence_em').eq('user_id', uid).is('feita_em', null).lte('vence_em', addDias(hoje, 7)).order('vence_em');
      const revs = (data ?? []).filter((r: any) => mapa[r.assunto_id]).map((r: any) => ({ ...r, assunto: mapa[r.assunto_id].nome, disciplina: mapa[r.assunto_id].disciplina, disciplina_id: mapa[r.assunto_id].disciplina_id, vencida: r.vence_em < hoje, hoje: r.vence_em === hoje }));
      return json({ revisoes: revs, total: revs.filter((r: any) => r.vence_em <= hoje).length });
    }
    if (path === '/revisoes/feita' && req.method === 'POST') {
      if (!uuidOk(body.id)) return fail('Revisão inválida');
      await db.from('cx_revisoes').update({ feita_em: new Date().toISOString() }).eq('id', body.id).eq('user_id', uid);
      return json({ ok: true });
    }

    // ----- domínio -----
    if (path === '/dominio' && req.method === 'GET') {
      const { data } = await db.from('cx_dominio').select('assunto_id,nivel').eq('user_id', uid);
      const r: Record<string, number> = {}; (data ?? []).forEach((d: any) => r[d.assunto_id] = d.nivel);
      return json({ dominio: r });
    }
    if (path === '/dominio' && req.method === 'POST') {
      if (!uuidOk(body.assunto_id)) return fail('Assunto inválido');
      const nivel = Math.max(0, Math.min(4, parseInt(body.nivel) || 0));
      await db.from('cx_dominio').upsert({ user_id: uid, assunto_id: body.assunto_id, nivel, atualizado_em: new Date().toISOString() });
      return json({ ok: true });
    }

    // ----- meu resumo (anotações do aluno) -----
    if (path === '/notas' && req.method === 'GET') {
      if (uuidOk(q.get('assunto_id'))) {
        const { data } = await db.from('cx_notas').select('texto,atualizado_em').eq('user_id', uid).eq('assunto_id', q.get('assunto_id')).maybeSingle();
        return json({ nota: data });
      }
      const { data } = await db.from('cx_notas').select('assunto_id,atualizado_em,texto').eq('user_id', uid).order('atualizado_em', { ascending: false });
      return json({ notas: (data ?? []).map((n: any) => ({ ...n, texto: String(n.texto).slice(0, 160) })) });
    }
    if (path === '/notas' && req.method === 'POST') {
      if (!uuidOk(body.assunto_id)) return fail('Assunto inválido');
      await db.from('cx_notas').upsert({ user_id: uid, assunto_id: body.assunto_id, texto: String(body.texto ?? '').slice(0, 50000), atualizado_em: new Date().toISOString() });
      return json({ ok: true });
    }

    // ----- simulados (acervo de provas por link do Drive; não são montados a partir do banco de questões) -----
    if (path === '/simulados-drive') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const [{ data: sims }, { data: res }] = await Promise.all([
        db.from('cx_simulados_drive').select('id,titulo,cargo,banca,ano,tipo,prova_url,gabarito_url,comentario_url,descricao,ordem').eq('curso_id', curso).eq('publicado', true).order('ordem').order('titulo'),
        db.from('cx_simulado_resultados').select('id,simulado_id,acertos,total,tempo_min,obs,criado_em').eq('user_id', uid).order('criado_em', { ascending: false }).limit(300),
      ]);
      const ids = new Set((sims ?? []).map((s: any) => s.id));
      const hist = (res ?? []).filter((r: any) => ids.has(r.simulado_id));
      return json({ simulados: (sims ?? []).map((s: any) => ({ id: s.id, titulo: s.titulo, cargo: s.cargo, banca: s.banca, ano: s.ano, tipo: s.tipo, provaUrl: s.prova_url, gabaritoUrl: s.gabarito_url, comentarioUrl: s.comentario_url, descricao: s.descricao })), resultados: hist });
    }
    if (path === '/simulados-drive/resultado' && req.method === 'POST') {
      if (!uuidOk(body.simulado_id)) return fail('Simulado inválido');
      const { data: s } = await db.from('cx_simulados_drive').select('id').eq('id', body.simulado_id).eq('publicado', true).maybeSingle();
      if (!s) return fail('Simulado não encontrado', 404);
      const total = Math.max(1, Math.min(300, parseInt(body.total) || 0)), acertos = Math.max(0, Math.min(total, parseInt(body.acertos) || 0));
      const { data, error } = await db.from('cx_simulado_resultados').insert({ user_id: uid, simulado_id: s.id, acertos, total, tempo_min: parseInt(body.tempo_min) || null, obs: body.obs ? String(body.obs).slice(0, 500) : null }).select('id').single();
      if (error) return fail('Não foi possível registrar o resultado.');
      const { data: p } = await db.from('cx_perfis').select('xp').eq('user_id', uid).maybeSingle();
      await db.from('cx_perfis').upsert({ user_id: uid, xp: (p?.xp ?? 0) + Math.round(acertos / total * 50) }, { onConflict: 'user_id' });
      return json({ ok: true, id: data.id });
    }
    if (path === '/simulados-drive/resultado/excluir' && req.method === 'POST') {
      if (!uuidOk(body.id)) return fail('Resultado inválido');
      await db.from('cx_simulado_resultados').delete().eq('id', body.id).eq('user_id', uid);
      return json({ ok: true });
    }

    // ----- redação -----
    if (path === '/redacao/temas') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const { data } = await db.from('cx_redacao_temas').select('id,titulo,proposta,textos_apoio').eq('curso_id', curso).eq('publicado', true).order('criado_em', { ascending: false });
      return json({ temas: data ?? [] });
    }
    if (path === '/redacoes' && req.method === 'GET') {
      let qb = db.from('cx_redacoes').select('id,curso_id,tema_id,tema_livre,titulo,texto,status,criado_em,atualizado_em').eq('user_id', uid).order('atualizado_em', { ascending: false });
      if (curso) qb = qb.eq('curso_id', curso);
      const { data } = await qb.limit(100);
      return json({ redacoes: data ?? [] });
    }
    if (path === '/redacoes/salvar' && req.method === 'POST') {
      if (!(await cursoValido(body.curso_id))) return fail('Curso inválido');
      const reg: any = {
        user_id: uid, curso_id: body.curso_id,
        tema_id: uuidOk(body.tema_id) ? body.tema_id : null,
        tema_livre: body.tema_livre ? String(body.tema_livre).slice(0, 500) : null,
        titulo: body.titulo ? String(body.titulo).slice(0, 200) : null,
        texto: String(body.texto ?? '').slice(0, 20000),
        status: body.status === 'finalizada' ? 'finalizada' : 'rascunho',
        atualizado_em: new Date().toISOString(),
      };
      if (uuidOk(body.id)) {
        const { data, error } = await db.from('cx_redacoes').update(reg).eq('id', body.id).eq('user_id', uid).select('id').maybeSingle();
        if (error || !data) return fail('Redação não encontrada', 404);
        return json({ id: data.id });
      }
      const { data, error } = await db.from('cx_redacoes').insert(reg).select('id').single();
      if (error) return fail('Não foi possível salvar a redação');
      return json({ id: data.id });
    }
    if (path === '/redacoes/excluir' && req.method === 'POST') {
      await db.from('cx_redacoes').delete().eq('id', body.id).eq('user_id', uid);
      return json({ ok: true });
    }

    // ----- cronômetro X -----
    if (path === '/cron/ativa') {
      const { data } = await db.from('cx_sessoes').select('*').eq('user_id', uid).eq('ativa', true).maybeSingle();
      return json({ sessao: data ? { ...data, liquido_s: liquido(data) } : null, agora: new Date().toISOString() });
    }
    if (path === '/cron/iniciar' && req.method === 'POST') {
      const { data: velha } = await db.from('cx_sessoes').select('*').eq('user_id', uid).eq('ativa', true).maybeSingle();
      if (velha) return json({ sessao: { ...velha, liquido_s: liquido(velha) } });
      const { data, error } = await db.from('cx_sessoes').insert({
        user_id: uid, curso_id: (await cursoValido(body.curso_id)) ? body.curso_id : null,
        disciplina_id: uuidOk(body.disciplina_id) ? body.disciplina_id : null,
        assunto_id: uuidOk(body.assunto_id) ? body.assunto_id : null,
        atividade: String(body.atividade ?? 'teoria').slice(0, 40),
      }).select('*').single();
      if (error) return fail('Não foi possível iniciar a sessão');
      return json({ sessao: { ...data, liquido_s: 0 } });
    }
    if ((path === '/cron/pausar' || path === '/cron/retomar' || path === '/cron/encerrar') && req.method === 'POST') {
      const { data: s } = await db.from('cx_sessoes').select('*').eq('user_id', uid).eq('ativa', true).maybeSingle();
      if (!s) return fail('Nenhuma sessão em andamento', 404);
      const agora = new Date();
      let upd: any = {};
      if (path === '/cron/pausar' && !s.pausado_em) upd = { pausado_em: agora.toISOString() };
      if (path === '/cron/retomar' && s.pausado_em) upd = { pausado_em: null, pausas_s: s.pausas_s + Math.floor((agora.getTime() - Date.parse(s.pausado_em)) / 1000) };
      if (path === '/cron/encerrar') {
        const liq = liquido(s, agora.getTime());
        const pausas = s.pausado_em ? s.pausas_s + Math.floor((agora.getTime() - Date.parse(s.pausado_em)) / 1000) : s.pausas_s;
        upd = { fim: agora.toISOString(), pausado_em: null, pausas_s: pausas, liquido_s: liq, ativa: false };
      }
      const { data } = await db.from('cx_sessoes').update(upd).eq('id', s.id).select('*').single();
      return json({ sessao: { ...data, liquido_s: data.liquido_s ?? liquido(data) } });
    }
    if (path === '/cron/resumo') {
      const desde = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await db.from('cx_sessoes').select('id,curso_id,disciplina_id,assunto_id,atividade,inicio,fim,pausado_em,pausas_s,liquido_s,ativa').eq('user_id', uid).gte('inicio', desde).order('inicio', { ascending: false });
      const { data: tot } = await db.from('cx_sessoes').select('liquido_s').eq('user_id', uid).eq('ativa', false);
      const hoje = hojeISO(); const semana = addDias(hoje, -6);
      const porDia: Record<string, number> = {};
      let hojeS = 0, sessHoje = 0, semS = 0;
      (data ?? []).forEach((s: any) => {
        const l = s.liquido_s ?? liquido(s); const dia = hojeISO(new Date(s.inicio));
        porDia[dia] = (porDia[dia] ?? 0) + l;
        if (dia === hoje) { hojeS += l; sessHoje++; }
        if (dia >= semana) semS += l;
      });
      const totalS = (tot ?? []).reduce((a: number, s: any) => a + (s.liquido_s ?? 0), 0);
      return json({ hoje_s: hojeS, sessoes_hoje: sessHoje, semana_s: semS, total_s: totalS, por_dia: porDia, sessoes: (data ?? []).slice(0, 30).map((s: any) => ({ ...s, liquido_s: s.liquido_s ?? liquido(s) })) });
    }

    // ----- cronograma -----
    if (path === '/cronograma' && req.method === 'GET') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const { data } = await db.from('cx_cronograma').select('config,plano,criado_em').eq('user_id', uid).eq('curso_id', curso).maybeSingle();
      return json({ cronograma: data });
    }
    if (path === '/cronograma/salvar' && req.method === 'POST') {
      if (!(await cursoValido(body.curso_id))) return fail('Curso inválido');
      if (!Array.isArray(body.plano) || body.plano.length > 400) return fail('Plano inválido');
      await db.from('cx_cronograma').upsert({ user_id: uid, curso_id: body.curso_id, config: body.config ?? {}, plano: body.plano, criado_em: new Date().toISOString() });
      return json({ ok: true });
    }

    // ----- calendário -----
    if (path === '/eventos' && req.method === 'GET') {
      const de = q.get('de') ?? addDias(hojeISO(), -31), ate = q.get('ate') ?? addDias(hojeISO(), 62);
      const { data } = await db.from('cx_eventos').select('id,data,titulo,tipo,feito').eq('user_id', uid).gte('data', de).lte('data', ate).order('data');
      return json({ eventos: data ?? [] });
    }
    if (path === '/eventos/salvar' && req.method === 'POST') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.data ?? '')) || !String(body.titulo ?? '').trim()) return fail('Informe data e título');
      const reg = { user_id: uid, data: body.data, titulo: String(body.titulo).trim().slice(0, 200), tipo: ['estudo', 'revisao', 'simulado', 'redacao', 'prova', 'outro'].includes(body.tipo) ? body.tipo : 'estudo', feito: !!body.feito };
      if (uuidOk(body.id)) await db.from('cx_eventos').update(reg).eq('id', body.id).eq('user_id', uid);
      else await db.from('cx_eventos').insert(reg);
      return json({ ok: true });
    }
    if (path === '/eventos/excluir' && req.method === 'POST') {
      await db.from('cx_eventos').delete().eq('id', body.id).eq('user_id', uid);
      return json({ ok: true });
    }

    // ----- administração -----
    if (path.startsWith('/admin/')) {
      if (!admin) return fail('Acesso restrito à administração', 403);
      if (path === '/admin/cobertura') {
        if (!(await cursoValido(curso))) return fail('Curso inválido');
        return json({ disciplinas: await carregarEstrutura(curso, true) });
      }
      if (path === '/admin/usuarios') {
        const { data } = await db.auth.admin.listUsers({ perPage: 200 });
        const { data: perfis } = await db.from('cx_perfis').select('user_id,nome,curso_id,xp');
        const pm: Record<string, any> = {}; (perfis ?? []).forEach((p: any) => pm[p.user_id] = p);
        return json({ usuarios: (data?.users ?? []).map((u: any) => ({ id: u.id, email: u.email, criado_em: u.created_at, ultimo_login: u.last_sign_in_at, nome: pm[u.id]?.nome ?? null, curso_id: pm[u.id]?.curso_id ?? null, xp: pm[u.id]?.xp ?? 0, admin: ehAdmin(u) })) });
      }
      if (path === '/admin/usuarios/criar' && req.method === 'POST') {
        const email = String(body.email ?? '').trim().toLowerCase(), senha = String(body.password ?? '');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('E-mail inválido');
        if (senha.length < 6) return fail('A senha deve ter no mínimo 6 caracteres.');
        const { data, error } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { full_name: body.nome ?? null } });
        if (error) return fail(error.message.includes('already') ? 'Este e-mail já está cadastrado.' : 'Não foi possível criar o usuário.');
        await db.from('cx_perfis').upsert({ user_id: data.user.id, nome: body.nome ? String(body.nome).slice(0, 120) : null, curso_id: (await cursoValido(body.curso_id)) ? body.curso_id : null });
        return json({ ok: true, id: data.user.id });
      }
      // Importação de conteúdo de um assunto (idempotente: `limpar` apaga antes o que for do mesmo tipo).
      if (path === '/admin/importar' && req.method === 'POST') {
        const { data: as } = await db.from('cx_assuntos').select('id,cx_disciplinas!inner(nome,curso_id),cx_subassuntos(id,nome)')
          .eq('nome', body.assunto).eq('cx_disciplinas.nome', body.disciplina).eq('cx_disciplinas.curso_id', body.curso).maybeSingle();
        if (!as) return fail(`Assunto não encontrado: ${body.curso} / ${body.disciplina} / ${body.assunto}`, 404);
        const subId = (nome: unknown) => (as.cx_subassuntos ?? []).find((s: any) => s.nome === nome)?.id ?? null;
        const limpar: string[] = Array.isArray(body.limpar) ? body.limpar : [];
        if (limpar.includes('questoes')) await db.from('cx_questoes').delete().eq('assunto_id', as.id).eq('tipo', 'autoral');
        const tiposLimpar = limpar.filter((t) => TIPOS_MATERIAL.includes(t));
        if (tiposLimpar.length) await db.from('cx_materiais').delete().eq('assunto_id', as.id).in('tipo', tiposLimpar);
        const qs = (Array.isArray(body.questoes) ? body.questoes : []).filter((q: any) =>
          q && q.enunciado && Array.isArray(q.opcoes) && q.opcoes.length === 5 && Number.isInteger(q.gabarito) && q.gabarito >= 0 && q.gabarito <= 4);
        const ms = (Array.isArray(body.materiais) ? body.materiais : []).filter((m: any) => m && TIPOS_MATERIAL.includes(m.tipo) && m.titulo);
        let gr: any = { inseridas: 0, duplicadas: 0, rejeitadas: [] };
        if (qs.length) {
          gr = await gravarQuestoes(body.curso, qs.map((q: any) => ({ ...q, disciplina: body.disciplina, assunto: body.assunto, tipo: q.tipo ?? 'autoral',
            fonte: q.fonte ?? 'Bizu do Concurseiro X — banco autoral', origem: q.origem ?? `🟨 Questão autoral Bizu · banca de referência ${BANCA_ALVO[body.curso] ?? '—'} · nível ${q.nivel ?? 'Médio'}` })));
        }
        if (ms.length) {
          const { error } = await db.from('cx_materiais').insert(ms.map((m: any) => ({
            assunto_id: as.id, subassunto_id: subId(m.subassunto), tipo: m.tipo, titulo: String(m.titulo).slice(0, 300),
            conteudo: m.conteudo ?? {}, url: m.url ?? null, fonte_oficial: m.fonte_oficial ?? null, publicado: m.publicado !== false,
          })));
          if (error) return fail('Erro ao gravar materiais: ' + error.message, 500);
        }
        return json({ ok: true, assunto_id: as.id, questoes: gr.inseridas, duplicadas: gr.duplicadas, materiais: ms.length, descartadas: (body.questoes?.length ?? 0) - qs.length + gr.rejeitadas.length });
      }
      // Simulados do acervo (links do Drive) — CRUD do administrador.
      if (path === '/admin/simulados' && req.method === 'GET') {
        let qb = db.from('cx_simulados_drive').select('*').order('curso_id').order('ordem').order('titulo');
        if (curso) qb = qb.eq('curso_id', curso);
        const { data } = await qb; return json({ simulados: data ?? [] });
      }
      if (path === '/admin/simulados' && req.method === 'POST') {
        const acao = body.acao;
        if (acao === 'excluir') { if (!uuidOk(body.id)) return fail('Simulado inválido'); await db.from('cx_simulados_drive').delete().eq('id', body.id); return json({ ok: true }); }
        if (acao === 'lote') {
          if (!(await cursoValido(body.curso_id))) return fail('Curso inválido');
          const itens = (Array.isArray(body.itens) ? body.itens : []).map(limparSim).filter((x: any) => x.titulo);
          if (body.substituir) await db.from('cx_simulados_drive').delete().eq('curso_id', body.curso_id);
          if (itens.length) { const { error } = await db.from('cx_simulados_drive').insert(itens.map((x: any) => ({ ...x, curso_id: body.curso_id }))); if (error) return fail('Erro ao gravar simulados: ' + error.message, 500); }
          return json({ ok: true, simulados: itens.length });
        }
        const d = limparSim(body);
        if (!d.titulo) return fail('Informe o título');
        if (acao === 'criar') {
          if (!(await cursoValido(body.curso_id))) return fail('Curso inválido');
          const { data, error } = await db.from('cx_simulados_drive').insert({ ...d, curso_id: body.curso_id }).select('id').single();
          if (error) return fail('Não foi possível criar o simulado.'); return json({ ok: true, id: data.id });
        }
        if (acao === 'editar') {
          if (!uuidOk(body.id)) return fail('Simulado inválido');
          const { error } = await db.from('cx_simulados_drive').update(d).eq('id', body.id);
          if (error) return fail('Não foi possível salvar.'); return json({ ok: true });
        }
        if (acao === 'publicar') { if (!uuidOk(body.id)) return fail('Simulado inválido'); await db.from('cx_simulados_drive').update({ publicado: body.publicado === true }).eq('id', body.id); return json({ ok: true }); }
        return fail('Ação inválida');
      }
      // Arquivos do Drive processados (fontes).
      if (path === '/admin/fontes' && req.method === 'GET') { const { data } = await db.from('cx_fontes_drive').select('*').order('categoria').order('nome'); return json({ fontes: data ?? [] }); }
      if (path === '/admin/fontes' && req.method === 'POST') {
        const itens = (Array.isArray(body.itens) ? body.itens : []).filter((x: any) => x && x.arquivo_id && x.nome && x.categoria);
        if (itens.length) { const { error } = await db.from('cx_fontes_drive').upsert(itens.map((x: any) => ({ arquivo_id: String(x.arquivo_id), nome: String(x.nome).slice(0, 300), pasta: x.pasta ?? null, categoria: String(x.categoria).slice(0, 60), curso_id: x.curso_id ?? null, status: x.status ?? 'processado', qtd_questoes: parseInt(x.qtd_questoes) || 0, obs: x.obs ?? null })), { onConflict: 'arquivo_id' }); if (error) return fail('Erro: ' + error.message, 500); }
        return json({ ok: true, fontes: itens.length });
      }
      // Importação em lote de questões (reais/autorais) com metadados, dedupe por hash e status.
      if (path === '/admin/importar-lote' && req.method === 'POST') {
        if (!(await cursoValido(body.curso_id))) return fail('Curso inválido');
        const r = await gravarQuestoes(body.curso_id, Array.isArray(body.lote) ? body.lote : []);
        return json({ ok: true, ...r });
      }
      // Banco de Questões: indicadores, cobertura por assunto, fila de revisão.
      if (path === '/admin/banco/resumo') {
        const cursos = curso ? [curso] : ['pm-sp-soldado', 'gcm-geral'];
        const out: any = { cursos: {}, totais: {} };
        const todas: any[] = [];
        for (const c of cursos) {
          if (!(await cursoValido(c))) continue;
          const qs = await todos((a, b) => porCurso(db.from('cx_questoes').select('id,tipo,status,publicado,banca_ref,banca,ano,nivel,nivel_compat,enunciado,assunto_id,concurso,arquivo_id' + JOIN_CURSO), c).order('id').range(a, b));
          const est = await carregarEstrutura(c, true); const cob = await coberturaBanco(c);
          const cnt = (f: (x: any) => any, arr = qs) => { const m: Record<string, number> = {}; arr.forEach((x: any) => { const v = f(x); if (v !== null && v !== undefined && v !== '') m[String(v)] = (m[String(v)] ?? 0) + 1; }); return m; };
          const porDisc: Record<string, any> = {}; const dMap: Record<string, string> = {}; est.forEach((d: any) => d.assuntos.forEach((a: any) => dMap[a.id] = d.nome));
          qs.forEach((x: any) => { const d = dMap[x.assunto_id] ?? '?'; const o = (porDisc[d] ??= { total: 0, reais: 0, autorais: 0 }); o.total++; if (x.tipo === 'real') o.reais++; else o.autorais++; });
          const norm: Record<string, number> = {}; qs.forEach((x: any) => { const k = normTxt(x.enunciado).slice(0, 220); norm[k] = (norm[k] ?? 0) + 1; });
          const duplicadas = Object.values(norm).filter((n) => n > 1).reduce((a, n) => a + n, 0);
          out.cursos[c] = {
            total: qs.length, reais: qs.filter((x: any) => x.tipo === 'real').length, autorais: qs.filter((x: any) => x.tipo === 'autoral').length,
            por_status: cnt((x) => x.status), por_banca: cnt((x) => x.banca_ref), por_ano: cnt((x) => x.ano), por_nivel: cnt((x) => x.nivel), por_compat: cnt((x) => x.nivel_compat), por_disciplina: porDisc,
            sem_classificacao: qs.filter((x: any) => x.status === 'revisao').length, duplicadas_possiveis: duplicadas, desatualizadas: qs.filter((x: any) => x.status === 'desatualizada').length,
            assuntos_sem_questoes: cob.linhas.filter((l: any) => l.total === 0).length, edital: resumoEdital(cob, est), banca_alvo: cob.banca_alvo, tem_reais: cob.tem_reais, cobertura: cob.linhas,
          };
          todas.push(...qs);
        }
        const sum = (f: (c: any) => number) => Object.values(out.cursos).reduce((a: number, c: any) => a + f(c), 0);
        out.totais = { total: sum((c) => c.total), reais: sum((c) => c.reais), autorais: sum((c) => c.autorais), revisao: sum((c) => c.sem_classificacao), desatualizadas: sum((c) => c.desatualizadas), duplicadas_possiveis: sum((c) => c.duplicadas_possiveis) };
        return json(out);
      }
      if (path === '/admin/banco/revisao') {
        const st = q.get('status') ?? 'revisao'; if (!STATUS_Q.includes(st)) return fail('Status inválido');
        const pag = Math.max(0, parseInt(q.get('pagina') ?? '0') || 0);
        let qb = db.from('cx_questoes').select(COLS_Q_ADMIN + ',cx_assuntos!inner(nome,cx_disciplinas!inner(nome,curso_id))', { count: 'exact' }).eq('status', st);
        if (curso) qb = qb.eq('cx_assuntos.cx_disciplinas.curso_id', curso);
        const { data, count } = await qb.order('concurso').order('numero_questao').range(pag * 30, pag * 30 + 29);
        return json({ total: count ?? 0, pagina: pag, questoes: (data ?? []).map((r: any) => { const { cx_assuntos: a, ...x } = r; return { ...x, assunto: a?.nome, disciplina: a?.cx_disciplinas?.nome, curso_id: a?.cx_disciplinas?.curso_id }; }) });
      }
      if (path === '/admin/banco/questao' && req.method === 'POST') {
        if (!uuidOk(body.id)) return fail('Questão inválida');
        if (body.acao === 'excluir') { await db.from('cx_questoes').delete().eq('id', body.id); return json({ ok: true }); }
        if (body.acao === 'status') {
          if (!STATUS_Q.includes(body.status)) return fail('Status inválido');
          await db.from('cx_questoes').update({ status: body.status, publicado: body.status === 'publicada', motivo_status: body.motivo ? String(body.motivo).slice(0, 500) : null }).eq('id', body.id);
          return json({ ok: true });
        }
        if (body.acao === 'editar') {
          const u: any = {}; const c = body.campos ?? {};
          for (const k of ['enunciado', 'comentario', 'lei_relacionada', 'juris_relacionada', 'legislacao_considerada', 'motivo_status', 'dificuldade', 'nivel', 'nivel_compat', 'fonte', 'origem']) if (c[k] !== undefined) u[k] = c[k];
          if (Array.isArray(c.opcoes) && c.opcoes.length === 5) u.opcoes = c.opcoes.map(String);
          if (Number.isInteger(c.gabarito) && c.gabarito >= 0 && c.gabarito <= 4) u.gabarito = c.gabarito;
          if (c.assunto_id && uuidOk(c.assunto_id)) u.assunto_id = c.assunto_id;
          if (u.enunciado || u.opcoes) { const { data: cur } = await db.from('cx_questoes').select('enunciado,opcoes').eq('id', body.id).single(); u.hash = await hashQuestao(u.enunciado ?? cur!.enunciado, u.opcoes ?? cur!.opcoes); }
          const { error } = await db.from('cx_questoes').update(u).eq('id', body.id); if (error) return fail('Não foi possível salvar: ' + error.message);
          return json({ ok: true });
        }
        return fail('Ação inválida');
      }
      if (path === '/admin/redacao-temas' && req.method === 'POST') {
        if (!(await cursoValido(body.curso_id))) return fail('Curso inválido');
        if (body.limpar) await db.from('cx_redacao_temas').delete().eq('curso_id', body.curso_id);
        const temas = (Array.isArray(body.temas) ? body.temas : []).filter((t: any) => t && t.titulo && t.proposta);
        if (temas.length) {
          const { error } = await db.from('cx_redacao_temas').insert(temas.map((t: any) => ({ curso_id: body.curso_id, titulo: String(t.titulo), proposta: String(t.proposta), textos_apoio: t.textos_apoio ?? [], publicado: t.publicado !== false })));
          if (error) return fail('Erro ao gravar temas: ' + error.message, 500);
        }
        return json({ ok: true, temas: temas.length });
      }
      if (path === '/admin/estrutura' && req.method === 'POST') {
        const nivel = body.nivel as string, acao = body.acao as string;
        const tab = ({ disciplina: 'cx_disciplinas', assunto: 'cx_assuntos', subassunto: 'cx_subassuntos' } as H)[nivel];
        const pai = ({ disciplina: 'curso_id', assunto: 'disciplina_id', subassunto: 'assunto_id' } as H)[nivel];
        if (!tab) return fail('Nível inválido');
        const nome = String(body.nome ?? '').trim().slice(0, 300);
        if (acao === 'criar') {
          if (!nome) return fail('Informe o nome');
          if (nivel === 'disciplina' ? !(await cursoValido(body.pai_id)) : !uuidOk(body.pai_id)) return fail('Item pai inválido');
          const { count } = await db.from(tab).select('id', { count: 'exact', head: true }).eq(pai, body.pai_id);
          const { error } = await db.from(tab).insert({ [pai]: body.pai_id, nome, ordem: (count ?? 0) + 1 });
          if (error) return fail(error.code === '23505' ? 'Já existe um item com esse nome aqui.' : 'Não foi possível criar.');
          return json({ ok: true });
        }
        if (!uuidOk(body.id)) return fail('Item inválido');
        if (acao === 'renomear') {
          if (!nome) return fail('Informe o nome');
          const { error } = await db.from(tab).update({ nome }).eq('id', body.id);
          if (error) return fail(error.code === '23505' ? 'Já existe um item com esse nome aqui.' : 'Não foi possível renomear.');
          return json({ ok: true });
        }
        if (acao === 'excluir') { await db.from(tab).delete().eq('id', body.id); return json({ ok: true }); }
        return fail('Ação inválida');
      }
    }

    return fail('Rota não encontrada', 404);
  } catch (e) {
    console.error(e);
    return fail('Erro interno', 500);
  }
}
