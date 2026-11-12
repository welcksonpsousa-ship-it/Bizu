// Camada única de IA do Bizu do Concurseiro X.
// - Vários provedores (Anthropic, OpenAI, Google Gemini); as chaves ficam só nos segredos da função.
// - Cada funcionalidade tem sua lista de modelos em ordem de preferência; se um falhar, tenta o próximo.
// - Limite diário por aluno e orçamento diário opcional; todo uso é registrado em cx_ia_uso.
//
// Configuração (segredos da Edge Function):
//   ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY   → ativam cada provedor (basta um)
//   IA_CHATX   = "anthropic:claude-haiku-5-5,openai:gpt-4o-mini"   (opcional; ordem de preferência)
//   IA_REDACAO = "anthropic:claude-sonnet-5-5,openai:gpt-4o"       (opcional)
//   IA_LIMITE_CHATX (padrão 10/dia), IA_LIMITE_REDACAO (padrão 1/semana)  → por aluno (horário de Brasília)
//   IA_PRECOS = {"claude-haiku-5-5":[1,5]}  → US$ por milhão de tokens [entrada, saída], para estimar custo (opcional)
//   IA_ORCAMENTO_DIA_USD = 5   → para todas as chamadas do dia quando o custo estimado atingir o valor (opcional)

export type Funcao = 'chatx' | 'redacao';
type Provedor = 'anthropic' | 'openai' | 'gemini';

const CHAVE: Record<Provedor, string> = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', gemini: 'GEMINI_API_KEY' };
// Modelos padrão: rápido e barato para conversa; mais capaz para corrigir redação.
const PADRAO: Record<Funcao, [Provedor, string][]> = {
  chatx: [['anthropic', 'claude-haiku-5-5'], ['openai', 'gpt-4o-mini'], ['gemini', 'gemini-2.5-flash']],
  // Redação: Gemini Flash primeiro (cabe no plano grátis do Google); os outros só entram se ele falhar.
  redacao: [['gemini', 'gemini-2.5-flash'], ['anthropic', 'claude-sonnet-5-5'], ['openai', 'gpt-4o']],
};
// Chat X: por dia. Redação: por SEMANA (segunda a domingo, horário de Brasília).
const LIMITE_PADRAO: Record<Funcao, number> = { chatx: 10, redacao: 1 };
const PERIODO: Record<Funcao, 'dia' | 'semana'> = { chatx: 'dia', redacao: 'semana' };
const NOME: Record<Provedor, string> = { anthropic: 'Anthropic (Claude)', openai: 'OpenAI', gemini: 'Google Gemini' };

const env = (k: string) => (Deno.env.get(k) ?? '').trim();
export const provedorAtivo = (p: Provedor) => !!env(CHAVE[p]);

function cadeia(f: Funcao): [Provedor, string][] {
  const cfg = env('IA_' + f.toUpperCase());
  let lista: [Provedor, string][] = PADRAO[f];
  if (cfg) {
    lista = cfg.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
      const [p, ...m] = x.split(':'); return [p as Provedor, m.join(':')] as [Provedor, string];
    }).filter(([p, m]) => (p in CHAVE) && !!m);
  } else if (f === 'chatx' && env('CHATX_MODEL')) {
    lista = [['anthropic', env('CHATX_MODEL')], ...PADRAO.chatx.slice(1)];
  }
  return lista.filter(([p]) => provedorAtivo(p));
}
export const iaDisponivel = (f: Funcao) => cadeia(f).length > 0;
export function iaStatus() {
  return {
    provedores: (Object.keys(CHAVE) as Provedor[]).map((p) => ({ id: p, nome: NOME[p], ativo: provedorAtivo(p) })),
    funcoes: (['chatx', 'redacao'] as Funcao[]).map((f) => ({ funcao: f, disponivel: iaDisponivel(f), modelos: cadeia(f).map(([p, m]) => `${p}:${m}`), limite_aluno: limite(f), periodo: PERIODO[f] })),
    orcamento_dia_usd: Number(env('IA_ORCAMENTO_DIA_USD')) || null,
    precos_configurados: !!env('IA_PRECOS'),
  };
}
const limite = (f: Funcao) => Number(env('IA_LIMITE_' + f.toUpperCase())) || LIMITE_PADRAO[f];
function inicioDoPeriodoBR(f: Funcao) {
  const base = new Date(Date.now() - 3 * 3600e3); base.setUTCHours(0, 0, 0, 0);
  if (PERIODO[f] === 'semana') base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7)); // volta até a segunda-feira
  return new Date(base.getTime() + 3 * 3600e3).toISOString();
}
function inicioDoDiaBR() { const agora = Date.now() - 3 * 3600e3; const d = new Date(agora); d.setUTCHours(0, 0, 0, 0); return new Date(d.getTime() + 3 * 3600e3).toISOString(); }
function custo(modelo: string, tin = 0, tout = 0): number | null {
  try { const t = JSON.parse(env('IA_PRECOS') || '{}'); const p = t[modelo]; if (!Array.isArray(p)) return null; return Math.round(((tin * p[0] + tout * p[1]) / 1e6) * 1e5) / 1e5; } catch { return null; }
}

