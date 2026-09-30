// Bizu do Concurseiro X — API (Edge Function cx-api, projeto Supabase bizu-concurseiro-x).
// Projeto independente do Bizu Delta X: banco, funções e sessão próprios.
// Nesta etapa a plataforma só tem a ESTRUTURA curricular; as rotas de conteúdo
// (questões, materiais, simulados, temas de redação) devolvem apenas o que foi
// publicado — hoje, nada. Nenhuma rota gera conteúdo de estudo.
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
    if (path === '/questoes') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      let qb = porCurso(db.from('cx_questoes').select('id,assunto_id,subassunto_id,enunciado,opcoes,banca,ano,orgao,dificuldade' + JOIN_CURSO).eq('publicado', true), curso);
      if (uuidOk(q.get('disciplina_id'))) qb = qb.eq('cx_assuntos.disciplina_id', q.get('disciplina_id'));
      if (uuidOk(q.get('assunto_id'))) qb = qb.eq('assunto_id', q.get('assunto_id'));
      if (uuidOk(q.get('subassunto_id'))) qb = qb.eq('subassunto_id', q.get('subassunto_id'));
      const { data } = await qb.limit(Math.min(50, parseInt(q.get('limit') ?? '10') || 10));
      return json({ questoes: semJoin(data) });
    }
    if (path === '/responder' && req.method === 'POST') {
      if (!uuidOk(body.questao_id)) return fail('Questão inválida');
      const { data: qt } = await db.from('cx_questoes').select('id,gabarito,comentario,assunto_id').eq('id', body.questao_id).eq('publicado', true).maybeSingle();
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
      return json({ correta, gabarito: qt.gabarito, comentario: qt.comentario });
    }
    if (path === '/questoes/salvas') {
      const { data } = await db.from('cx_questoes_salvas').select('criado_em,cx_questoes(id,enunciado,opcoes,assunto_id,banca,ano)').eq('user_id', uid).order('criado_em', { ascending: false });
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

    // ----- simulados -----
    if (path === '/simulados') {
      if (!(await cursoValido(curso))) return fail('Curso inválido');
      const [{ data: sims }, { data: hist }] = await Promise.all([
        db.from('cx_simulados').select('id,titulo,questao_ids,duracao_min').eq('curso_id', curso).eq('publicado', true).order('criado_em', { ascending: false }),
        db.from('cx_simulado_tentativas').select('id,simulado_id,acertos,total,iniciado_em,entregue_em').eq('user_id', uid).order('iniciado_em', { ascending: false }).limit(20),
      ]);
      return json({ simulados: (sims ?? []).map((s: any) => ({ id: s.id, titulo: s.titulo, duracao_min: s.duracao_min, questoes: s.questao_ids.length })), historico: hist ?? [] });
    }
    if (path === '/simulado/iniciar' && req.method === 'POST') {
      const { data: s } = await db.from('cx_simulados').select('id,titulo,questao_ids,duracao_min').eq('id', body.simulado_id).eq('publicado', true).maybeSingle();
      if (!s) return fail('Simulado não encontrado', 404);
      const { data: qs } = await db.from('cx_questoes').select('id,enunciado,opcoes').in('id', s.questao_ids).eq('publicado', true);
      const { data: t } = await db.from('cx_simulado_tentativas').insert({ user_id: uid, simulado_id: s.id }).select('id').single();
      return json({ tentativa_id: t!.id, titulo: s.titulo, duracao_min: s.duracao_min, questoes: qs ?? [] });
    }
    if (path === '/simulado/entregar' && req.method === 'POST') {
      const { data: t } = await db.from('cx_simulado_tentativas').select('id,simulado_id,entregue_em').eq('id', body.tentativa_id).eq('user_id', uid).maybeSingle();
      if (!t || t.entregue_em) return fail('Tentativa inválida');
      const { data: s } = await db.from('cx_simulados').select('questao_ids').eq('id', t.simulado_id).single();
      const { data: qs } = await db.from('cx_questoes').select('id,gabarito').in('id', s!.questao_ids);
      const resp = body.respostas ?? {}; let acertos = 0;
      (qs ?? []).forEach((x: any) => { if (Number(resp[x.id]) === x.gabarito) acertos++; });
      await db.from('cx_simulado_tentativas').update({ respostas: resp, acertos, total: qs?.length ?? 0, entregue_em: new Date().toISOString() }).eq('id', t.id);
      return json({ acertos, total: qs?.length ?? 0, gabarito: Object.fromEntries((qs ?? []).map((x: any) => [x.id, x.gabarito])) });
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
