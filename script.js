/* TechEmpire — lógica compartilhada por todas as páginas.
   Cada página declara <body data-page="..." data-auth="public|guest|client|admin">. */
const CFG = window.SUPABASE_CONFIG || {};
const CONFIGURADO = !!(CFG.url && CFG.anonKey && !CFG.url.startsWith("COLE"));
const sb = CONFIGURADO ? supabase.createClient(CFG.url, CFG.anonKey) : null;
const { SERVICOS, STATUS, PAGAMENTO_STATUS, FORMAS, ETAPAS_LEAD, DISPOSITIVOS, TIPOS_SITE, ATENDIMENTO, PRIORIDADES } = window.TE;
const App = { session: null, perfil: null };

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtData = d => d ? new Date(d).toLocaleString("pt-BR") : "—";
const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = n => "TE-" + String(n ?? "").padStart(6, "0");
const digitos = v => String(v || "").replace(/\D/g, "");
const qs = k => new URLSearchParams(location.search).get(k);
const opts = (arr, sel) => arr.map(x => `<option ${x === sel ? "selected" : ""}>${esc(x)}</option>`).join("");
const pill = (t, cinza) => `<span class="pill ${cinza ? "gray" : ""}">${esc(t)}</span>`;
const tabela = (cab, linhas) => linhas.length ? `<div class="tw"><table><thead><tr>${cab.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${linhas.join("")}</tbody></table></div>` : `<p class="empty">Nada por aqui ainda.</p>`;
function toast(t) { let e = $("#toast"); if (!e) { e = document.createElement("div"); e.id = "toast"; e.setAttribute("role", "status"); document.body.append(e); } e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = "none", 3500); }
function msg(id, texto, ok) { const e = $("#" + id); if (!e) return; e.textContent = texto; e.className = "msg on " + (ok ? "ok" : "err"); }
function ocupado(form, on) { const b = form.querySelector("button[type=submit]"); if (b) b.disabled = on; }
function cpfValido(c) { c = digitos(c); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false; for (const t of [9, 10]) { let s = 0; for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if ((s * 10) % 11 % 10 !== +c[t]) return false; } return true; }
const proximaSegura = n => /^[a-z\-]+\.html(\?[\w=&\-]*)?$/i.test(n || "") ? n : null;
async function comClientes(linhas) { // junta o nome do cliente em cada chamado
  const ids = [...new Set(linhas.map(l => l.cliente_id).filter(Boolean))]; if (!ids.length) return linhas;
  const { data } = await sb.from("usuarios").select("id,nome,email").in("id", ids); const m = Object.fromEntries((data || []).map(u => [u.id, u]));
  return linhas.map(l => ({ ...l, cliente: m[l.cliente_id] || {} }));
}

/* ---------- Ações por data-act / data-chg (sem onclick inline) ---------- */
const Act = {}, Chg = {};
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (b && Act[b.dataset.act]) { e.preventDefault(); Act[b.dataset.act](b.dataset, b); } });
document.addEventListener("change", e => { const b = e.target.closest("[data-chg]"); if (b && Chg[b.dataset.chg]) Chg[b.dataset.chg](b.dataset, b); });

/* ---------- Cabeçalho, rodapé e guarda de acesso ---------- */
function desenharChrome() {
  const adm = App.perfil?.is_admin, logado = !!App.session, atual = location.pathname.split("/").pop() || "index.html";
  if (adm) {
    $("#site-header").innerHTML = `<div class="bar-in"><a class="logo" href="admin.html" aria-label="TechEmpire — painel"><i>TE</i><span>Tech<b>Empire</b></span></a>
      <button class="menu" aria-expanded="false" aria-label="Abrir menu">☰</button><nav id="nav"><a href="admin.html" class="on">Painel de atendimento</a><button class="btn sm" data-act="sair">Sair</button></nav></div>`;
    $(".menu").onclick = e => { const n = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n); };
    $("#site-footer").innerHTML = `<div class="copy" style="margin:0 auto">© ${new Date().getFullYear()} TechEmpire · Painel administrativo</div>`; return;
  }
  const l = (href, txt) => `<a href="${href}" class="${atual === href ? "on" : ""}">${txt}</a>`;
  $("#site-header").innerHTML = `<div class="bar-in"><a class="logo" href="index.html" aria-label="TechEmpire — início"><i>TE</i><span>Tech<b>Empire</b></span></a>
   <button class="menu" aria-expanded="false" aria-label="Abrir menu">☰</button>
   <nav id="nav">${l("index.html", "Início")}${l("servicos.html", "Serviços")}${l("manutencao.html", "Manutenção")}${l("sobre.html", "Sobre")}${l("contato.html", "Contato")}
   ${logado ? `${adm ? l("admin.html", "Admin") : ""}${l("painel.html", "Meu painel")}${l("perfil.html", "Perfil")}<button class="btn sm" data-act="sair">Sair</button>`
     : `<a class="btn sm" href="login.html">Entrar</a><a class="btn sm primary" href="criar-conta.html">Criar conta</a>`}</nav></div>`;
  $(".menu").onclick = e => { const n = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n); };
  $("#site-footer").innerHTML = `<div class="foot"><div><a class="logo" href="index.html"><i>TE</i><span>Tech<b>Empire</b></span></a><p>Manutenção de dispositivos, suporte técnico e criação de sites. Tecnologia que funciona.</p></div>
    <div><h4>Site</h4><a href="servicos.html">Serviços</a><a href="manutencao.html">Manutenção preventiva</a><a href="sobre.html">Sobre</a><a href="contato.html">Contato</a></div>
    <div><h4>Sua conta</h4><a href="login.html">Entrar</a><a href="criar-conta.html">Criar conta</a><a href="recuperar-senha.html">Recuperar senha</a></div></div>
    <div class="copy">© ${new Date().getFullYear()} TechEmpire · Seus dados são tratados conforme a LGPD.</div>`;
}
Act.sair = async () => { await sb.auth.signOut(); location.href = "index.html"; };

async function boot() {
  const need = document.body.dataset.auth || "public";
  if (!CONFIGURADO) document.body.insertAdjacentHTML("afterbegin", '<div class="warn">Configure o arquivo supabase-config.js com a URL e a chave anon do seu projeto Supabase.</div>');
  if (sb) {
    const { data } = await sb.auth.getSession(); App.session = data.session;
    if (App.session) { const r = await sb.from("usuarios").select("*").eq("id", App.session.user.id).maybeSingle(); App.perfil = r.data;
      if (App.perfil?.ativo === false) { await sb.auth.signOut(); location.href = "login.html?inativo=1"; return; } }
  }
  if ((need === "client" || need === "admin") && !App.session) { location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); return; }
  if (need === "admin" && !App.perfil?.is_admin) { location.href = "painel.html"; return; }
  if (need === "client" && App.perfil?.is_admin) { location.href = "admin.html"; return; }
  if (need === "guest" && App.session && !location.hash.includes("type=recovery")) { location.href = App.perfil?.is_admin ? "admin.html" : "painel.html"; return; }
  desenharChrome();
  const fn = Pages[document.body.dataset.page];
  if (fn) { if (!sb && need !== "public") return; try { await fn(); } catch (e) { console.error(e); toast("Ocorreu um erro ao carregar a página."); } }
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: .1 }); $$(".reveal").forEach(e => io.observe(e));
}

