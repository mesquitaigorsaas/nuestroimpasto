/**
 * Dados de demonstração. Uso: npm run seed
 * ATENÇÃO: apaga TODOS os dados do banco em DATABASE_URL e recria a demo.
 * Todas as pessoas e canais aqui são fictícios.
 */
import postgres from "postgres";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Miniaturas dos vídeos de demonstração vão junto com o site (public/demo).
const THUMBS = path.join(process.cwd(), "public", "demo");
fs.rmSync(THUMBS, { recursive: true, force: true });
fs.mkdirSync(THUMBS, { recursive: true });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada (.env.local).");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });

/** Mesma interface usada antes com o SQLite: `?` vira $1, $2… */
const toPg = (q: string) => {
  let n = 0;
  return q.replace(/\?/g, () => `$${++n}`);
};
type P = string | number | null;
const db = {
  prepare: (q: string) => ({
    run: (...p: P[]) => sql.unsafe(toPg(q), p),
    get: async (...p: P[]) => (await sql.unsafe(toPg(q), p))[0],
  }),
  exec: (q: string) => sql.unsafe(q),
};

// Apaga os dados atuais (a estrutura das tabelas fica no Supabase — veja supabase/migrations).
await db.exec(`TRUNCATE users, sessions, verification_requests, verification_events, settings, videos, videos_fts, comments,
  comment_likes, likes, follows, saves, history, notifications, reports, admin_actions CASCADE`);

const id = (n = 8) => randomBytes(n).toString("base64url");
const hash = (p: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(p, salt, 64).toString("hex")}`;
};
const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString().replace(/\.\d{3}Z$/, "Z");
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));

/* ---------------- Usuários ---------------- */

type U = { key: string; name: string; handle: string; email: string; type: "viewer" | "student" | "professional"; role?: "admin"; specialty?: string; bio?: string; location?: string; instagram?: string; daysAgo: number };

const USERS: U[] = [
  { key: "admin", name: "Equipe Nuestro Impasto", handle: "nuestroimpasto", email: "admin@nuestroimpasto.com", type: "professional", role: "admin", specialty: "Curadoria da comunidade", bio: "Conta oficial da equipe. Diretrizes, novidades e destaques da comunidade.", location: "Belo Horizonte, MG", daysAgo: 120 },
  { key: "marco", name: "Marco Albertini", handle: "marco.albertini", email: "marco@demo.com", type: "professional", specialty: "Pizza napolitana e fermentação longa", bio: "Pizzaiolo há 17 anos. Apaixonado por fermentação, massas de longa maturação e forno a lenha. Aqui mostro o dia a dia da pizzaria, sem filtro.", location: "São Paulo, SP", instagram: "marco.albertini", daysAgo: 110 },
  { key: "helena", name: "Helena Duarte", handle: "helena.pao", email: "helena@demo.com", type: "professional", specialty: "Panificação natural (levain)", bio: "Padeira. Levain, farinhas brasileiras e muita paciência. Compartilho testes, erros e acertos.", location: "Curitiba, PR", daysAgo: 95 },
  { key: "tiago", name: "Tiago Rocha", handle: "tiagorocha", email: "tiago@demo.com", type: "professional", specialty: "Pizza em forno elétrico / delivery", bio: "Dono de pizzaria delivery. Mostro a operação: 200+ pizzas por noite, forno elétrico e processos.", location: "Belo Horizonte, MG", daysAgo: 80 },
  { key: "giulia", name: "Giulia Ferraz", handle: "giulia.massas", email: "giulia@demo.com", type: "professional", specialty: "Massas frescas e recheadas", bio: "Chef de massas frescas. Tortellini, ravioli, pappardelle — e receitas da nonna.", location: "Porto Alegre, RS", daysAgo: 70 },
  { key: "rafa", name: "Rafael Nunes", handle: "rafa.fornos", email: "rafael@demo.com", type: "professional", specialty: "Construção e restauração de fornos", bio: "Construo e restauro fornos a lenha. Tijolo refratário, cúpula, isolamento.", location: "Florianópolis, SC", daysAgo: 45 },
  { key: "ana", name: "Ana Beatriz Lima", handle: "anabia.gastro", email: "ana@demo.com", type: "student", specialty: "Estudante de Gastronomia", bio: "4º semestre de Gastronomia. Documentando minha evolução na panificação e na pizza.", location: "Recife, PE", daysAgo: 30 },
  { key: "pedro", name: "Pedro Salles", handle: "pedro.fermenta", email: "pedro@demo.com", type: "student", specialty: "Estudante — fermentação", bio: "Estudante de tecnologia em alimentos. Obcecado por fermentação e planilhas de hidratação.", location: "Campinas, SP", daysAgo: 12 },
  { key: "lucas", name: "Lucas Moreira", handle: "lucasm", email: "lucas@demo.com", type: "viewer", daysAgo: 20 },
  { key: "carla", name: "Carla Souza", handle: "carla.s", email: "carla@demo.com", type: "viewer", daysAgo: 8 },
  { key: "joao", name: "João Pereira", handle: "joaopereira", email: "joao@demo.com", type: "viewer", daysAgo: 3 },
];

const users: Record<string, string> = {};
const insUser = db.prepare(`INSERT INTO users (id, email, password_hash, name, handle, bio, specialty, location, instagram, role, member_type, verification_status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const pw = hash("impasto123");
for (const u of USERS) {
  users[u.key] = id();
  await insUser.run(
    users[u.key], u.email, pw, u.name, u.handle, u.bio ?? "", u.specialty ?? "", u.location ?? "", u.instagram ?? "",
    u.role ?? "user", u.type, u.type === "viewer" ? "none" : "verified", ago(u.daysAgo * 24),
  );
}

/* ---------------- Miniaturas SVG ---------------- */

const PALETTES = [
  ["#1E262C", "#3A4A55", "#C79563"],
  ["#148448", "#0C5A31", "#F9F6EE"],
  ["#D91328", "#8E0C1A", "#F9F6EE"],
  ["#5B4636", "#2E231B", "#C79563"],
  ["#2F5D62", "#1B3A3D", "#F3E6D6"],
  ["#A8763F", "#6B4A26", "#F9F6EE"],
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrap(text: string, max = 20) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      lines.push(line.trim());
      line = w;
    } else line += " " + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 3);
}

