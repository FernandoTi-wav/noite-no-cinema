(() => {
  "use strict";

  const KEY = "cinemaDressCodeSeen";
  const PENDING_KEY = "cinemaPendingInviteCode";
  const INVITE_SESSION_KEY = "cinemaInviteCodeV22";
  const DEADLINE = "15/10/2026";

  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 40);
  }

  function inviteFromUrl() {
    try {
      return normalizeCode(new URL(location.href).searchParams.get("convite"));
    } catch (_) {
      return "";
    }
  }

  const incomingCode = inviteFromUrl();

  // Convites abertos pelo link pessoal começam somente na apresentação.
  // A área de resgate fica invisível até o convidado tocar em CONFIRMAR PRESENÇA.
  if (incomingCode) {
    document.documentElement.classList.add("personal-invite-locked");
    window.__cinemaInviteCodeV22 = incomingCode;

    try {
      sessionStorage.setItem(INVITE_SESSION_KEY, incomingCode);
      sessionStorage.setItem(`cinemaInstructionsRead:${incomingCode}`, "1");
      localStorage.removeItem(PENDING_KEY);

      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete("convite");
      cleanUrl.hash = "";
      history.replaceState({}, document.title, cleanUrl.href);
    } catch (_) {}
  }

  const currentState = sessionStorage.getItem(KEY);
  const alreadySeen = currentState === "1";

  if (!alreadySeen) {
    sessionStorage.setItem(KEY, "deferred-until-ticket");
  }

  function installPopupStyles() {
    if (document.getElementById("dress-after-ticket-styles")) return;

    const style = document.createElement("style");
    style.id = "dress-after-ticket-styles";
    style.textContent = `
      html.personal-invite-locked #ingresso,
      html.personal-invite-locked .nav-link[href="#ingresso"]{
        display:none!important
      }

      .dress-code-banner{color:#fff!important;border-color:rgba(255,255,255,.34)!important}
      .dress-code-banner>i{color:#fff!important}
      .dress-code-banner small{color:rgba(255,255,255,.72)!important}
      .dress-code-banner strong{color:#fff!important;text-shadow:0 0 16px rgba(255,255,255,.12)!important}
      .dress-code-banner span{color:rgba(255,255,255,.84)!important}
      #dressCodeModal .cinema-dress-highlight{border-color:rgba(255,255,255,.35)!important;background:rgba(255,255,255,.055)!important}
      #dressCodeModal .cinema-dress-highlight strong{color:#fff!important}
      #dressCodeModal .cinema-dress-highlight span{color:rgba(255,255,255,.88)!important}

      .cinema-print-highlight{
        margin:14px 0 16px;padding:15px;display:flex;align-items:flex-start;gap:12px;
        border:1px solid rgba(238,74,79,.72);border-radius:10px;
        background:linear-gradient(135deg,rgba(132,10,16,.34),rgba(74,5,9,.24));
        box-shadow:0 0 0 3px rgba(190,25,31,.08)
      }
      .cinema-print-highlight>i{flex:0 0 auto;margin-top:2px;color:#ff787d;font-size:21px}
      .cinema-print-highlight strong{display:block;color:#fff;font-family:var(--display);font-size:16px;letter-spacing:.9px}
      .cinema-print-highlight span{display:block;margin-top:4px;color:#f0cfd0;font-size:13px;line-height:1.45}
      #dressCodeModal .cinema-info-primary{display:flex;align-items:center;justify-content:center;gap:9px}

      .hero-registration-cta.has-personal-code button{
        background:#fff!important;
        color:#7c0b10!important;
        min-width:0!important;
        width:200px!important;
        height:48px!important;
        border:none!important;
        border-radius:12px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:10px!important;
        padding:0 18px!important;
        box-shadow:none!important;
        font-family:var(--display)!important;
        font-size:13px!important;
        font-weight:700!important;
        letter-spacing:.8px!important;
        line-height:1!important;
        white-space:nowrap!important;
        transition:transform .18s ease, box-shadow .18s ease, opacity .18s ease!important;
      }
      .hero-registration-cta.has-personal-code button:hover{
        transform:translateY(-1px);
        box-shadow:0 10px 22px rgba(255,255,255,.10)!important;
      }
      .hero-registration-cta.has-personal-code button i{
        font-size:14px!important;
        color:inherit!important;
      }
      .hero-registration-cta.has-personal-code button span,
      .hero-registration-cta.has-personal-code button strong,
      .hero-registration-cta.has-personal-code button small{
        color:inherit!important;
      }
      .hero-registration-cta.has-personal-code button .button-stack{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:10px!important;
      }
      .hero-registration-cta.has-personal-code button .button-stack strong{
        display:inline!important;
        margin:0!important;
        color:inherit!important;
        font:inherit!important;
        letter-spacing:inherit!important;
      }

      @media(max-width:700px){
        .hero-registration-cta.has-personal-code button{
          width:100%!important;
          max-width:320px!important;
          justify-self:center!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function currentInviteCode() {
    return normalizeCode(
      window.__cinemaInviteCodeV22 ||
      sessionStorage.getItem(INVITE_SESSION_KEY) ||
      ""
    );
  }

  function activateInvite(code) {
    const input = document.getElementById("inviteCode");
    const validate = document.getElementById("validateInviteButton");
    const ticketSection = document.getElementById("ingresso");
    if (!input || !validate || !ticketSection) return;

    document.documentElement.classList.remove("personal-invite-locked");
    input.value = code;

    try { localStorage.setItem(PENDING_KEY, code); } catch (_) {}

    requestAnimationFrame(() => {
      ticketSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    setTimeout(() => {
      if (!input.disabled) validate.click();
    }, 650);
  }

  function enhanceInviteFlow() {
    installPopupStyles();

    const generateContent = document.querySelector("#generateButton .button-content");
    if (generateContent) {
      generateContent.innerHTML = '<i class="fa-solid fa-ticket"></i> CONFIRMAR PRESENÇA E GERAR INGRESSOS';
    }

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
      if (title) title.textContent = code ? "CONFIRME SUA PRESENÇA" : "GARANTA SEU LUGAR NO ANIVERSÁRIO";
      if (deadline) deadline.textContent = `Prazo para confirmação: ${DEADLINE}`;
    }

    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);

    if (code) {
      cta.classList.add("has-personal-code");
      button.innerHTML = `<span class="button-stack"><i class="fa-solid fa-ticket"></i><strong>CONFIRMAR PRESENÇA</strong></span>`;
      button.addEventListener("click", () => activateInvite(code));
    } else {
      button.innerHTML = '<i class="fa-solid fa-ticket"></i> CONFIRMAR PRESENÇA';
      button.addEventListener("click", () => {
        document.getElementById("ingresso")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function showDressCodeAfterTicket() {
    if (alreadySeen || sessionStorage.getItem(KEY) === "1") return;
    if (document.getElementById("dressCodeModal")) return;

    installPopupStyles();
    sessionStorage.setItem(KEY, "shown-after-ticket");

    const overlay = document.createElement("div");
    overlay.className = "cinema-info-overlay";
    overlay.id = "dressCodeModal";
    overlay.innerHTML = `
      <div class="cinema-info-dialog" role="dialog" aria-modal="true" aria-labelledby="dressCodeTitle">
        <div class="cinema-info-icon"><i class="fa-solid fa-ticket"></i></div>
        <small>SEUS INGRESSOS ESTÃO PRONTOS</small>
        <h2 id="dressCodeTitle">SUA ESTREIA ESTÁ CONFIRMADA!</h2>
        <p class="cinema-info-lead">Seu credenciamento foi concluído. Antes de acessar seus ingressos, guarde estes dois lembretes importantes para a noite da festa.</p>

        <div class="cinema-dress-highlight">
          <strong><i class="fa-solid fa-star"></i> VISTA-SE À CARÁTER DA FESTA</strong>
          <span>Vale se inspirar em cinema, Hollywood clássico, tapete vermelho, estrelas ou personagens. Capriche no look e venha viver a experiência!</span>
        </div>

        <div class="cinema-print-highlight">
          <i class="fa-solid fa-print"></i>
          <div>
            <strong>ATENÇÃO: LEVE SEU INGRESSO IMPRESSO</strong>
            <span>O ingresso deverá ser impresso e levado no dia da festa. Se houver mais de um ingresso no convite, imprima cada um deles e guarde-os com antecedência para apresentar na entrada.</span>
          </div>
        </div>

        <button type="button" class="cinema-info-primary" id="closeDressCode"><i class="fa-solid fa-ticket"></i> VER MEUS INGRESSOS</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";

    overlay.querySelector("#closeDressCode")?.addEventListener("click", () => {
      sessionStorage.setItem(KEY, "1");
      overlay.remove();
      document.documentElement.style.overflow = "";

      requestAnimationFrame(() => {
        document.getElementById("ticketResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function installTicketObserver() {
    if (alreadySeen) return;

    const results = document.getElementById("ticketResults");
    if (!results) return;

    let scheduled = false;

    const check = () => {
      if (scheduled || sessionStorage.getItem(KEY) === "1") return;

      const hasGeneratedTicket = Boolean(results.querySelector(".generated-card, .generated-ticket-image"));
      if (!hasGeneratedTicket || results.classList.contains("hidden")) return;

      scheduled = true;
      setTimeout(showDressCodeAfterTicket, 550);
    };

    const observer = new MutationObserver(check);
    observer.observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    check();
  }

  function loadTicketRecovery() {
    if (document.getElementById("ticket-recovery-script")) return;
    const script = document.createElement("script");
    script.id = "ticket-recovery-script";
    script.src = "ticket-recovery.js?v=21.2.0";
    script.defer = true;
    document.head.appendChild(script);
  }

  function init() {
    installPopupStyles();
    installTicketObserver();
    loadTicketRecovery();
    setTimeout(enhanceInviteFlow, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
