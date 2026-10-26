/* Página de manutenção preventiva e detectiva: PC em 3D (three.js) que o visitante gira e clica. */
Pages.manutencao = () => {
  const PARTES = {
    fans:  { nome: "Ventoinhas e filtros", prev: ["Remover a poeira a cada 3 a 6 meses (em ambientes com pó ou pets, com mais frequência)", "Conferir se os filtros de ar não estão entupidos"], det: ["Prestar atenção a ruídos e vibração fora do normal", "Verificar se todas as ventoinhas giram quando o PC está sob carga"] },
    cpu:   { nome: "Processador e pasta térmica", prev: ["Trocar a pasta térmica a cada 1 a 2 anos, ou antes se a temperatura subir", "Limpar o dissipador e conferir o encaixe do cooler"], det: ["Monitorar a temperatura com o PC sob carga", "Observar quedas de desempenho causadas por superaquecimento"] },
    ram:   { nome: "Memória RAM", prev: ["Reencaixar os módulos e limpar a poeira dos contatos com cuidado", "Não misturar módulos de padrões ou velocidades muito diferentes"], det: ["Rodar um teste de memória para encontrar erros escondidos", "Investigar travamentos e telas azuis que aparecem sem motivo"] },
    gpu:   { nome: "Placa de vídeo", prev: ["Limpar ventoinhas e dissipador da placa", "Manter os drivers atualizados"], det: ["Acompanhar temperatura e rotação das ventoinhas em jogos ou renderização", "Ficar atento a travamentos, falhas na imagem ou artefatos na tela"] },
    disco: { nome: "SSD / HD", prev: ["Manter backup atualizado dos arquivos importantes", "Deixar espaço livre e não desligar o PC no botão durante gravações"], det: ["Ler o estado de saúde do disco (SMART) periodicamente", "Investigar lentidão, travamentos ao abrir arquivos ou ruídos no HD"] },
    psu:   { nome: "Fonte de alimentação", prev: ["Limpar a poeira e conferir se os cabos estão bem conectados", "Usar filtro de linha ou estabilizador de boa qualidade"], det: ["Investigar desligamentos e reinicializações repentinas", "Se houver cheiro de queimado ou faíscas, desligue da tomada e procure um técnico"] }
  };
  const lista = $("#parts"), info = $("#info"), stage = $("#stage");
  lista.innerHTML = Object.entries(PARTES).map(([k, p]) => `<button type="button" data-k="${k}" aria-pressed="false">${esc(p.nome)}</button>`).join("");
  let destacar = () => {};
  function mostrar(k) {
    const p = PARTES[k]; if (!p) return;
    info.innerHTML = `<h3>${esc(p.nome)}</h3><p class="tag t1">Preventiva · evita o problema</p><ul>${p.prev.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="tag t2">Detectiva · encontra o problema cedo</p><ul>${p.det.map(x => `<li>${esc(x)}</li>`).join("")}</ul><a class="btn primary sm" href="novo-chamado.html?tipo=manutencao">Agendar revisão</a>`;
    $$("#parts button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === k)); destacar(k);
  }
  lista.addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (b) mostrar(b.dataset.k); });

  if (typeof THREE === "undefined") { stage.innerHTML = '<p class="empty" style="padding:24px">Não foi possível carregar o visualizador 3D. Use a lista de componentes ao lado.</p>'; return; }
  let renderer; try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { stage.innerHTML = '<p class="empty" style="padding:24px">Seu navegador não suporta o visualizador 3D. Use a lista de componentes ao lado.</p>'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); stage.prepend(renderer.domElement); renderer.domElement.style.touchAction = "pan-y";
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, .1, 100); cam.position.set(0, .3, 12.5);
  scene.add(new THREE.AmbientLight(0xffffff, .75)); const dl = new THREE.DirectionalLight(0xffffff, 1); dl.position.set(5, 7, 9); scene.add(dl);
  const pc = new THREE.Group(); scene.add(pc); const hit = [], porParte = {}, fans = [], marcadores = {};
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .45, ...o });
  const caixa = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); return m; };
  function marcar(k, obj) { obj.traverse(o => { if (o.isMesh) { o.userData.k = k; hit.push(o); (porParte[k] = porParte[k] || []).push(o); } }); pc.add(obj); }
  function fan(r, axisX) { const g = new THREE.Group(), blades = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * .08, 8, 28), M(0x20252a)));
    for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(r * .62, r * .26, .03), M(0x39424a)); const a = i / 7 * Math.PI * 2; b.position.set(Math.cos(a) * r * .5, Math.sin(a) * r * .5, 0); b.rotation.z = a + .35; blades.add(b); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * .2, r * .2, .06, 16), M(0xb4f03c, { emissive: 0x2a3d06 })); hub.rotation.x = Math.PI / 2; blades.add(hub); g.add(blades); fans.push(blades); if (axisX) g.rotation.y = Math.PI / 2; return g; }
  // gabinete (aramado, translúcido) e placa-mãe
  const W = 2.4, H = 4.6, D = 4.4;
  pc.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: 0xb4f03c, transparent: true, opacity: .55 })));
  pc.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshStandardMaterial({ color: 0x9fe870, transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false })));
  pc.add(caixa(.08, 3.9, 3.7, 0x0e2a1a, -1.05, .1, .1));
  // processador + cooler
  { const g = new THREE.Group(); g.add(caixa(.55, .95, .95, 0xaab4bc, -.7, .95, .25)); const f = fan(.42, true); f.position.set(-.38, .95, .25); g.add(f); marcar("cpu", g); }
  // memórias
  { const g = new THREE.Group(); [-.95, -1.3, -1.65].forEach(z => { g.add(caixa(.12, .95, .2, 0x2f6fb2, -.95, 1.05, z)); g.add(caixa(.13, .12, .2, 0xb4f03c, -.95, 1.45, z)); }); marcar("ram", g); }
  // placa de vídeo
  { const g = new THREE.Group(); g.add(caixa(.6, .5, 3.3, 0x15181b, -.65, -.5, .3)); [-.55, .95].forEach(z => { const f = fan(.5, true); f.position.set(-.34, -.5, z); g.add(f); }); marcar("gpu", g); }
  // ventoinhas do gabinete
  { const g = new THREE.Group(); [[.9, 2.2], [-.5, 2.2]].forEach(([y, z]) => { const f = fan(.85, false); f.position.set(.1, y, z); g.add(f); }); const t = fan(.85, false); t.position.set(.1, 1.2, -2.2); g.add(t); marcar("fans", g); }
  // fonte e SSD/HD
  marcar("psu", caixa(2, .95, 2.3, 0x23282d, 0, -2.05, -.9));
  { const g = new THREE.Group(); g.add(caixa(.5, .9, .2, 0x37424d, .7, .4, -1.7)); g.add(caixa(.51, .1, .21, 0xb4f03c, .7, .75, -1.7)); marcar("disco", g); }
  // marcadores pulsantes
  const posM = { fans: [.1, 1.9, 2.4], cpu: [-.2, 1.6, .25], ram: [-.8, 1.7, -1.3], gpu: [-.2, -.1, .3], disco: [.7, 1.0, -1.7], psu: [.9, -1.5, -.9] };
  Object.entries(posM).forEach(([k, p]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 16), new THREE.MeshBasicMaterial({ color: 0xb4f03c })); s.position.set(...p); s.userData.k = k; hit.push(s); pc.add(s); marcadores[k] = s; });
  let sel = null; destacar = k => { sel = k; Object.entries(porParte).forEach(([n, ms]) => ms.forEach(m => m.material.emissive && m.material.emissive.setHex(n === k ? 0x3b5a0a : (m.material.userData?.base ?? 0x000000)))); };

  // interação: arrastar gira, clique seleciona
  let rotY = -1.1, rotX = .14, vel = 0, arrasta = false, lx = 0, ly = 0, moveu = 0, parado = 0, visivel = true; const el = renderer.domElement, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  const reduz = matchMedia("(prefers-reduced-motion:reduce)").matches;
  el.addEventListener("pointerdown", e => { arrasta = true; lx = e.clientX; ly = e.clientY; moveu = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", e => { if (!arrasta) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moveu += Math.abs(dx) + Math.abs(dy); rotY += dx * .012; vel = dx * .012; if (e.pointerType === "mouse") rotX = Math.max(-.7, Math.min(.7, rotX + dy * .008)); parado = 0; });
  el.addEventListener("pointerup", e => { arrasta = false; if (moveu < 6) { const r = el.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, cam); const h = ray.intersectObjects(hit, false)[0]; if (h) mostrar(h.object.userData.k); } });
  el.addEventListener("pointercancel", () => arrasta = false);
  const ro = new ResizeObserver(() => { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }); ro.observe(stage);
  new IntersectionObserver(es => visivel = es[0].isIntersecting).observe(stage);
  const rel = new THREE.Clock();
  (function loop() { requestAnimationFrame(loop); if (!visivel) return; const t = rel.getElapsedTime();
    if (!arrasta) { rotY += vel; vel *= .93; parado += 1 / 60; if (!reduz && parado > 2) rotY += .004; }
    pc.rotation.set(rotX, rotY, 0); if (!reduz) fans.forEach((f, i) => f.rotation.z -= .08 + i * .002);
    Object.entries(marcadores).forEach(([k, m]) => { const s = (k === sel ? 1.7 : 1) * (1 + .22 * Math.sin(t * 3 + k.length)); m.scale.setScalar(s); });
    renderer.render(scene, cam); })();
  mostrar("fans");
};