function thumb(text: string, label: string, i: number) {
  const [a, b, c] = PALETTES[i % PALETTES.length];
  const lines = wrap(text.toUpperCase());
  const motif = i % 3;
  const art =
    motif === 0
      ? `<circle cx="1010" cy="360" r="250" fill="${c}" opacity=".12"/><circle cx="1010" cy="360" r="200" fill="none" stroke="${c}" stroke-width="10" opacity=".35"/>
         ${Array.from({ length: 7 }, (_, k) => `<circle cx="${1010 + Math.cos(k) * 110}" cy="${360 + Math.sin(k * 1.7) * 110}" r="${22 + (k % 3) * 6}" fill="#D91328" opacity=".75"/>`).join("")}
         ${Array.from({ length: 5 }, (_, k) => `<ellipse cx="${960 + k * 30}" cy="${300 + (k % 2) * 140}" rx="16" ry="9" fill="#148448" opacity=".85" transform="rotate(${k * 40} ${960 + k * 30} ${300 + (k % 2) * 140})"/>`).join("")}`
      : motif === 1
        ? `<path d="M780 520 Q1010 180 1240 520 Z" fill="${c}" opacity=".15"/><path d="M820 520 Q1010 250 1200 520" fill="none" stroke="${c}" stroke-width="12" opacity=".4"/>
           <path d="M960 470 q50 -120 100 0" fill="#D91328" opacity=".7"/><path d="M990 470 q20 -70 40 0" fill="#FFB347" opacity=".8"/>`
        : `<ellipse cx="1010" cy="380" rx="230" ry="120" fill="${c}" opacity=".16"/><ellipse cx="1010" cy="360" rx="190" ry="90" fill="${c}" opacity=".25"/>
           ${Array.from({ length: 4 }, (_, k) => `<path d="M${860 + k * 80} 330 q20 -30 40 0" stroke="${a}" stroke-width="6" fill="none" opacity=".5"/>`).join("")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  ${art}
  <rect x="70" y="120" width="120" height="10" fill="#148448"/><rect x="190" y="120" width="120" height="10" fill="#F9F6EE"/><rect x="310" y="120" width="120" height="10" fill="#D91328"/>
  <text x="70" y="95" font-family="Arial, Helvetica, sans-serif" font-size="30" letter-spacing="6" fill="${c}" opacity=".9">${esc(label.toUpperCase())}</text>
  ${lines.map((l, k) => `<text x="70" y="${230 + k * 92}" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="80" fill="#FFFFFF">${esc(l)}</text>`).join("")}
  <text x="70" y="660" font-family="Arial, Helvetica, sans-serif" font-size="26" letter-spacing="8" fill="#FFFFFF" opacity=".6">NUESTRO IMPASTO</text>
</svg>`;
}

