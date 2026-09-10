(() => {
  "use strict";

  const CHECK_INTERVAL = 60000;
  const TIMEOUT = 7000;

  function installStyles() {
    if (document.getElementById("admin-server-status-styles")) return;
    const style = document.createElement("style");
    style.id = "admin-server-status-styles";
    style.textContent = `
      .admin-server-status{
        min-height:42px;padding:0 13px;display:flex;align-items:center;gap:9px;
        border:1px solid rgba(214,161,56,.20);border-radius:8px;
        background:#0a0907;color:#b9ad99;font-family:var(--display);font-size:13px;
        letter-spacing:.9px;white-space:nowrap;transition:.2s ease
      }
      .admin-server-status-dot{
        width:9px;height:9px;flex:0 0 9px;border-radius:50%;
        background:#b68b3a;box-shadow:0 0 0 4px rgba(182,139,58,.09)
      }
      .admin-server-status.online{border-color:rgba(72,190,105,.28);color:#8ed6a2}
      .admin-server-status.online .admin-server-status-dot{background:#55c879;box-shadow:0 0 0 4px rgba(85,200,121,.10),0 0 12px rgba(85,200,121,.32)}
      .admin-server-status.offline{border-color:rgba(218,76,80,.30);color:#e08a8d}
      .admin-server-status.offline .admin-server-status-dot{background:#d54d52;box-shadow:0 0 0 4px rgba(213,77,82,.10),0 0 12px rgba(213,77,82,.24)}
      .admin-server-status.checking .admin-server-status-dot{animation:adminStatusPulse 1s ease-in-out infinite alternate}
      .admin-server-status-main{display:flex;flex-direction:column;line-height:1.05}
      .admin-server-status-main strong{font:inherit;color:inherit}
      .admin-server-status-main small{margin-top:3px;color:#746b5e;font-family:var(--ui);font-size:11px;letter-spacing:0}
      .admin-server-status.online .admin-server-status-main small{color:#668873}
      .admin-server-status.offline .admin-server-status-main small{color:#8e6768}
      @keyframes adminStatusPulse{from{opacity:.45;transform:scale(.86)}to{opacity:1;transform:scale(1.08)}}
      @media(max-width:780px){
        .admin-server-status{width:100%;justify-content:center;order:-1}
        .admin-actions{flex-wrap:wrap}
      }
    `;
    document.head.appendChild(style);
  }

  function createStatus() {
    let el = document.getElementById("adminServerStatus");
    if (el) return el;

    const actions = document.querySelector(".admin-actions");
    if (!actions) return null;

    el = document.createElement("div");
    el.id = "adminServerStatus";
    el.className = "admin-server-status checking";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.title = "Status da conexão com o Google Apps Script";
    el.innerHTML = `
      <span class="admin-server-status-dot" aria-hidden="true"></span>
      <span class="admin-server-status-main">
        <strong>SERVIDOR • VERIFICANDO</strong>
        <small>Aguardando resposta...</small>
      </span>
    `;
    actions.prepend(el);
    return el;
  }

  function setState(el, state, detail) {
    if (!el) return;
    el.classList.remove("checking", "online", "offline");
    el.classList.add(state);
    const strong = el.querySelector("strong");
    const small = el.querySelector("small");

    if (state === "online") {
      strong.textContent = "SERVIDOR • ONLINE";
      small.textContent = detail;
    } else if (state === "offline") {
      strong.textContent = "SERVIDOR • INDISPONÍVEL";
      small.textContent = detail;
    } else {
      strong.textContent = "SERVIDOR • VERIFICANDO";
      small.textContent = "Aguardando resposta...";
    }
  }

  async function check() {
    const el = createStatus();
    if (!el) return;

    const apiUrl = String(window.APP_CONFIG?.webAppUrl || "").trim();
    if (!apiUrl) {
      setState(el, "offline", "Backend não configurado");
      return;
    }

    if (!navigator.onLine) {
      setState(el, "offline", "Sem conexão com a internet");
      return;
    }

    setState(el, "checking");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    const started = performance.now();

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ action: "health" })
      });

      if (!response.ok) throw new Error("HTTP_" + response.status);
      const data = await response.json();
      if (!data?.ok) throw new Error(data?.error || "HEALTH_FAILED");

      const ms = Math.max(1, Math.round(performance.now() - started));
      setState(el, "online", `Respondendo em ${ms} ms`);
    } catch (error) {
      const timeout = error?.name === "AbortError";
      setState(el, "offline", timeout ? "Tempo de resposta excedido" : "Falha ao acessar o backend");
    } finally {
      clearTimeout(timer);
    }
  }

  function init() {
    installStyles();
    createStatus();
    check();
    setInterval(check, CHECK_INTERVAL);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) check();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
