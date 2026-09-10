(() => {
  "use strict";

  const DEADLINE = "15/10/2026";
  const EVENT_DATE = "07/11/2026";
  const EVENT_TIME = "19:45";
  const VENUE = "Salão de Festas do Golf Ville — Porto das Dunas";
  const PENDING_KEY = "cinemaPendingInviteCode";
  const GLOBAL_CODE_KEY = "cinemaInviteCodeV22";

  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 40);
  }

  function getInviteFromUrl() {
    try {
      return normalizeCode(new URL(location.href).searchParams.get("convite"));
    } catch (_) {
      return "";
    }
  }

  const incomingCode = getInviteFromUrl();

  // V22: o link personalizado abre primeiro a experiência visual do convite.
  // Guardamos o código e retiramos o parâmetro da URL antes dos scripts antigos,
  // evitando o modal de instruções e a validação automática imediata.
  if (incomingCode) {
    window.__cinemaInviteCodeV22 = incomingCode;
    try {
      sessionStorage.setItem(GLOBAL_CODE_KEY, incomingCode);
      sessionStorage.setItem(`cinemaInstructionsRead:${incomingCode}`, "1");
      localStorage.removeItem(PENDING_KEY);

      const clean = new URL(location.href);
      clean.searchParams.delete("convite");
      clean.hash = "";
      history.replaceState({}, document.title, clean.href);
    } catch (_) {}
  }

  function currentInviteCode() {
    return normalizeCode(
      window.__cinemaInviteCodeV22 ||
      sessionStorage.getItem(GLOBAL_CODE_KEY) ||
      ""
    );
  }

  function installStyles() {
    if (document.getElementById("cinema-v22-styles")) return;

    const style = document.createElement("style");
    style.id = "cinema-v22-styles";
    style.textContent = `
      /* Dress code mais claro e legível */
      .dress-code-banner{color:#fff!important;border-color:rgba(255,255,255,.34)!important}
      .dress-code-banner>i{color:#fff!important}
      .dress-code-banner small{color:rgba(255,255,255,.72)!important}
      .dress-code-banner strong{color:#fff!important;text-shadow:0 0 16px rgba(255,255,255,.12)!important}
      .dress-code-banner span{color:rgba(255,255,255,.82)!important}
      #dressCodeModal .cinema-dress-highlight{border-color:rgba(255,255,255,.34)!important;background:rgba(255,255,255,.055)!important}
      #dressCodeModal .cinema-dress-highlight strong{color:#fff!important}
      #dressCodeModal .cinema-dress-highlight span{color:rgba(255,255,255,.86)!important}

      /* Instruções ficam na página, antes do botão de confirmação */
      .personal-invite-instructions{
        width:min(640px,100%);margin:20px auto 0;padding:16px 17px;
        border:1px solid rgba(226,169,56,.32);border-radius:12px;
        background:linear-gradient(145deg,rgba(20,14,8,.96),rgba(8,6,4,.96));
        box-shadow:0 14px 34px rgba(0,0,0,.28);text-align:left
      }
      .personal-invite-instructions>small{display:block;color:#b9954f;font-family:var(--display);font-size:10px;letter-spacing:1.8px}
      .personal-invite-instructions>strong{display:block;margin:3px 0 11px;color:#f3d17e;font-family:var(--display);font-size:17px;letter-spacing:.8px}
      .personal-invite-instruction-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .personal-invite-instruction-grid div{padding:10px 11px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.018)}
      .personal-invite-instruction-grid b{display:block;color:#fff;font-family:var(--display);font-size:11px;letter-spacing:.6px}
      .personal-invite-instruction-grid span{display:block;margin-top:2px;color:#aaa094;font-size:12px;line-height:1.35}
      .personal-invite-code{margin-top:11px;padding:10px 12px;border-radius:8px;background:rgba(131,13,18,.22);border:1px solid rgba(220,68,73,.34);text-align:center}
      .personal-invite-code small{display:block;color:#e8b8ba;font-family:var(--display);font-size:9px;letter-spacing:1.4px}
      .personal-invite-code strong{display:block;margin-top:2px;color:#fff;font-family:var(--display);font-size:19px;letter-spacing:1.5px}
      .hero-registration-cta.has-personal-code button{background:#fff!important;color:#7c0b10!important;min-width:190px}
      .hero-registration-cta.has-personal-code button strong{display:block!important;color:inherit!important;font-size:13px!important;letter-spacing:1px!important;margin:0!important}
      .hero-registration-cta.has-personal-code button small{display:block!important;color:inherit!important;opacity:.72;font-size:9px!important;letter-spacing:1px!important;margin-top:1px!important}

      @media(max-width:700px){
        .personal-invite-instruction-grid{grid-template-columns:1fr}
        .personal-invite-instructions{padding:14px}
      }
    `;
    document.head.appendChild(style);
  }

  function buildInstructions(code, cta) {
    if (!code || !cta || document.getElementById("personalInviteInstructions")) return;

    const instructions = document.createElement("div");
    instructions.id = "personalInviteInstructions";
    instructions.className = "personal-invite-instructions reveal reveal-7";
    instructions.innerHTML = `
      <small>ANTES DE CONFIRMAR SUA PRESENÇA</small>
      <strong>LEIA AS INSTRUÇÕES DO SEU CONVITE</strong>
      <div class="personal-invite-instruction-grid">
        <div><b>DATA E HORÁRIO</b><span>${EVENT_DATE}, às ${EVENT_TIME}.</span></div>
        <div><b>LOCAL</b><span>${VENUE}.</span></div>
        <div><b>DADOS NECESSÁRIOS</b><span>Nome completo e CPF de cada pessoa incluída no convite.</span></div>
        <div><b>PRAZO</b><span>Confirme sua presença até ${DEADLINE}.</span></div>
      </div>
      <div class="personal-invite-code">
        <small>SEU CÓDIGO DE CONVITE</small>
        <strong>${code}</strong>
      </div>
    `;
    cta.insertAdjacentElement("beforebegin", instructions);
  }

  function activateInvite(code) {
    const input = document.getElementById("inviteCode");
    const validate = document.getElementById("validateInviteButton");
    const ticketSection = document.getElementById("ingresso");
    if (!input || !validate || !ticketSection) return;

    input.value = code;
    try { localStorage.setItem(PENDING_KEY, code); } catch (_) {}

    ticketSection.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => {
      if (!input.disabled) validate.click();
    }, 650);
  }

  function enhancePublicInvite() {
    installStyles();

    const cta = document.querySelector(".hero-registration-cta");
    if (!cta) return;

    const code = currentInviteCode();
    const copy = cta.querySelector("div");
    const oldButton = cta.querySelector("button");
    if (!oldButton) return;

    if (copy) {
      const kicker = copy.querySelector("small");
      const title = copy.querySelector("strong");
      const deadline = copy.querySelector("span");
      if (kicker) kicker.textContent = "CONFIRMAÇÃO DE PRESENÇA";
      if (title) title.textContent = code ? "LEIA AS INSTRUÇÕES E CONFIRME SUA PRESENÇA" : "GARANTA SEU LUGAR NO ANIVERSÁRIO";
      if (deadline) deadline.textContent = `Prazo para confirmação: ${DEADLINE}`;
    }

    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);

    if (code) {
      cta.classList.add("has-personal-code");
      buildInstructions(code, cta);
      button.innerHTML = `<i class="fa-solid fa-ticket"></i><span><strong>CONFIRMAR PRESENÇA</strong><small>USAR CÓDIGO ${code}</small></span>`;
      button.addEventListener("click", () => activateInvite(code));
    } else {
      button.innerHTML = '<i class="fa-solid fa-ticket"></i> CONFIRMAR PRESENÇA';
      button.addEventListener("click", () => {
        document.getElementById("ingresso")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function reminderMessage(code) {
    const url = new URL("index.html", location.href);
    url.searchParams.set("convite", code);
    url.hash = "inicio";

    return [
      "*Lembrete — Noite no Cinema | Claurea 60 anos*",
      "",
      "Passando para lembrar que sua confirmação de presença ainda está pendente.",
      "",
      `*Confirme sua presença até ${DEADLINE}:*`,
      url.href,
      "",
      "Abra seu convite, confira com atenção as informações da festa e use o código exibido no próprio site para confirmar sua presença e emitir seus ingressos.",
      "",
      `Data: ${EVENT_DATE} às ${EVENT_TIME}`,
      `Local: ${VENUE}`,
      "",
      "Esperamos você para essa grande estreia!"
    ].join("\n");
  }

  // Substitui apenas a ação do botão LEMBRAR no admin, sem interferir
  // no restante do painel.
  document.addEventListener("click", event => {
    const button = event.target.closest?.(".invite-reminder-btn");
    if (!button || button.disabled) return;

    const code = normalizeCode(button.dataset.code);
    if (!code) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const waUrl = `https://wa.me/?text=${encodeURIComponent(reminderMessage(code))}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }, true);

  function init() {
    installStyles();
    if (document.getElementById("ticketForm")) {
      // apps-script-config cria o CTA no DOMContentLoaded. Um ciclo depois,
      // aplicamos o novo fluxo e removemos o comportamento antigo do botão.
      setTimeout(enhancePublicInvite, 0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