/* ---------------- Vídeos ---------------- */

type V = { key: string; by: string; title: string; thumbText: string; cat: string; hours: number; views: number; dur: number; desc: string; tags: string; tech?: Record<string, string>; parent?: string };

const VIDEOS: V[] = [
  { key: "m1", by: "marco", title: "Hoje fiz 200 pizzas — bastidores de um sábado lotado", thumbText: "200 pizzas num sábado", cat: "bastidores", hours: 20, views: 4820, dur: 742, desc: "Sábado com casa cheia. Mostro a bancada, o ritmo do forno e como organizo as bolinhas pra não perder o ponto.\n\nForno a lenha, 480 °C no lastro.", tags: "bastidores, forno a lenha, pizzaria, rotina", tech: { forno: "Lenha", temperatura: "480 °C", tempo: "70–90 s" } },
  { key: "m2", by: "marco", title: "Minha massa atual: biga 48h + 24h de maturação em bolinha", thumbText: "Biga 48h minha massa atual", cat: "fermentacao", hours: 70, views: 12650, dur: 1104, desc: "Compartilho a massa que estou usando hoje na pizzaria. Não é a única forma certa — é a que funciona pra minha rotina e meu forno.", tags: "biga, fermentação longa, napolitana, hidratação", tech: { hidratacao: "70%", farinha: "Tipo 00, W 300–320", fermentacao: "Biga 48h a 16 °C + 24h em bolinha a 4 °C", metodo: "Biga 100%", ingredientes: "Farinha, água, sal 2,8%, fermento seco 0,3%" } },
  { key: "m3", by: "marco", title: "Testei 65% contra 70% de hidratação no mesmo dia", thumbText: "65% vs 70% hidratação", cat: "tecnicas", hours: 150, views: 9800, dur: 868, desc: "Duas massas, mesma farinha, mesmo forno, mesmo dia. O que mudou na abertura, no cornicione e na mordida.", tags: "hidratação, teste, napolitana, cornicione", tech: { hidratacao: "65% e 70%", farinha: "Tipo 00, W 290", forno: "Lenha", temperatura: "470 °C" } },
  { key: "m4", by: "marco", title: "A receita de molho que aprendi com meu pai", thumbText: "O molho do meu pai", cat: "pizza", hours: 400, views: 7300, dur: 402, desc: "Receita de família. Simples, sem cozinhar o tomate — do jeito que meu pai fazia na pizzaria dele em 1989.", tags: "molho, receita de família, tomate pelado" },
  { key: "h1", by: "helena", title: "Levain do zero: os primeiros 7 dias, sem mistério", thumbText: "Levain do zero 7 dias", cat: "panificacao", hours: 36, views: 6120, dur: 956, desc: "Diário do meu levain novo, dia a dia. Cheiro, bolhas, quando descartar e quando está pronto.", tags: "levain, fermentação natural, pão, iniciante", tech: { fermentacao: "Natural (levain)", farinha: "Integral + tipo 1", temperatura: "24–26 °C ambiente" } },
  { key: "h2", by: "helena", title: "Estou testando uma farinha nova de moinho pequeno", thumbText: "Farinha nova de moinho", cat: "farinhas", hours: 110, views: 3240, dur: 611, desc: "Chegou uma farinha de um moinho artesanal do Paraná. Primeiro teste: absorção, extensibilidade e sabor.", tags: "farinha, moinho, teste, pão", tech: { farinha: "Tipo 1 de moinho de pedra", hidratacao: "75%", metodo: "Levain 20%" } },
  { key: "h3", by: "helena", title: "Minha massa está ficando muito elástica. O que pode ser?", thumbText: "Massa elástica demais?", cat: "tecnicas", hours: 12, views: 1880, dur: 245, desc: "Dúvida real da semana: a massa volta toda vez que tento abrir. Já mudei o descanso. Alguém já passou por isso?", tags: "dúvida, elasticidade, glúten, descanso" },
  { key: "t1", by: "tiago", title: "Como organizo a operação de delivery pra 250 pizzas por noite", thumbText: "Operação 250 pizzas/noite", cat: "bastidores", hours: 50, views: 8900, dur: 1320, desc: "Fluxo da cozinha, praças, tempo de forno e o que aprendi errando. Forno elétrico de esteira + um de lastro.", tags: "delivery, operação, pizzaria, processos", tech: { forno: "Elétrico de esteira + lastro", temperatura: "320 °C", tempo: "5 min" } },
  { key: "t2", by: "tiago", title: "Forno elétrico faz pizza boa? Meu resultado depois de 3 anos", thumbText: "Forno elétrico funciona?", cat: "fornos", hours: 220, views: 15400, dur: 734, desc: "Minha opinião honesta sobre forno elétrico em pizzaria, com números de consumo e o resultado na massa.", tags: "forno elétrico, pizzaria, custo, resultado", tech: { forno: "Elétrico com pedra", temperatura: "400 °C" } },
  { key: "g1", by: "giulia", title: "Tortellini da nonna: massa, recheio e a dobra certa", thumbText: "Tortellini da nonna", cat: "massas", hours: 90, views: 5600, dur: 1015, desc: "Receita da minha avó de Bolonha. A massa com gema, o recheio tradicional e a dobra — com calma.", tags: "tortellini, massa fresca, receita de família, bolonha", tech: { ingredientes: "Farinha 00, gemas, ovos inteiros", metodo: "Sfoglia à mão", observacoes: "Descansar a massa 30 min coberta" } },
  { key: "g2", by: "giulia", title: "Pappardelle com farinha de grano duro: meu teste", thumbText: "Pappardelle grano duro", cat: "massas", hours: 300, views: 2700, dur: 540, desc: "Testei semola rimacinata no pappardelle. Mais firme, mais rústico. Compare comigo.", tags: "pappardelle, semola, grano duro, massa fresca", tech: { farinha: "Semola rimacinata", hidratacao: "48% (só água)" } },
  { key: "r1", by: "rafa", title: "Estou restaurando um forno a lenha de 1970 — parte 1", thumbText: "Restaurando forno de 1970", cat: "fornos", hours: 30, views: 4100, dur: 1480, desc: "Primeira etapa: tirar o reboco velho, avaliar a cúpula e as rachaduras. Spoiler: o lastro está melhor do que eu esperava.", tags: "forno a lenha, restauração, refratário, cúpula" },
  { key: "r2", by: "rafa", title: "Isolamento de forno: onde quase todo mundo erra", thumbText: "Isolamento de forno", cat: "fornos", hours: 500, views: 11200, dur: 903, desc: "Manta cerâmica, vermiculita, perlita. O que usar, espessuras e o erro que mais vejo em forno caseiro e comercial.", tags: "isolamento, forno a lenha, construção, vermiculita" },
  { key: "a1", by: "ana", title: "Minha primeira pizza no forno da faculdade", thumbText: "Minha primeira pizza", cat: "pizza", hours: 60, views: 980, dur: 312, desc: "Primeira aula prática de pizza. Errei a abertura, mas o sabor ficou bom. Aceito dicas!", tags: "estudante, primeira pizza, gastronomia" },
  { key: "a2", by: "ana", title: "Semana 6: minha evolução no pão de fermentação natural", thumbText: "Evolução: semana 6", cat: "panificacao", hours: 8, views: 420, dur: 480, desc: "Comparando o pão da semana 1 com o da semana 6. Miolo, casca, pestana.", tags: "estudante, evolução, levain, pão" },
  { key: "p1", by: "pedro", title: "Planilha de hidratação e fermento: como eu calculo", thumbText: "Planilha de hidratação", cat: "fermentacao", hours: 18, views: 760, dur: 655, desc: "Mostro a planilha que uso pra calcular fermento por temperatura e tempo. Link na descrição quando eu terminar a versão limpa.", tags: "planilha, cálculo, fermento, temperatura", tech: { metodo: "Direto e biga", observacoes: "Baseado em temperatura da massa final" } },
  // Respostas em vídeo
  { key: "resp1", by: "tiago", parent: "h3", title: "Resposta: massa elástica — no meu caso era a farinha", thumbText: "Massa elástica? No meu caso…", cat: "tecnicas", hours: 6, views: 540, dur: 290, desc: "Respondendo à Helena: já tive esse problema. No meu caso, trocar a farinha resolveu. Mostro o antes e depois.", tags: "resposta, elasticidade, farinha, W" },
  { key: "resp2", by: "pedro", parent: "m3", title: "Refiz o teste 65% x 70% com farinha nacional", thumbText: "Refiz o teste 65 x 70", cat: "tecnicas", hours: 40, views: 1300, dur: 520, desc: "Vi o vídeo do Marco e repeti com farinha nacional e forno elétrico doméstico. Resultado bem diferente!", tags: "resposta, hidratação, farinha nacional, teste", tech: { hidratacao: "65% e 70%", farinha: "Nacional tipo 1", forno: "Elétrico doméstico" } },
  { key: "resp3", by: "ana", parent: "m2", title: "Tentei a biga 48h do Marco na faculdade", thumbText: "Tentei a biga 48h", cat: "fermentacao", hours: 16, views: 610, dur: 410, desc: "Segui a biga que o Marco mostrou. Primeira vez fazendo pré-fermento. Olha no que deu.", tags: "resposta, biga, estudante" },
];