type Msg = { role: 'user' | 'assistant'; content: string };
type Pedido = { system: string; mensagens: Msg[]; maxTokens?: number; json?: boolean; timeoutMs?: number };
type Resposta = { texto: string; tin?: number; tout?: number };

async function chamar(p: Provedor, modelo: string, r: Pedido): Promise<Resposta> {
  const key = env(CHAVE[p]); const sinal = AbortSignal.timeout(r.timeoutMs ?? 30000); const max = r.maxTokens ?? 800;
  if (p === 'anthropic') {
    const resp = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: sinal, headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modelo, max_tokens: max, system: r.system, messages: r.mensagens }) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${(await resp.text()).slice(0, 160)}`);
    const j = await resp.json();
    return { texto: (j.content ?? []).map((c: any) => c.text ?? '').join('').trim(), tin: j.usage?.input_tokens, tout: j.usage?.output_tokens };
  }
  if (p === 'openai') {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: sinal, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: modelo, max_completion_tokens: max, messages: [{ role: 'system', content: r.system }, ...r.mensagens], ...(r.json ? { response_format: { type: 'json_object' } } : {}) }) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${(await resp.text()).slice(0, 160)}`);
    const j = await resp.json();
    return { texto: String(j.choices?.[0]?.message?.content ?? '').trim(), tin: j.usage?.prompt_tokens, tout: j.usage?.completion_tokens };
  }
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, { method: 'POST', signal: sinal, headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: r.system }] }, contents: r.mensagens.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: max, ...(r.json ? { responseMimeType: 'application/json' } : {}) } }) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${(await resp.text()).slice(0, 160)}`);
  const j = await resp.json();
  return { texto: (j.candidates?.[0]?.content?.parts ?? []).map((x: any) => x.text ?? '').join('').trim(), tin: j.usageMetadata?.promptTokenCount, tout: j.usageMetadata?.candidatesTokenCount };
}

export type ResultadoIA = { ok: true; texto: string; provedor: string; modelo: string } | { ok: false; motivo: 'sem_provedor' | 'limite' | 'orcamento' | 'falha'; mensagem: string };

// deno-lint-ignore no-explicit-any
export async function iaGerar(db: any, uid: string | null, f: Funcao, r: Pedido): Promise<ResultadoIA> {
  const lista = cadeia(f);
  if (!lista.length) return { ok: false, motivo: 'sem_provedor', mensagem: 'Nenhum modelo de IA está configurado no servidor para esta função.' };
  const desde = inicioDoDiaBR();
  if (uid) {
    const { count } = await db.from('cx_ia_uso').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('funcao', f).eq('ok', true).gte('criado_em', inicioDoPeriodoBR(f));
    if ((count ?? 0) >= limite(f)) return { ok: false, motivo: 'limite', mensagem: PERIODO[f] === 'semana' ? `Você já usou ${limite(f)} correção(ões) nesta semana. O limite renova na segunda-feira.` : `Você atingiu o limite de ${limite(f)} mensagem(ns) de hoje. Renova à meia-noite.` };
  }
  const orc = Number(env('IA_ORCAMENTO_DIA_USD'));
  if (orc > 0) {
    const { data } = await db.from('cx_ia_uso').select('custo_usd').gte('criado_em', desde).not('custo_usd', 'is', null).limit(5000);
    const gasto = (data ?? []).reduce((s: number, x: any) => s + Number(x.custo_usd || 0), 0);
    if (gasto >= orc) return { ok: false, motivo: 'orcamento', mensagem: 'O orçamento diário de IA da plataforma foi atingido. Tente novamente amanhã.' };
  }
  for (const [p, modelo] of lista) {
    const t0 = Date.now();
    try {
      const resp = await chamar(p, modelo, r);
      if (!resp.texto) throw new Error('resposta vazia');
      await db.from('cx_ia_uso').insert({ user_id: uid, funcao: f, provedor: p, modelo, ok: true, tokens_in: resp.tin ?? null, tokens_out: resp.tout ?? null, custo_usd: custo(modelo, resp.tin, resp.tout), ms: Date.now() - t0 });
      return { ok: true, texto: resp.texto, provedor: p, modelo };
    } catch (e) {
      await db.from('cx_ia_uso').insert({ user_id: uid, funcao: f, provedor: p, modelo, ok: false, erro: String((e as Error)?.message ?? e).slice(0, 300), ms: Date.now() - t0 });
    }
  }
  return { ok: false, motivo: 'falha', mensagem: 'O serviço de IA não respondeu agora. Tente novamente em alguns minutos.' };
}