/* ---------- Anexos (Storage privado "anexos", pasta = id do chamado) ---------- */
const MAX_BYTES = 50 * 1024 * 1024, TIPOS_OK = /^(image\/|video\/|application\/pdf|text\/plain)/;
async function enviarArquivos(chamadoId, files) {
  let falhas = 0;
  for (const f of files) {
    if (f.size > MAX_BYTES || !TIPOS_OK.test(f.type)) { falhas++; continue; }
    const path = `${chamadoId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
    const up = await sb.storage.from("anexos").upload(path, f, { contentType: f.type });
    if (up.error) { falhas++; continue; }
    const { error } = await sb.from("arquivos_chamados").insert({ chamado_id: chamadoId, usuario_id: App.session.user.id, nome_original: f.name, caminho_storage: path, tipo_arquivo: f.type, tamanho_bytes: String(f.size) });
    if (error) falhas++;
  }
  return falhas;
}
async function desenharArquivos(el, chamadoId) {
  const { data } = await sb.from("arquivos_chamados").select("*").eq("chamado_id", chamadoId).order("criado_em");
  if (!data?.length) { el.innerHTML = '<p class="empty">Nenhum arquivo enviado.</p>'; return; }
  const urls = await Promise.all(data.map(a => sb.storage.from("anexos").createSignedUrl(a.caminho_storage, 3600)));
  el.innerHTML = '<div class="files">' + data.map((a, i) => { const u = urls[i].data?.signedUrl; if (!u) return ""; const t = a.tipo_arquivo || "";
    return `<figure class="file">${t.startsWith("image/") ? `<img src="${esc(u)}" alt="${esc(a.nome_original)}" loading="lazy">` : t.startsWith("video/") ? `<video src="${esc(u)}" controls preload="metadata"></video>` : ""}<figcaption><a href="${esc(u)}" target="_blank" rel="noopener">${esc(a.nome_original)}</a></figcaption></figure>`; }).join("") + "</div>";
}
function iniciarChat(el, chamadoId, admin) {
  el.innerHTML = `<div class="chat"><div class="chat-log" aria-live="polite"><p class="empty">Carregando conversa…</p></div>
    <form class="chat-form"><textarea name="t" rows="1" placeholder="Escreva sua mensagem…" required></textarea>
    <label class="clip" title="Anexar arquivo">📎<input type="file" name="f" multiple hidden accept="image/*,video/*,.pdf,.txt"></label>
    ${admin ? '<label class="int"><input type="checkbox" name="int"> Nota interna</label>' : ""}<button class="btn primary sm" type="submit">Enviar</button></form></div>`;
  const log = $(".chat-log", el), form = $(".chat-form", el); let busy = false, primeira = true;
  async function carregar() {
    if (busy) return; busy = true;
    const { data } = await sb.from("mensagens").select("*").eq("chamado_id", chamadoId).order("criado_em");
    const ids = [...new Set((data || []).map(m => m.remetente_id))]; const us = ids.length ? (await sb.from("usuarios").select("id,nome,is_admin").in("id", ids)).data || [] : [];
    const nomes = Object.fromEntries(us.map(x => [x.id, x])); const meu = App.session.user.id;
    const perto = primeira || log.scrollHeight - log.scrollTop - log.clientHeight < 90;
    log.innerHTML = (data || []).map(m => { const r = nomes[m.remetente_id] || {}, eu = m.remetente_id === meu;
      const quem = eu ? "Você" : (r.is_admin ? "TechEmpire" : r.nome || "Cliente");
      return `<div class="b ${eu ? "me" : "ou"} ${m.interna ? "int" : ""}"><small>${esc(quem)} · ${fmtData(m.criado_em)}${m.interna ? " · NOTA INTERNA" : ""}</small><div>${esc(m.conteudo)}</div></div>`; }).join("") || '<p class="empty">Nenhuma mensagem ainda. Mande a primeira!</p>';
    if (perto) log.scrollTop = log.scrollHeight; primeira = false;
    const nao = (data || []).filter(m => !m.lida && m.remetente_id !== meu && (admin || !m.interna)).map(m => m.id);
    if (nao.length) sb.from("mensagens").update({ lida: true }).in("id", nao).then(() => {});
    busy = false;
  }
  form.addEventListener("submit", async e => { e.preventDefault(); const t = form.t.value.trim(); const files = [...form.f.files]; if (!t && !files.length) return; ocupado(form, true);
    let falhas = 0; if (files.length) { falhas = await enviarArquivos(chamadoId, files); document.dispatchEvent(new CustomEvent("chat-arquivos")); }
    const texto = t || `📎 Enviou ${files.length - falhas} arquivo(s).`;
    const { error } = await sb.from("mensagens").insert({ chamado_id: chamadoId, remetente_id: App.session.user.id, conteudo: texto, interna: admin ? !!form.int?.checked : false });
    ocupado(form, false); if (error) return toast("Não foi possível enviar a mensagem."); if (falhas) toast(falhas + " arquivo(s) não enviado(s) (máx. 50 MB)."); form.t.value = ""; form.f.value = ""; await carregar(); log.scrollTop = log.scrollHeight; });
  form.t.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  sb.channel("chat-" + chamadoId).on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `chamado_id=eq.${chamadoId}` }, carregar).subscribe();
  setInterval(carregar, 20000); return carregar();
}
async function desenharHistorico(el, chamadoId) {
  const { data } = await sb.from("historico_status").select("*").eq("chamado_id", chamadoId).order("criado_em");
  el.innerHTML = data?.length ? '<ul class="tl">' + data.map(h => `<li>${fmtData(h.criado_em)} — ${esc(h.status_anterior || "Início")} → <b>${esc(h.status_novo)}</b></li>`).join("") + "</ul>" : '<p class="empty">Sem alterações registradas.</p>';
}
async function desenharPagamentos(el, chamadoId) {
  const { data } = await sb.from("pagamentos").select("*").eq("chamado_id", chamadoId).order("criado_em", { ascending: false });
  el.innerHTML = tabela(["Valor", "Forma", "Status", "Origem", "Data"], (data || []).map(p => `<tr><td>${brl(p.valor)}</td><td>${esc(p.forma)}</td><td>${pill(p.status)}</td><td>${p.manual ? "Registro manual" : "Online"}</td><td>${fmtData(p.pago_em || p.criado_em)}</td></tr>`));
}

/* ====================== PÁGINAS ====================== */
const Pages = {};

Pages.home = () => { const c = $("#cards-servicos"); if (c) c.innerHTML = SERVICOS.map(s => `<div class="card"><div class="ic">${s.icone}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div>`).join(""); };
Pages.servicos = () => { $("#lista-servicos").innerHTML = SERVICOS.map(s => `<div class="card"><div class="ic">${s.icone}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p><p style="margin-top:14px"><a class="btn sm primary" href="novo-chamado.html?tipo=${s.cat}">Solicitar</a></p></div>`).join(""); };

Pages.contato = () => {
  $("#f-contato").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    if (!d.nome.trim() || !(d.email.trim() || d.telefone.trim()) || !d.mensagem.trim()) return msg("m-contato", "Informe nome, um contato (e-mail ou telefone) e a mensagem.");
    ocupado(f, true);
    const { error } = await sb.from("forleads").insert({ nome: d.nome.trim(), email: d.email.trim() || null, telefone: d.telefone.trim() || null, origem: "Site - formulário de contato", servico_interesse: d.servico || null, observacoes: d.mensagem.trim(), etapa: "Novo contato" });
    ocupado(f, false);
    if (error) return msg("m-contato", "Não foi possível enviar agora. Tente novamente em instantes.");
    f.reset(); msg("m-contato", "Mensagem enviada! Entraremos em contato em breve.", true);
  });
};

Pages.criarConta = () => {
  $("#f-conta").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    if (Object.values(d).some(v => !v.trim())) return msg("m-conta", "Preencha todos os campos.");
    if (!cpfValido(d.cpf)) return msg("m-conta", "CPF inválido. Confira os números.");
    if (digitos(d.telefone).length < 10) return msg("m-conta", "Informe um WhatsApp válido, com DDD.");
    if (!/^[A-Za-z]{2}$/.test(d.estado.trim())) return msg("m-conta", "O estado deve ter 2 letras (ex.: ES).");
    if (d.senha.length < 8) return msg("m-conta", "A senha precisa ter pelo menos 8 caracteres.");
    if (d.senha !== d.senha2) return msg("m-conta", "As senhas não coincidem.");
    ocupado(f, true);
    const { data, error } = await sb.auth.signUp({ email: d.email.trim().toLowerCase(), password: d.senha, options: { emailRedirectTo: location.origin + location.pathname.replace("criar-conta.html", "login.html"),
      data: { nome: d.nome.trim(), cpf: digitos(d.cpf), telefone: digitos(d.telefone), endereco: { rua: d.rua.trim(), numero: d.numero.trim(), bairro: d.bairro.trim(), cidade: d.cidade.trim(), estado: d.estado.trim().toUpperCase() } } } });
    ocupado(f, false);
    if (error) return msg("m-conta", /registered|already/i.test(error.message) ? "Este e-mail já está cadastrado." : /database/i.test(error.message) ? "Não foi possível criar a conta. O CPF pode já estar cadastrado." : "Erro ao criar conta: " + error.message);
    if (!data.session) return msg("m-conta", "Conta criada! Confirme seu e-mail pelo link que enviamos e depois faça login.", true);
    location.href = "painel.html";
  });
};

Pages.login = () => {
  if (qs("inativo")) msg("m-login", "Seu cadastro está desativado. Fale com a TechEmpire.");
  $("#f-login").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f)); ocupado(f, true);
    const { data, error } = await sb.auth.signInWithPassword({ email: d.email.trim(), password: d.senha });
    if (error) { ocupado(f, false); return msg("m-login", /confirm/i.test(error.message) ? "Confirme seu e-mail antes de entrar." : "E-mail ou senha incorretos."); }
    const { data: p } = await sb.from("usuarios").select("is_admin,ativo").eq("id", data.user.id).maybeSingle();
    if (p?.ativo === false) { await sb.auth.signOut(); ocupado(f, false); return msg("m-login", "Seu cadastro está desativado."); }
    location.href = proximaSegura(qs("next")) || (p?.is_admin ? "admin.html" : "painel.html");
  });
};

Pages.recuperar = () => {
  const mostrarNova = () => { $("#f-recuperar").hidden = true; $("#f-nova").hidden = false; };
  if (location.hash.includes("type=recovery")) mostrarNova();
  sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") mostrarNova(); });
  $("#f-recuperar").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target; ocupado(f, true);
    await sb.auth.resetPasswordForEmail(new FormData(f).get("email").trim(), { redirectTo: location.origin + location.pathname });
    ocupado(f, false); msg("m-recuperar", "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.", true);
  });
  $("#f-nova").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, d = Object.fromEntries(new FormData(f));
    if (d.senha.length < 8) return msg("m-nova", "A senha precisa ter pelo menos 8 caracteres.");
    if (d.senha !== d.senha2) return msg("m-nova", "As senhas não coincidem.");
    ocupado(f, true); const { error } = await sb.auth.updateUser({ password: d.senha }); ocupado(f, false);
    if (error) return msg("m-nova", "Não foi possível alterar a senha: " + error.message);
    msg("m-nova", "Senha alterada! Redirecionando…", true); setTimeout(() => location.href = "painel.html", 1200);
  });
};

Pages.painel = async () => {
  $("#ola").textContent = App.perfil?.nome ? "Olá, " + App.perfil.nome.split(" ")[0] + "." : "";
  const carregar = async () => {
    const { data, error } = await sb.from("chamados").select("id,numero,categoria,titulo,status,criado_em").eq("cliente_id", App.session.user.id).order("criado_em", { ascending: false });
    if (error) { $("#lista").innerHTML = '<p class="empty">Não foi possível carregar seus chamados.</p>'; return; }
    const naoLidas = (await sb.from("mensagens").select("*", { count: "exact", head: true }).eq("lida", false).eq("interna", false).neq("remetente_id", App.session.user.id)).count ?? 0;
    const abertos = data.filter(c => !["Concluída", "Cancelada"].includes(c.status)).length;
    $("#kpis").innerHTML = [[data.length, "Chamados"], [abertos, "Em aberto"], [data.length - abertos, "Finalizados"], [naoLidas, "Mensagens novas"]].map(([n, l]) => `<div class="k"><b>${n}</b><span>${l}</span></div>`).join("");
    $("#lista").innerHTML = data.length ? tabela(["Nº", "Serviço", "Título", "Status", "Data"], data.map(c => `<tr class="go" data-act="abrir" data-id="${c.id}"><td><a href="chamado.html?id=${c.id}">${num(c.numero)}</a></td><td>${c.categoria === "site" ? "Site" : "Manutenção"}</td><td>${esc(c.titulo)}</td><td>${pill(c.status)}</td><td>${fmtData(c.criado_em)}</td></tr>`))
      : '<p class="empty">Você ainda não tem chamados. Use os botões acima para abrir o primeiro.</p>';
  };
  Act.abrir = d => location.href = "chamado.html?id=" + d.id;
  await carregar(); setInterval(carregar, 30000);
};

Pages.novoChamado = () => {
  let tipo = qs("tipo") === "site" ? "site" : "manutencao";
  const sel = () => { $$("[data-tipo]").forEach(b => b.classList.toggle("act", b.dataset.tipo === tipo)); $("#f-manutencao").hidden = tipo !== "manutencao"; $("#f-site").hidden = tipo !== "site"; };
  Act.tipo = d => { tipo = d.tipo; sel(); }; sel();
  $("#sel-disp").innerHTML = '<option value="">Selecione</option>' + opts(DISPOSITIVOS); $("#sel-atend").innerHTML = opts(ATENDIMENTO);
  $("#sel-tsite").innerHTML = '<option value="">Selecione</option>' + opts(TIPOS_SITE);
  $$(".sel-pag").forEach(s => s.innerHTML = opts(FORMAS));
  async function criar(f, cat, titulo, descricao, tabela, detalhe, idMsg) {
    ocupado(f, true);
    const { data: ch, error } = await sb.from("chamados").insert({ cliente_id: App.session.user.id, categoria: cat, titulo, descricao }).select("id,numero").single();
    if (error) { ocupado(f, false); return msg(idMsg, "Não foi possível registrar o chamado: " + error.message); }
    const e2 = (await sb.from(tabela).insert({ chamado_id: ch.id, ...detalhe })).error;
    const falhas = await enviarArquivos(ch.id, [...(f.querySelector("input[type=file]")?.files || [])]);
    ocupado(f, false);
    location.href = `chamado.html?id=${ch.id}&novo=1${e2 ? "&det=0" : ""}${falhas ? "&anexos=" + falhas : ""}`;
  }
  $("#f-manutencao").addEventListener("submit", e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (!d.tipo_dispositivo || !d.titulo.trim() || !d.descricao.trim()) return msg("m-manutencao", "Preencha tipo de dispositivo, título e descrição.");
    const desc = `${d.descricao.trim()}\n\nSintomas/informações extras: ${d.extras.trim() || "—"}\nTipo de atendimento: ${d.atendimento}\nPagamento desejado: ${d.pagamento}`;
    criar(e.target, "manutencao", d.titulo.trim(), desc, "detalhes_manutencao", { tipo_dispositivo: d.tipo_dispositivo, marca: d.marca.trim() || null, modelo: d.modelo.trim() || null, problema_inicio: d.descricao.trim() }, "m-manutencao"); });
  $("#f-site").addEventListener("submit", e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (!d.nome_projeto.trim() || !d.tipo_site || !d.descricao.trim() || !d.objetivo.trim()) return msg("m-site", "Preencha nome do projeto, tipo, descrição e objetivo.");
    const desc = `${d.descricao.trim()}\n\nEmpresa/marca: ${d.empresa.trim() || "—"}\nReferências: ${d.referencias.trim() || "—"}\nPagamento desejado: ${d.pagamento}`;
    criar(e.target, "site", "Site: " + d.nome_projeto.trim(), desc, "detalhes_projetos", { nome_projeto: d.nome_projeto.trim(), tipo_site: d.tipo_site, objetivo: d.objetivo.trim(), funcionalidades: d.funcionalidades.trim() || null, estilo_visual: d.estilo_visual.trim() || null, cores_referencias: d.cores.trim() || null, prazo_desejado: d.prazo.trim() || null, orcamento_estimado: d.orcamento ? +d.orcamento : null }, "m-site"); });
};

Pages.chamado = async () => {
  const id = qs("id"); const { data: c } = await sb.from("chamados").select("*").eq("id", id).maybeSingle();
  if (!c) { $("#conteudo").innerHTML = '<p class="empty">Chamado não encontrado.</p>'; return; }
  if (qs("novo")) msg("m-topo", `Chamado ${num(c.numero)} registrado com sucesso! Você acompanha tudo por aqui.` + (qs("det") === "0" ? " (Alguns detalhes técnicos não foram salvos; informe-os por mensagem.)" : "") + (qs("anexos") ? ` ${qs("anexos")} arquivo(s) não puderam ser enviados (limite de 50 MB; imagens, vídeos e PDF).` : ""), !qs("anexos"));
  const m = c.categoria !== "site"; const dt = (await sb.from(m ? "detalhes_manutencao" : "detalhes_projetos").select("*").eq("chamado_id", id).maybeSingle()).data || {};
  $("#conteudo").innerHTML = `<p><a href="painel.html">← Meus chamados</a></p><h2>${num(c.numero)} · ${esc(c.titulo)}</h2><p>${pill(c.status)} <span class="sub">Aberto em ${fmtData(c.criado_em)}</span></p>
  <div class="box"><h3>Sua solicitação</h3><p style="white-space:pre-wrap">${esc(c.descricao)}</p>${m ? `<p>${esc(dt.tipo_dispositivo)} ${esc(dt.marca)} ${esc(dt.modelo)}</p>` : `<p>Tipo: ${esc(dt.tipo_site)} · Prazo desejado: ${esc(dt.prazo_desejado) || "—"}</p>`}</div>
  ${m && dt.solucao && c.status === "Concluída" ? `<div class="box"><h3>Solução aplicada</h3><p style="white-space:pre-wrap">${esc(dt.solucao)}</p><p class="sub">Concluído em ${fmtData(c.concluido_em)}</p></div>` : ""}
  ${!m && dt.proposta ? `<div class="box"><h3>Atualizações do projeto</h3><p style="white-space:pre-wrap">${esc(dt.proposta)}</p>${dt.prazo_estimado ? `<p>Prazo estimado: ${esc(dt.prazo_estimado)}</p>` : ""}</div>` : ""}
  <div class="box"><h3>Orçamento e pagamento</h3><div id="pg"></div></div>
  <div class="box"><h3>Andamento</h3><div id="hist"></div></div>
  <div class="box"><h3>Arquivos e vídeos</h3><div id="arq"></div></div>
  <div class="box"><h3>💬 Conversa com a TechEmpire</h3><div id="chat"></div></div>`;
  const atualizar = () => Promise.all([desenharPagamentos($("#pg"), id), desenharHistorico($("#hist"), id), desenharArquivos($("#arq"), id)]);
  await atualizar(); document.addEventListener("chat-arquivos", atualizar); iniciarChat($("#chat"), id, false);
};

Pages.perfil = () => {
  const p = App.perfil || {}, en = p.endereco || {};
  const campos = { nome: p.nome, telefone: p.telefone, rua: en.rua, numero: en.numero, bairro: en.bairro, cidade: en.cidade, estado: en.estado };
  const f = $("#f-perfil"); Object.entries(campos).forEach(([k, v]) => { if (f[k]) f[k].value = v || ""; }); f.email.value = p.email || App.session.user.email; f.cpf.value = p.cpf || "";
  f.addEventListener("submit", async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (!d.nome.trim()) return msg("m-perfil", "Informe seu nome."); ocupado(f, true);
    const { error } = await sb.from("usuarios").update({ nome: d.nome.trim(), telefone: digitos(d.telefone), endereco: { rua: d.rua.trim(), numero: d.numero.trim(), bairro: d.bairro.trim(), cidade: d.cidade.trim(), estado: d.estado.trim().toUpperCase() } }).eq("id", App.session.user.id);
    ocupado(f, false); msg("m-perfil", error ? "Não foi possível salvar." : "Dados atualizados.", !error); });
  $("#f-senha").addEventListener("submit", async e => { e.preventDefault(); const f2 = e.target, d = Object.fromEntries(new FormData(f2));
    if (d.senha.length < 8) return msg("m-senha", "A senha precisa ter pelo menos 8 caracteres."); if (d.senha !== d.senha2) return msg("m-senha", "As senhas não coincidem.");
    ocupado(f2, true); const { error } = await sb.auth.updateUser({ password: d.senha }); ocupado(f2, false); msg("m-senha", error ? "Não foi possível alterar: " + error.message : "Senha alterada.", !error); if (!error) f2.reset(); });
};

/* ---------- ADMIN: painel (início, chamados, clientes, leads, usuários) ---------- */
Pages.admin = async () => {
  const badge = n => n ? `<span class="pill" title="Mensagens não lidas">💬 ${n}</span>` : "";
  async function carregarChamados(cli) { let q = sb.from("chamados").select("id,numero,cliente_id,categoria,titulo,status,prioridade,criado_em").order("criado_em", { ascending: false }).limit(500); if (cli) q = q.eq("cliente_id", cli); const { data, error } = await q; if (error) throw error; return comClientes(data || []); }
  async function mapaNaoLidas() { const { data } = await sb.from("mensagens").select("chamado_id").eq("lida", false).eq("interna", false).neq("remetente_id", App.session.user.id); const m = {}; (data || []).forEach(x => m[x.chamado_id] = (m[x.chamado_id] || 0) + 1); return m; }
  async function mapaPagamentos() { const { data } = await sb.from("pagamentos").select("chamado_id,status,valor,criado_em").order("criado_em"); const m = {}; (data || []).forEach(p => m[p.chamado_id] = p); return m; }
  async function mudarStatus(id, de, para) { const { error } = await sb.from("chamados").update({ status: para, atualizado_em: new Date().toISOString() }).eq("id", id); if (!error) await sb.from("historico_status").insert({ chamado_id: id, status_anterior: de, status_novo: para, responsavel_id: App.session.user.id }); return !error; }
  Chg.rapido = async (d, el) => { const ok = await mudarStatus(d.id, d.de, el.value); toast(ok ? "Status atualizado" : "Erro ao mudar o status"); rota(); };
  const Rotas = {
    async inicio() {
      const c = async (t, fn) => { let q = sb.from(t).select("*", { count: "exact", head: true }); if (fn) q = fn(q); return (await q).count ?? 0; };
      const r = await Promise.all([c("usuarios", q => q.eq("is_admin", false)), c("chamados"), c("chamados", q => q.in("status", ["Nova chamada", "Aguardando análise"])), c("chamados", q => q.eq("status", "Em andamento")), c("chamados", q => q.eq("status", "Concluída")), c("chamados", q => q.eq("categoria", "site")), c("forleads"), c("pagamentos", q => q.in("status", ["Pendente", "Aguardando pagamento"])), c("pagamentos", q => q.eq("status", "Pago")), c("mensagens", q => q.eq("lida", false).eq("interna", false).neq("remetente_id", App.session.user.id))]);
      const L = ["Clientes", "Chamados", "Pendentes", "Em andamento", "Concluídos", "Projetos de site", "Leads", "Pagamentos pendentes", "Pagamentos confirmados", "Mensagens não lidas"];
      const [lista, nl] = await Promise.all([carregarChamados(), mapaNaoLidas()]);
      const link = c => `<a class="rowlink" href="admin-chamado.html?id=${c.id}"><span><b>${num(c.numero)}</b> · ${esc(c.titulo)}<small>${esc(c.cliente?.nome)} · ${fmtData(c.criado_em)}</small></span>${badge(nl[c.id])}</a>`;
      const filaItem = c => `<div class="rowlink"><a href="admin-chamado.html?id=${c.id}" style="text-decoration:none;flex:1"><b>${num(c.numero)}</b> · ${esc(c.titulo)}<small>${esc(c.cliente?.nome)} · ${c.categoria === "site" ? "Site" : "Manutenção"} · ${fmtData(c.criado_em)}</small></a>${badge(nl[c.id])}<button class="btn primary sm" data-act="atender" data-id="${c.id}" data-de="${esc(c.status)}">Atender</button></div>`;
      const fila = lista.filter(x => ["Nova chamada", "Aguardando análise", "Aprovada"].includes(x.status)).sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em)).slice(0, 8), andamento = lista.filter(x => x.status === "Em andamento").slice(0, 8), comMsg = lista.filter(x => nl[x.id]).slice(0, 6);
      const cont = Object.fromEntries(STATUS.map(s => [s, lista.filter(x => x.status === s).length])), mx = Math.max(1, ...Object.values(cont));
      $("#conteudo-admin").innerHTML = `<h2>Início</h2><div class="kpis">${r.map((n, i) => `<div class="k"><b>${n}</b><span>${L[i]}</span></div>`).join("")}</div>
      <div class="box"><h3>⚡ Fila de atendimento</h3><p class="sub" style="margin-bottom:12px">Do mais antigo para o mais novo. Clique em Atender para começar.</p>${fila.length ? fila.map(filaItem).join("") : '<p class="empty">Nenhum chamado esperando. Tudo em dia!</p>'}</div>
      <div class="two"><div class="box"><h3>🔧 Em andamento</h3>${andamento.length ? andamento.map(link).join("") : '<p class="empty">Nenhum chamado em andamento.</p>'}</div>
      <div class="box"><h3>💬 Mensagens não lidas</h3>${comMsg.length ? comMsg.map(link).join("") : '<p class="empty">Nenhuma mensagem nova.</p>'}</div></div>
      <div class="box"><h3>Chamados por status</h3>${STATUS.map(s => `<div class="barra"><span>${esc(s)}</span><div><i style="width:${cont[s] / mx * 100}%"></i></div><b>${cont[s]}</b></div>`).join("")}</div>`;
    },
    async chamados(param) {
      const cli = new URLSearchParams(param || "").get("c"); let modo = Rotas._modo || "lista", chip = "";
      const [todos, nl, pg] = await Promise.all([carregarChamados(cli), mapaNaoLidas(), mapaPagamentos()]);
      $("#conteudo-admin").innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">Chamados${cli ? " do cliente" : ""}</h2><div class="row"><button class="btn sm" data-act="modo" data-m="lista">☰ Lista</button><button class="btn sm" data-act="modo" data-m="quadro">▦ Quadro</button></div></div>
        <div class="chips" id="chips"></div>
        <div class="bar"><input id="bq" placeholder="Buscar por título, nº ou cliente"><select id="bc"><option value="">Todas as categorias</option><option value="manutencao">Manutenção</option><option value="site">Site</option></select><select id="bp"><option value="">Qualquer prioridade</option>${opts(PRIORIDADES)}</select><select id="bo"><option value="desc">Mais recentes</option><option value="asc">Mais antigos</option></select></div><div id="tb"></div>`;
      const desenhar = () => {
        const q = $("#bq").value.trim().toLowerCase(), cat = $("#bc").value, pr = $("#bp").value, asc = $("#bo").value === "asc";
        let l = todos.filter(c => (!cat || c.categoria === cat) && (!pr || c.prioridade === pr) && (!q || `${c.titulo} ${num(c.numero)} ${c.numero} ${c.cliente?.nome || ""}`.toLowerCase().includes(q)));
        const cont = {}; l.forEach(c => cont[c.status] = (cont[c.status] || 0) + 1);
        $("#chips").innerHTML = `<button class="chip ${!chip ? "on" : ""}" data-act="chip" data-s="">Todos <b>${l.length}</b></button>` + STATUS.map(s => `<button class="chip ${chip === s ? "on" : ""}" data-act="chip" data-s="${esc(s)}">${esc(s)} <b>${cont[s] || 0}</b></button>`).join("");
        $$("[data-act=modo]").forEach(b => b.classList.toggle("primary", b.dataset.m === modo));
        if (modo === "lista") {
          if (chip) l = l.filter(c => c.status === chip); l.sort((a, b) => asc ? new Date(a.criado_em) - new Date(b.criado_em) : new Date(b.criado_em) - new Date(a.criado_em));
          $("#tb").innerHTML = tabela(["Nº", "Cliente", "Serviço", "Título", "Prioridade", "Status", "Pagamento", "", "Data", ""], l.map(c => `<tr><td><a href="admin-chamado.html?id=${c.id}">${num(c.numero)}</a></td><td>${esc(c.cliente?.nome)}</td><td>${c.categoria === "site" ? "Site" : "Manutenção"}</td><td><a href="admin-chamado.html?id=${c.id}">${esc(c.titulo)}</a></td><td>${c.prioridade ? pill(c.prioridade, true) : "—"}</td><td><select class="mini" data-chg="rapido" data-id="${c.id}" data-de="${esc(c.status)}" aria-label="Alterar status">${opts(STATUS, c.status)}</select></td><td>${pg[c.id] ? pill(pg[c.id].status, true) : "—"}</td><td>${badge(nl[c.id])}</td><td>${fmtData(c.criado_em)}</td><td>${["Nova chamada", "Aguardando análise", "Aprovada"].includes(c.status) ? `<button class="btn primary sm" data-act="atender" data-id="${c.id}" data-de="${esc(c.status)}">Atender</button>` : ""}</td></tr>`));
        } else {
          l.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
          $("#tb").innerHTML = `<p class="sub">Arraste os cartões entre as colunas para mudar o status (no celular, use a Lista).</p><div class="kanban">${STATUS.map(s => { const col = l.filter(c => c.status === s);
            return `<div class="col" data-s="${esc(s)}"><h4>${esc(s)} <span class="pill gray">${col.length}</span></h4>${col.map(c => `<div class="kc" draggable="true" data-id="${c.id}" data-de="${esc(s)}"><a href="admin-chamado.html?id=${c.id}"><b>${num(c.numero)}</b></a> ${badge(nl[c.id])}${c.prioridade ? " " + pill(c.prioridade, true) : ""}<div>${esc(c.titulo)}</div><small>${esc(c.cliente?.nome)} · ${c.categoria === "site" ? "Site" : "Manutenção"} · ${new Date(c.criado_em).toLocaleDateString("pt-BR")}</small></div>`).join("") || '<p class="empty" style="padding:6px">Vazio</p>'}</div>`; }).join("")}</div>`;
          $$(".kc").forEach(k => k.addEventListener("dragstart", e => e.dataTransfer.setData("text/plain", JSON.stringify({ id: k.dataset.id, de: k.dataset.de }))));
          $$(".col").forEach(col => { col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("over"); }); col.addEventListener("dragleave", () => col.classList.remove("over"));
            col.addEventListener("drop", async e => { e.preventDefault(); col.classList.remove("over"); let d; try { d = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
              if (d.de === col.dataset.s) return; const ok = await mudarStatus(d.id, d.de, col.dataset.s); toast(ok ? "Status atualizado" : "Erro ao mudar o status"); Rotas.chamados(param); }); });
        }
      };
      Act.modo = d => { modo = d.m; Rotas._modo = modo; desenhar(); }; Act.chip = d => { chip = d.s; desenhar(); };
      ["bq", "bc", "bp", "bo"].forEach(i => $("#" + i).oninput = desenhar); desenhar();
    },
    async mensagens() {
      const me = App.session.user.id; const { data: ms } = await sb.from("mensagens").select("chamado_id,remetente_id,conteudo,lida,interna,criado_em").order("criado_em", { ascending: false }).limit(400);
      const g = {}; (ms || []).forEach(m => { const x = g[m.chamado_id] = g[m.chamado_id] || { ultima: m, nl: 0 }; if (!m.lida && !m.interna && m.remetente_id !== me) x.nl++; });
      const ids = Object.keys(g); const { data: chs } = ids.length ? await sb.from("chamados").select("id,numero,titulo,cliente_id").in("id", ids) : { data: [] };
      const L = (await comClientes(chs || [])).sort((a, b) => (g[b.id].nl - g[a.id].nl) || (new Date(g[b.id].ultima.criado_em) - new Date(g[a.id].ultima.criado_em)));
      $("#conteudo-admin").innerHTML = `<h2>Mensagens</h2><p class="sub">Conversas com clientes. As não lidas aparecem primeiro.</p>` + (L.length ? L.map(c => { const x = g[c.id]; return `<a class="rowlink" href="admin-chamado.html?id=${c.id}"><span><b>${num(c.numero)}</b> · ${esc(c.titulo)}<small>${esc(c.cliente?.nome)} · ${fmtData(x.ultima.criado_em)}</small><small>${x.ultima.interna ? "Nota interna: " : ""}${esc(String(x.ultima.conteudo).slice(0, 110))}</small></span>${badge(x.nl)}</a>`; }).join("") : '<p class="empty">Nenhuma conversa ainda.</p>');
    },
    async pagamentos() {
      const { data } = await sb.from("pagamentos").select("*").order("criado_em", { ascending: false }).limit(300);
      const ids = [...new Set((data || []).map(p => p.chamado_id))]; const { data: chs } = ids.length ? await sb.from("chamados").select("id,numero,cliente_id").in("id", ids) : { data: [] };
      const cm = Object.fromEntries((await comClientes(chs || [])).map(c => [c.id, c])); const soma = f => (data || []).filter(f).reduce((t, p) => t + Number(p.valor || 0), 0);
      $("#conteudo-admin").innerHTML = `<h2>Pagamentos</h2><div class="kpis"><div class="k"><b>${brl(soma(p => p.status === "Pago"))}</b><span>Recebido</span></div><div class="k"><b>${brl(soma(p => ["Pendente", "Aguardando pagamento"].includes(p.status)))}</b><span>A receber</span></div><div class="k"><b>${brl(soma(p => p.status === "Parcialmente pago"))}</b><span>Parcialmente pago</span></div></div>
      <div class="bar"><select id="pf"><option value="">Todos os status</option>${opts(PAGAMENTO_STATUS)}</select></div><div id="tb"></div>`;
      const d = () => { const f = $("#pf").value; $("#tb").innerHTML = tabela(["Chamado", "Cliente", "Valor", "Forma", "Status", "Origem", "Data"], (data || []).filter(p => !f || p.status === f).map(p => { const c = cm[p.chamado_id] || {}; return `<tr><td><a href="admin-chamado.html?id=${p.chamado_id}">${c.numero ? num(c.numero) : "—"}</a></td><td>${esc(c.cliente?.nome)}</td><td>${brl(p.valor)}</td><td>${esc(p.forma)}</td><td>${pill(p.status)}</td><td>${p.manual ? "Registro manual" : "Online"}</td><td>${fmtData(p.pago_em || p.criado_em)}</td></tr>`; })); };
      $("#pf").oninput = d; d();
    },
    async clientes() {
      $("#conteudo-admin").innerHTML = `<h2>Clientes</h2><div class="bar"><input id="bq" placeholder="Nome, CPF, telefone ou e-mail"></div><div id="ed"></div><div id="tb"></div>`;
      const carregar = async () => {
        let q = sb.from("usuarios").select("*").eq("is_admin", false).order("criado_em", { ascending: false }); const t = $("#bq").value.trim().replace(/[,()%]/g, " ");
        if (t) q = q.or(`nome.ilike.%${t}%,cpf.ilike.%${digitos(t) || "@@"}%,telefone.ilike.%${t}%,email.ilike.%${t}%`);
        const { data } = await q; Rotas._clientes = data || [];
        $("#tb").innerHTML = tabela(["Nome", "E-mail", "Telefone", "CPF", "Ativo", ""], (data || []).map(u => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(u.telefone)}</td><td>${esc(u.cpf)}</td><td>${u.ativo === false ? "Não" : "Sim"}</td><td><a class="btn sm" href="#/chamados?c=${u.id}">Chamados</a> <button class="btn sm" data-act="editarCli" data-id="${u.id}">Editar</button> <button class="btn sm" data-act="ativarCli" data-id="${u.id}" data-v="${u.ativo === false}">${u.ativo === false ? "Ativar" : "Desativar"}</button></td></tr>`));
      };
      Rotas._recarregar = carregar; $("#bq").oninput = carregar; carregar();
    },
    async leads() {
      const { data, error } = await sb.from("forleads").select("*").order("criado_em", { ascending: false });
      if (error) return $("#conteudo-admin").innerHTML = '<p class="empty">Erro ao carregar leads. Rode o SQL 2-pagamentos-leads.sql.</p>';
      $("#conteudo-admin").innerHTML = `<h2>Leads</h2><div class="box"><h3>Novo lead</h3><form id="f-lead"><div class="two"><label>Nome<input name="nome" required></label><label>Telefone<input name="telefone"></label><label>E-mail<input name="email" type="email"></label><label>Origem<input name="origem" placeholder="Instagram, indicação…"></label></div><label>Serviço de interesse<input name="servico"></label><label>Observações comerciais<textarea name="obs"></textarea></label><button class="btn primary" type="submit">Cadastrar lead</button></form></div>
      ${tabela(["Nome", "Contato", "Origem", "Interesse", "Etapa", ""], data.map(l => `<tr><td>${esc(l.nome)}<br><small>${esc(l.observacoes)}</small></td><td>${esc(l.telefone)}<br>${esc(l.email)}</td><td>${esc(l.origem)}</td><td>${esc(l.servico_interesse)}</td><td><select data-chg="etapa" data-id="${l.id}">${opts(ETAPAS_LEAD, l.etapa)}</select></td><td><button class="btn sm" data-act="converter" data-id="${l.id}" data-email="${esc(l.email)}">Converter</button> <button class="btn sm danger" data-act="delLead" data-id="${l.id}">Excluir</button></td></tr>`))}`;
      $("#f-lead").addEventListener("submit", async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const n = v => v.trim() || null;
        const { error } = await sb.from("forleads").insert({ nome: d.nome.trim(), telefone: n(d.telefone), email: n(d.email), origem: n(d.origem), servico_interesse: n(d.servico), observacoes: n(d.obs) }); toast(error ? "Erro ao cadastrar" : "Lead cadastrado"); if (!error) Rotas.leads(); });
    },
    async usuarios() {
      const { data } = await sb.from("usuarios").select("*").eq("is_admin", true);
      $("#conteudo-admin").innerHTML = `<h2>Administradores</h2>${tabela(["Nome", "E-mail", "Ativo", ""], (data || []).map(u => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${u.ativo === false ? "Não" : "Sim"}</td><td>${u.id === App.session.user.id ? "" : `<button class="btn sm" data-act="admin" data-id="${u.id}" data-v="false">Remover admin</button> <button class="btn sm" data-act="ativarCli" data-id="${u.id}" data-v="${u.ativo === false}">${u.ativo === false ? "Ativar" : "Desativar"}</button>`}</td></tr>`))}
      <div class="box" style="margin-top:16px"><h3>Promover cliente a administrador</h3><div class="bar"><input id="ae" type="email" placeholder="E-mail de um cliente já cadastrado"><button class="btn primary" data-act="promover">Promover</button></div></div>`;
    }
  };
  Act.atender = async d => { const t = new Date().toISOString(); const { error } = await sb.from("chamados").update({ status: "Em andamento", assumido_em: t, admin_id: App.session.user.id, atualizado_em: t }).eq("id", d.id);
    if (error) return toast("Não foi possível iniciar o atendimento.");
    await sb.from("historico_status").insert({ chamado_id: d.id, status_anterior: d.de, status_novo: "Em andamento", responsavel_id: App.session.user.id }); location.href = "admin-chamado.html?id=" + d.id; };
  Act.abrirAdm = d => location.href = "admin-chamado.html?id=" + d.id;
  Act.editarCli = d => { const u = Rotas._clientes.find(x => x.id === d.id); $("#ed").innerHTML = `<form class="box" id="f-ed"><h3>Editar cliente</h3><div class="two"><label>Nome<input name="nome" value="${esc(u.nome)}" required></label><label>Telefone<input name="telefone" value="${esc(u.telefone)}"></label></div><div class="row"><button class="btn primary" type="submit">Salvar</button><button class="btn" type="button" data-act="cancelarEd">Cancelar</button></div></form>`;
    $("#f-ed").addEventListener("submit", async e => { e.preventDefault(); const f = e.target; const { error } = await sb.from("usuarios").update({ nome: f.nome.value.trim(), telefone: digitos(f.telefone.value) }).eq("id", d.id); toast(error ? "Erro ao salvar" : "Cliente atualizado"); $("#ed").innerHTML = ""; Rotas._recarregar(); }); };
  Act.cancelarEd = () => $("#ed").innerHTML = "";
  Act.ativarCli = async d => { const a = d.v === "true"; if (!confirm(a ? "Ativar este cadastro?" : "Desativar este cadastro? O usuário não conseguirá mais entrar.")) return; await sb.from("usuarios").update({ ativo: a }).eq("id", d.id); rota(); };
  Act.admin = async d => { if (!confirm("Remover a permissão de administrador?")) return; await sb.from("usuarios").update({ is_admin: false }).eq("id", d.id); rota(); };
  Act.promover = async () => { const e = $("#ae").value.trim().toLowerCase(); if (!e || !confirm("Dar acesso administrativo a " + e + "?")) return; const { data, error } = await sb.from("usuarios").update({ is_admin: true }).eq("email", e).select(); toast(error || !data?.length ? "Usuário não encontrado" : "Promovido a administrador"); rota(); };
  Chg.etapa = async d => { const el = $(`[data-chg=etapa][data-id="${d.id}"]`); const { error } = await sb.from("forleads").update({ etapa: el.value }).eq("id", d.id); toast(error ? "Erro" : "Etapa atualizada"); };
  Act.delLead = async d => { if (!confirm("Excluir este lead?")) return; await sb.from("forleads").delete().eq("id", d.id); Rotas.leads(); };
  Act.converter = async d => { if (!d.email) return toast("O lead precisa ter e-mail para converter."); const { data: u } = await sb.from("usuarios").select("id").eq("email", d.email.toLowerCase()).maybeSingle();
    if (!u) return toast("Este contato ainda não criou conta. Peça que se cadastre com este e-mail e converta depois.");
    const { error } = await sb.from("forleads").update({ cliente_id: u.id, etapa: "Convertido em cliente" }).eq("id", d.id); toast(error ? "Erro" : "Lead vinculado ao cliente existente"); Rotas.leads(); };
  async function rota() { const [p, param] = (location.hash.replace("#/", "") || "inicio").split("?"); const nome = Rotas[p] && !p.startsWith("_") ? p : "inicio";
    $$(".side a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#/" + (nome === "inicio" ? "" : nome) || (nome === "inicio" && a.getAttribute("href") === "#/")));
    try { await Rotas[nome](param); } catch (e) { $("#conteudo-admin").innerHTML = '<p class="empty">Erro ao carregar.</p>'; } }
  window.addEventListener("hashchange", rota); rota();
  sb.channel("chamados-live").on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, () => { toast("Chamados atualizados"); const p = location.hash.replace("#/", ""); if (!p || p.startsWith("chamados")) rota(); }).subscribe();
  sb.channel("msgs-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, p => { if (p.new.remetente_id !== App.session.user.id && !p.new.interna) { toast("💬 Nova mensagem de cliente"); if (!location.hash.replace("#/", "")) rota(); } }).subscribe();
  setInterval(() => { if (!location.hash.replace("#/", "")) rota(); }, 60000);
};

/* ---------- ADMIN: detalhe e execução do chamado ---------- */
Pages.adminChamado = async () => {
  const id = qs("id"); const { data: c } = await sb.from("chamados").select("*").eq("id", id).maybeSingle();
  if (!c) { $("#conteudo").innerHTML = '<p class="empty">Chamado não encontrado.</p>'; return; }
  const m = c.categoria !== "site"; const dt = (await sb.from(m ? "detalhes_manutencao" : "detalhes_projetos").select("*").eq("chamado_id", id).maybeSingle()).data || {};
  const u = (await sb.from("usuarios").select("nome,email,telefone,cpf,endereco").eq("id", c.cliente_id).maybeSingle()).data || {};
  const fim = c.status === "Concluída";
  $("#conteudo").innerHTML = `<p><a href="admin.html#/chamados">← Chamados</a></p><h2>${num(c.numero)} · ${esc(c.titulo)}</h2>
  <div class="box"><h3>Cliente</h3>${esc(u.nome)} · ${esc(u.email)} · ${esc(u.telefone)}<br>CPF ${esc(u.cpf)}<br>${u.endereco ? esc(Object.values(u.endereco).join(", ")) : ""}<p class="row" style="margin-top:10px"><a class="btn sm" href="admin.html#/chamados?c=${c.cliente_id}">Todos os chamados deste cliente</a>${digitos(u.telefone).length >= 10 ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${digitos(u.telefone).length <= 11 ? "55" : ""}${digitos(u.telefone)}">WhatsApp</a>` : ""}</p></div>
  <div class="box"><h3>Solicitação</h3><p style="white-space:pre-wrap">${esc(c.descricao)}</p><p>Criado: ${fmtData(c.criado_em)} · Início: ${fmtData(c.assumido_em)} · Conclusão: ${fmtData(c.concluido_em)}</p>
  <div class="two" style="max-width:560px"><label>Status<select id="st">${opts(STATUS, c.status)}</select></label><label>Prioridade<select id="pri"><option value="">—</option>${opts(PRIORIDADES, c.prioridade)}</select></label></div>
  <div class="row" style="margin-top:12px">${!c.assumido_em && !fim ? '<button class="btn primary" data-act="iniciar">Iniciar atendimento</button>' : ""}<button class="btn" data-act="salvar">Salvar</button>${fim ? "" : '<button class="btn primary" data-act="concluir">Concluir chamada</button>'}<button class="btn danger" data-act="excluir">Excluir</button></div><div class="msg" id="m-top"></div></div>
  <div class="box"><h3>${m ? "Execução técnica" : "Projeto do site"}</h3>
  ${m ? `<p>${esc(dt.tipo_dispositivo)} ${esc(dt.marca)} ${esc(dt.modelo)}</p><label>Diagnóstico técnico<textarea id="dg">${esc(dt.diagnostico)}</textarea></label><label>Solução aplicada / resumo do serviço (visível ao cliente ao concluir)<textarea id="sl">${esc(dt.solucao)}</textarea></label>`
  : `<p>Tipo: ${esc(dt.tipo_site)} · Objetivo: ${esc(dt.objetivo)}<br>Funcionalidades: ${esc(dt.funcionalidades)}<br>Estilo/cores: ${esc(dt.estilo_visual)} ${esc(dt.cores_referencias)}<br>Prazo desejado: ${esc(dt.prazo_desejado)} · Orçamento do cliente: ${dt.orcamento_estimado != null ? brl(dt.orcamento_estimado) : "—"}</p><label>Atualizações, links de demonstração e endereço final (visível ao cliente)<textarea id="sl">${esc(dt.proposta)}</textarea></label><label>Prazo estimado<input id="pe" value="${esc(dt.prazo_estimado)}"></label>`}</div>
  <div class="box"><h3>Pagamentos</h3><div id="pg"></div><form id="f-pg" style="margin-top:12px"><div class="two"><label>Valor (R$)<input name="valor" type="number" step="0.01" min="0" required></label><label>Forma<select name="forma">${opts(FORMAS)}</select></label></div><label style="max-width:300px">Status<select name="status">${opts(PAGAMENTO_STATUS)}</select></label><button class="btn" type="submit">Registrar pagamento (manual)</button></form></div>
  <div class="box"><h3>Arquivos e vídeos</h3><div id="arq"></div><form id="f-arq" style="margin-top:12px"><label>Anexar fotos/vídeos da execução (visíveis ao cliente)<input type="file" name="f" multiple accept="image/*,video/*,.pdf,.txt" required></label><button class="btn" type="submit">Enviar</button></form></div>
  <div class="box"><h3>💬 Conversa com o cliente</h3><div id="chat"></div></div>
  <div class="box"><h3>Histórico de status</h3><div id="hist"></div></div>`;
  const atualizar = () => Promise.all([desenharPagamentos($("#pg"), id), desenharArquivos($("#arq"), id), desenharHistorico($("#hist"), id)]);
  await atualizar(); document.addEventListener("chat-arquivos", atualizar); iniciarChat($("#chat"), id, true);
  async function salvar(extra = {}) {
    const novo = extra.status || $("#st").value; let e = (await sb.from("chamados").update({ status: novo, atualizado_em: new Date().toISOString(), ...extra }).eq("id", id)).error;
    if (!e && novo !== c.status) { await sb.from("historico_status").insert({ chamado_id: id, status_anterior: c.status, status_novo: novo, responsavel_id: App.session.user.id }); c.status = novo; }
    const np = $("#pri").value || null; if (!e && np !== (c.prioridade || null)) { const e3 = (await sb.from("chamados").update({ prioridade: np }).eq("id", id)).error; if (e3) toast("Prioridade não salva (valor não aceito pelo banco)."); else c.prioridade = np; }
    if (!e) e = (await sb.from(m ? "detalhes_manutencao" : "detalhes_projetos").update(m ? { diagnostico: $("#dg").value, solucao: $("#sl").value } : { proposta: $("#sl").value, prazo_estimado: $("#pe").value }).eq("chamado_id", id)).error;
    return e;
  }
  const refaz = () => Pages.adminChamado();
  Act.salvar = async () => { const e = await salvar(); toast(e ? "Erro ao salvar" : "Alterações salvas"); if (!e) refaz(); };
  Act.iniciar = async () => { const e = await salvar({ status: "Em andamento", assumido_em: new Date().toISOString(), admin_id: App.session.user.id }); toast(e ? "Erro" : "Atendimento iniciado"); if (!e) refaz(); };
  Act.concluir = async () => { if (!$("#sl").value.trim()) return msg("m-top", "Registre a solução/resumo do serviço antes de concluir."); const e = await salvar({ status: "Concluída", concluido_em: new Date().toISOString() }); toast(e ? "Erro" : "Chamado concluído"); if (!e) refaz(); };
  Act.excluir = async () => { if (!confirm("Excluir este chamado definitivamente? Isso não pode ser desfeito.")) return; const { error } = await sb.from("chamados").delete().eq("id", id); if (error) return toast("Erro ao excluir"); location.href = "admin.html#/chamados"; };
  $("#f-pg").addEventListener("submit", async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    const { error } = await sb.from("pagamentos").insert({ chamado_id: id, valor: +d.valor, forma: d.forma, status: d.status, manual: true, pago_em: d.status === "Pago" ? new Date().toISOString() : null, registrado_por: App.session.user.id }); toast(error ? "Erro ao registrar" : "Pagamento registrado"); if (!error) { e.target.reset(); atualizar(); } });
  $("#f-arq").addEventListener("submit", async e => { e.preventDefault(); const f = e.target; ocupado(f, true); const falhas = await enviarArquivos(id, [...f.f.files]); ocupado(f, false); toast(falhas ? falhas + " arquivo(s) falharam (máx. 50 MB)" : "Arquivos enviados"); f.reset(); atualizar(); });
};

document.addEventListener("DOMContentLoaded", boot);