const videos: Record<string, string> = {};
const insVideo = db.prepare(`INSERT INTO videos (id, user_id, title, description, category, tags, thumb_key, duration, tech, parent_id, views, likes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insFts = db.prepare("INSERT INTO videos_fts (id, title, description, tags, tech, channel) VALUES (?, ?, ?, ?, ?, ?)");
const CAT_LABEL: Record<string, string> = { pizza: "Pizza", fermentacao: "Fermentação", massas: "Massas", panificacao: "Panificação", farinhas: "Farinhas", fornos: "Fornos", tecnicas: "Técnicas", bastidores: "Bastidores" };

for (const [i, v] of VIDEOS.entries()) {
  const vid = id();
  videos[v.key] = vid;
  const thumbKey = `/demo/${v.key}.svg`;
  fs.writeFileSync(path.join(THUMBS, `${v.key}.svg`), thumb(v.thumbText, CAT_LABEL[v.cat] ?? "", i));
  const tech = JSON.stringify(v.tech ?? {});
  await insVideo.run(vid, users[v.by], v.title, v.desc, v.cat, v.tags, thumbKey, v.dur, tech, v.parent ? videos[v.parent] : null, v.views, Math.round(v.views * (0.04 + Math.random() * 0.05)), ago(v.hours));
  const u = USERS.find((x) => x.key === v.by)!;
  await insFts.run(vid, v.title, v.desc, v.tags.replace(/,/g, " "), Object.values(v.tech ?? {}).join(" "), `${u.name} ${u.handle}`);
}
await db.exec("UPDATE videos SET responses_count = (SELECT COUNT(*) FROM videos r WHERE r.parent_id = videos.id)");

/* ---------------- Seguidores ---------------- */

const FOLLOWS: [string, string[]][] = [
  ["lucas", ["marco", "helena", "tiago", "rafa"]],
  ["carla", ["giulia", "helena", "marco"]],
  ["joao", ["marco"]],
  ["ana", ["marco", "helena", "giulia", "pedro"]],
  ["pedro", ["marco", "helena", "tiago", "ana"]],
  ["marco", ["helena", "rafa", "tiago"]],
  ["helena", ["marco", "giulia", "ana"]],
  ["tiago", ["marco", "rafa"]],
  ["giulia", ["helena", "marco"]],
  ["rafa", ["marco", "tiago"]],
];
const insFollow = db.prepare("INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)");
for (const [who, list] of FOLLOWS) for (const t of list) await insFollow.run(users[who], users[t], ago(rand(10, 900)));
// Seguidores "externos" simulados para dar escala aos números
const extra: Record<string, number> = { marco: 12800, helena: 5400, tiago: 8100, giulia: 3300, rafa: 6900, ana: 210, pedro: 95, admin: 1500 };
await db.exec(`UPDATE users SET
  followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = users.id),
  following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = users.id)`);
for (const [k, n] of Object.entries(extra)) await db.prepare("UPDATE users SET followers_count = followers_count + ? WHERE id = ?").run(n, users[k]);

/* ---------------- Comentários ---------------- */

const insComment = db.prepare("INSERT INTO comments (id, video_id, user_id, parent_id, body, likes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
async function comment(video: string, by: string, body: string, hours: number, parent?: string, likes = rand(0, 40)) {
  const cid = id();
  await insComment.run(cid, videos[video], users[by], parent ?? null, body, likes, ago(hours));
  return cid;
}

const c1 = await comment("m2", "pedro", "Qual a temperatura da água que você usa na biga? Aqui no verão fica difícil segurar 16 °C.", 60, undefined, 34);
await comment("m2", "marco", "@pedro.fermenta uso água gelada, uns 4 °C, e deixo a biga numa caixa térmica com gelo reciclável no verão. Funciona bem.", 58, c1, 51);
await comment("m2", "helena", "Faço parecido no pão. Caixa térmica salva demais no verão.", 55, c1, 12);
await comment("m2", "ana", "Salvei pra testar na faculdade! Obrigada por mostrar sem esconder nada.", 40, undefined, 8);
const c2 = await comment("m2", "lucas", "Essa farinha W 300 é fácil de achar no Brasil?", 30, undefined, 5);
await comment("m2", "tiago", "@lucasm hoje já tem várias importadoras vendendo. Mas dá pra fazer com nacional ajustando a hidratação.", 28, c2, 9);

const c3 = await comment("h3", "marco", "Já tive esse problema. No meu caso a farinha estava com W muito alto pra hidratação que eu usava. Tenta um descanso maior depois de bolear.", 10, undefined, 27);
await comment("h3", "helena", "@marco.albertini vou testar descanso de 30 min a mais. Obrigada!", 9, c3, 6);
await comment("h3", "pedro", "Temperatura da massa final também influencia. Mediu?", 8, undefined, 4);
await comment("h3", "giulia", "Na massa fresca eu vejo isso quando trabalho demais a massa. Talvez sova excessiva?", 7, undefined, 11);

await comment("m1", "tiago", "200 no sábado com forno a lenha é outro nível. Quantos pizzaiolos na bancada?", 18, undefined, 14);
await comment("m1", "carla", "Que organização! Deu fome assistindo.", 15, undefined, 3);
await comment("m3", "pedro", "Refiz esse teste com farinha nacional, postei como resposta em vídeo!", 39, undefined, 19);
await comment("m3", "rafa", "O cornicione de 70% ficou absurdo.", 120, undefined, 7);
await comment("t2", "marco", "Resultado honesto. Forno elétrico bem usado faz pizza muito boa sim.", 200, undefined, 44);
await comment("t2", "joao", "Qual o consumo mensal aproximado?", 50, undefined, 2);
await comment("r1", "marco", "Que achado! Acompanhando a série.", 25, undefined, 9);
await comment("g1", "helena", "A dobra no final é uma aula. Obrigada por mostrar a receita da nonna.", 80, undefined, 13);
await comment("a1", "marco", "Muito bom pra primeira! Dica: deixa a bolinha chegar em temperatura ambiente antes de abrir.", 55, undefined, 22);
await comment("a1", "helena", "Continua postando a evolução, é muito legal de acompanhar.", 50, undefined, 6);
await comment("h1", "ana", "Começando o meu levain hoje seguindo esse vídeo!", 30, undefined, 5);
await comment("p1", "helena", "Planilha é vida. Manda o link quando terminar!", 10, undefined, 3);

await db.exec(`UPDATE comments SET replies_count = (SELECT COUNT(*) FROM comments r WHERE r.parent_id = comments.id)`);
await db.exec(`UPDATE videos SET comments_count = (SELECT COUNT(*) FROM comments c WHERE c.video_id = videos.id)`);

/* ---------------- Curtidas, salvos, histórico ---------------- */

const insLike = db.prepare("INSERT INTO likes (user_id, video_id) VALUES (?, ?) ON CONFLICT DO NOTHING");
const insHist = db.prepare("INSERT INTO history (user_id, video_id, watched_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING");
for (const u of ["lucas", "carla", "joao", "ana", "pedro"]) {
  for (const v of Object.keys(videos)) {
    if (Math.random() < 0.35) await insLike.run(users[u], videos[v]);
    if (Math.random() < 0.5) await insHist.run(users[u], videos[v], ago(rand(1, 200)));
  }
}
await db.prepare("INSERT INTO saves (user_id, video_id) VALUES (?, ?)").run(users.lucas, videos.m2);
await db.prepare("INSERT INTO saves (user_id, video_id) VALUES (?, ?)").run(users.lucas, videos.r2);

/* ---------------- Verificação e moderação (exemplos para o painel) ---------------- */

// Solicitações pendentes: a análise automática roda quando um admin abre a fila (Admin → Verificações).
const insVerif = db.prepare(
  `INSERT INTO verification_requests (id, user_id, type, data, status, consent_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending_review', ?, ?, ?)`,
);
const verifRequests: [string, string, Record<string, string>, number][] = [
  [
    "lucas",
    "professional",
    {
      nome: "Lucas Moreira",
      cidade: "Contagem, MG, Brasil",
      profissao: "Pizzaiolo",
      especialidade: "Pizza napolitana e forno a lenha",
      empresa: "Pizzaria Forno Vivo",
      cargo: "Pizzaiolo do turno da noite",
      experiencia: "6 anos",
      instagram: "@lucas.pizza",
      website: "www.fornovivo.com.br",
      adicionais: "Trabalho há 3 anos na mesma casa, abrindo cerca de 150 pizzas por noite.",
    },
    20,
  ],
  ["carla", "student", { nome: "Carla Souza", instituicao: "Senac Minas", curso: "Técnico em Panificação", cidade: "Belo Horizonte" }, 5],
  [
    "joao",
    "related",
    {
      nome: "João Pereira",
      cidade: "Ponta Grossa, PR, Brasil",
      profissao: "Moinho de farinhas especiais",
      empresa: "Moinho Campos Gerais",
      cargo: "Responsável técnico",
      relacao: "Desenvolvo farinhas para pizzarias e padarias artesanais e faço testes de panificação com os clientes.",
      website: "www.moinhocamposgerais.com.br",
    },
    2,
  ],
];
for (const [who, type, data, hours] of verifRequests) {
  const vid = id();
  await insVerif.run(vid, users[who], type, JSON.stringify(data), ago(hours), ago(hours), ago(hours));
  await db.prepare("INSERT INTO verification_events (id, request_id, actor_id, event, reason, created_at) VALUES (?, ?, ?, 'submitted', 'Solicitação enviada.', ?)").run(
    id(),
    vid,
    users[who],
    ago(hours),
  );
  await db.prepare("UPDATE users SET verification_status = 'pending' WHERE id = ?").run(users[who]);
}

