// Protege os arquivos de estudo (apostilas, provas e simulados): só abre para aluno logado e com acesso ativo.
// A sessão é a mesma do site (cookie cx_session/cx_refresh, enviado junto com o pedido do PDF);
// a validação é feita pela própria API do Bizu (/session), que confere login e vencimento do acesso.
export const config = { matcher: ['/apostilas/:path*', '/provas/:path*', '/simulados/:path*'] };

const API = 'https://fbqtyhahjfgfensquhsd.supabase.co/functions/v1/cx-api/session';
const continuar = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
const negar = (status, msg) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bizu do Concurseiro X</title>` +
  `<body style="font-family:system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:0 16px;color:#1C2430"><h1 style="font-size:20px">${msg}</h1>` +
  `<p>Este material é exclusivo para alunos do Bizu do Concurseiro X.</p><p><a href="/" style="color:#2447A8">Entrar no site</a></p></body>`,
  { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export default async function middleware(request) {
  const cookie = request.headers.get('cookie') || '';
  if (!/(?:^|;\s*)cx_(?:session|refresh)=/.test(cookie)) return negar(401, 'Entre no site para abrir este material.');
  try {
    const r = await fetch(API, { headers: { cookie } });
    if (r.status === 401) return negar(401, 'Sua sessão expirou. Entre novamente no site.');
    if (!r.ok) return continuar(); // falha temporária da API: não bloqueia quem está logado
    const j = await r.json();
    if (!j.user) return negar(401, 'Entre no site para abrir este material.');
    if (j.acesso && j.acesso.bloqueado) return negar(403, 'Seu acesso não está ativo.');
    return continuar();
  } catch (e) {
    return continuar();
  }
}