await db.prepare(`INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, created_at) VALUES (?, ?, 'comment', ?, 'spam', ?, ?)`).run(
  id(),
  users.helena,
  ((await db.prepare("SELECT id FROM comments WHERE body LIKE 'Qual o consumo%'").get()) as { id: string }).id,
  "Exemplo de denúncia para testar o painel.",
  ago(2),
);

/* ---------------- Notificações ---------------- */

const insNotif = db.prepare("INSERT INTO notifications (id, user_id, actor_id, type, video_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
await insNotif.run(id(), users.helena, users.tiago, "video_response", videos.resp1, "Minha massa está ficando muito elástica. O que pode ser?", ago(6));
await insNotif.run(id(), users.marco, users.pedro, "video_response", videos.resp2, "Testei 65% contra 70% de hidratação no mesmo dia", ago(40));
await insNotif.run(id(), users.marco, users.ana, "follow", null, "", ago(30));
await insNotif.run(id(), users.lucas, users.marco, "new_video", videos.m1, "", ago(20));

console.log(`✔ Banco recriado: ${USERS.length} usuários, ${VIDEOS.length} vídeos.`);
console.log("  Senha de todas as contas de demonstração: impasto123");
console.log("  admin@nuestroimpasto.com (admin) · marco@demo.com (profissional) · ana@demo.com (estudante) · lucas@demo.com · carla@demo.com · joao@demo.com (membros com verificação pendente)");

await sql.end();
