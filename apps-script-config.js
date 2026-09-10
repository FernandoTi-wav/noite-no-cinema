/*
  NOITE NO CINEMA — GOOGLE SHEETS + APPS SCRIPT
*/

window.APP_CONFIG = {
  webAppUrl: "https://script.google.com/macros/s/AKfycbxcKa94j5CuB4zt5DQtfamVU_xgjVqZ1rklnLFtbf0zAWC5fqRCc2OLxrcH-bPm2kgw/exec",
  capacidadeEvento: 150
};

/* ============================================================
   V21 — EXPERIÊNCIA DO CONVITE
   - prazo muito mais visível
   - inscrição em destaque
   - instruções antes do resgate por link
   - dress code
   - lembrete de inscrição no admin
   ============================================================ */
(function () {
  "use strict";

  const VERSION = "21.0.0";
  const DEADLINE_TEXT = "15/10/2026";
  const EVENT_DATE = "07/11/2026";
  const EVENT_TIME = "19:45";
  const VENUE = "Salão de Festas do Golf Ville — Porto das Dunas";
  const PENDING_KEY = "cinemaPendingInviteCode";

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

  function instructionKey(code) {
    return `cinemaInstructionsRead:${code}`;
  }

  const incomingInvite = inviteFromUrl();
  const mustReadInstructions = Boolean(
    incomingInvite && !sessionStorage.getItem(instructionKey(incomingInvite))
  );

  /* Intercepta o link personalizado ANTES do script principal.
     Assim o código não é validado automaticamente antes da leitura. */
  if (mustReadInstructions) {
    try {
      localStorage.removeItem(PENDING_KEY);
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete("convite");
      cleanUrl.hash = "";
      history.replaceState({}, document.title, cleanUrl.href);
    } catch (_) {}
  }

  function installStyles() {
    if (document.getElementById("cinema-v21-styles")) return;

    const style = document.createElement("style");
    style.id = "cinema-v21-styles";
    style.textContent = `
      /* Convite de aniversário explícito */
      .birthday-invite-label{
        width:max-content;max-width:100%;margin:0 auto 14px;padding:8px 14px;
        display:flex;align-items:center;justify-content:center;gap:8px;
        border:1px solid rgba(238,190,89,.34);border-radius:999px;
        background:rgba(204,145,29,.075);color:#f2d080;
        font-family:var(--display);font-size:12px;letter-spacing:1.6px;text-align:center
      }
      .birthday-invite-label i{font-size:13px}

      /* CTA de inscrição ainda no hero */
      .hero-registration-cta{
        width:min(640px,100%);margin:24px auto 0;padding:16px 18px;
        display:grid;grid-template-columns:1fr auto;align-items:center;gap:14px;
        border:1px solid rgba(201,48,54,.58);border-radius:12px;
        background:linear-gradient(135deg,rgba(108,8,13,.96),rgba(47,4,7,.95));
        box-shadow:0 16px 38px rgba(0,0,0,.34),0 0 28px rgba(164,22,28,.12);
        text-align:left
      }
      .hero-registration-cta small{display:block;color:#ffb7b9;font-family:var(--display);font-size:10px;letter-spacing:1.8px}
      .hero-registration-cta strong{display:block;margin-top:2px;color:#fff;font-family:var(--display);font-size:18px;letter-spacing:1px}
      .hero-registration-cta span{display:block;margin-top:3px;color:#ffd8d9;font-size:13px}
      .hero-registration-cta button{
        min-height:46px;padding:0 16px;border:1px solid rgba(255,255,255,.52);border-radius:9px;
        background:#fff;color:#7c0b10;font-family:var(--display);font-weight:700;letter-spacing:1px;cursor:pointer
      }

      /* Prazo: vermelho + branco e muito mais visível */
      .registration-deadline{
        width:min(620px,100%)!important;margin:18px auto 0!important;padding:15px 17px!important;
        border:2px solid #f04d53!important;border-radius:11px!important;
        background:linear-gradient(135deg,#8c0c12,#57070b)!important;
        box-shadow:0 0 0 4px rgba(169,19,25,.12),0 13px 35px rgba(0,0,0,.32)!important;
        color:#fff!important
      }
      .registration-deadline>i{color:#fff!important;font-size:23px!important}
      .registration-deadline small{color:#ffc5c7!important;font-weight:700!important;letter-spacing:2px!important}
      .registration-deadline strong{color:#fff!important;font-size:18px!important;font-weight:800!important}
      .registration-deadline span{color:#ffe1e2!important}
      .registration-deadline .deadline-alert-tag{
        display:inline-flex!important;width:max-content;margin:0 0 3px;padding:3px 7px;border-radius:4px;
        background:#fff;color:#8c0c12!important;font-family:var(--display);font-size:9px!important;
        font-weight:800;letter-spacing:1.5px
      }
      .registration-deadline.closed{background:linear-gradient(135deg,#65080c,#2e0305)!important}

      /* Dress code persistente */
      .dress-code-banner{
        width:min(900px,calc(100% - 40px));margin:0 auto 18px;padding:15px 18px;
        display:flex;align-items:center;justify-content:center;gap:13px;
        border:1px solid rgba(221,166,55,.34);border-radius:11px;
        background:linear-gradient(135deg,rgba(24,18,9,.96),rgba(9,7,4,.96));
        color:#d9c08b;text-align:left
      }
      .dress-code-banner>i{font-size:25px;color:#e8bd5e}
      .dress-code-banner small{display:block;color:#957538;font-family:var(--display);font-size:10px;letter-spacing:1.8px}
      .dress-code-banner strong{display:block;margin-top:2px;color:#f2d58d;font-family:var(--display);font-size:16px;letter-spacing:.8px}
      .dress-code-banner span{display:block;margin-top:2px;color:#a99c89;font-size:13px}

      /* Modal de instruções / dress code */
      .cinema-info-overlay{
        position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;
        padding:18px;background:rgba(0,0,0,.88);backdrop-filter:blur(8px)
      }
      .cinema-info-dialog{
        width:min(590px,100%);max-height:min(760px,calc(100vh - 30px));overflow:auto;padding:28px;
        border:1px solid rgba(226,169,56,.38);border-radius:17px;
        background:linear-gradient(155deg,#130e09,#070504 64%);box-shadow:0 32px 100px #000;color:#ddd3c2
      }
      .cinema-info-icon{width:55px;height:55px;margin:0 auto 14px;display:grid;place-items:center;border-radius:50%;background:rgba(205,145,27,.1);border:1px solid rgba(226,169,56,.3);color:#efc664;font-size:22px}
      .cinema-info-dialog>small{display:block;text-align:center;color:#a98543;font-family:var(--display);letter-spacing:2.4px}
      .cinema-info-dialog h2{margin:5px 0 8px;text-align:center;color:#f1cf7b;font-family:var(--cinema);font-size:30px;font-weight:400;letter-spacing:1px}
      .cinema-info-lead{text-align:center;color:#bcb0a0;line-height:1.5}
      .cinema-instruction-list{margin:20px 0;display:grid;gap:10px}
      .cinema-instruction-item{display:flex;gap:11px;padding:12px;border:1px solid rgba(219,163,52,.13);border-radius:9px;background:rgba(255,255,255,.018)}
      .cinema-instruction-item i{width:24px;flex:0 0 24px;margin-top:2px;color:#e3b650;text-align:center}
      .cinema-instruction-item strong{display:block;color:#eee3d2;font-family:var(--display);letter-spacing:.5px}
      .cinema-instruction-item span{display:block;margin-top:2px;color:#918676;font-size:13px;line-height:1.4}
      .cinema-dress-highlight{margin:15px 0;padding:15px;border:1px solid rgba(201,48,54,.4);border-radius:10px;background:rgba(120,8,13,.16)}
      .cinema-dress-highlight strong{display:block;color:#fff;font-family:var(--display);font-size:17px;letter-spacing:.8px}
      .cinema-dress-highlight span{display:block;margin-top:5px;color:#e4cacc;font-size:13px;line-height:1.5}
      .cinema-info-primary,.cinema-info-secondary{width:100%;min-height:50px;border-radius:9px;font-family:var(--display);font-size:14px;letter-spacing:1px;cursor:pointer}
      .cinema-info-primary{border:1px solid #f1c45f;background:linear-gradient(135deg,#e0a92f,#f2c75f);color:#1b1206;font-weight:800}
      .cinema-info-secondary{margin-top:9px;border:1px solid rgba(218,165,60,.2);background:#080604;color:#c4a45f}

      /* Administração — lembrar convite */
      .invite-row-actions .invite-reminder-btn{
        width:auto;min-width:94px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:7px;
        border-color:rgba(207,63,67,.36)!important;background:rgba(142,18,23,.10)!important;color:#ef8d91!important
      }
      .invite-row-actions .invite-reminder-btn span{font-family:var(--display);font-size:11px;letter-spacing:.8px}
      .invite-row-actions .invite-reminder-btn:hover:not(:disabled){border-color:rgba(240,78,84,.6)!important;color:#ffc0c2!important}

      @media(max-width:900px){
        .hero{min-height:auto!important;padding-bottom:34px!important}
      }
      @media(max-width:700px){
        .birthday-invite-label{font-size:10px;letter-spacing:1.15px;padding:7px 10px}
        .hero-registration-cta{grid-template-columns:1fr;margin-top:18px;text-align:center}
        .hero-registration-cta button{width:100%}
        .registration-deadline{padding:14px!important;text-align:left!important}
        .registration-deadline strong{font-size:17px!important}
        .dress-code-banner{width:calc(100% - 24px);align-items:flex-start;padding:14px}
        .cinema-info-dialog{padding:22px 18px}
        .cinema-info-dialog h2{font-size:25px}
        #invitePanel .invite-row-actions .invite-reminder-btn{grid-column:1/-1!important;width:100%!important;min-height:48px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function makeInstructionModal(code) {
    const overlay = document.createElement("div");
    overlay.className = "cinema-info-overlay";
    overlay.id = "inviteInstructionsModal";
    overlay.innerHTML = `
      <div class="cinema-info-dialog" role="dialog" aria-modal="true" aria-labelledby="inviteInstructionsTitle">
        <div class="cinema-info-icon"><i class="fa-solid fa-clapperboard"></i></div>
        <small>CONVITE OFICIAL DE ANIVERSÁRIO</small>
        <h2 id="inviteInstructionsTitle">ANTES DE CONFIRMAR, LEIA AS INSTRUÇÕES</h2>
        <p class="cinema-info-lead">Você recebeu um convite para celebrar os <strong>60 anos da Claurea</strong> em uma noite especial inspirada no cinema.</p>

        <div class="cinema-instruction-list">
          <div class="cinema-instruction-item"><i class="fa-regular fa-calendar"></i><div><strong>DATA E HORÁRIO</strong><span>${EVENT_DATE}, às ${EVENT_TIME}.</span></div></div>
          <div class="cinema-instruction-item"><i class="fa-solid fa-location-dot"></i><div><strong>LOCAL</strong><span>${VENUE}.</span></div></div>
          <div class="cinema-instruction-item"><i class="fa-solid fa-address-card"></i><div><strong>CONFIRMAÇÃO</strong><span>Informe nome completo e CPF de cada pessoa incluída no convite para o controle de acesso do condomínio.</span></div></div>
          <div class="cinema-instruction-item"><i class="fa-regular fa-clock"></i><div><strong>PRAZO</strong><span>A confirmação deve ser feita até <b>${DEADLINE_TEXT}</b>.</span></div></div>
        </div>

        <div class="cinema-dress-highlight">
          <strong><i class="fa-solid fa-star"></i> VISTA-SE À CARÁTER</strong>
          <span>Entre no clima da festa: use um look inspirado em cinema, Hollywood, tapete vermelho, estrelas ou personagens. A ideia é fazer parte dessa grande estreia!</span>
        </div>

        <button type="button" class="cinema-info-primary" id="acceptInviteInstructions">LI AS INSTRUÇÕES — CONFIRMAR PRESENÇA</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";

    overlay.querySelector("#acceptInviteInstructions").addEventListener("click", () => {
      sessionStorage.setItem(instructionKey(code), "1");
      const url = new URL(location.href);
      url.searchParams.set("convite", code);
      url.hash = "ingresso";
      location.href = url.href;
    });
  }

  function makeDressModal() {
    if (sessionStorage.getItem("cinemaDressCodeSeen")) return;

    const overlay = document.createElement("div");
    overlay.className = "cinema-info-overlay";
    overlay.id = "dressCodeModal";
    overlay.innerHTML = `
      <div class="cinema-info-dialog" role="dialog" aria-modal="true" aria-labelledby="dressCodeTitle">
        <div class="cinema-info-icon"><i class="fa-solid fa-star"></i></div>
        <small>NOITE NO CINEMA</small>
        <h2 id="dressCodeTitle">VOCÊ FAZ PARTE DESSA ESTREIA</h2>
        <p class="cinema-info-lead">O aniversário de 60 anos da Claurea terá clima de grande première.</p>
        <div class="cinema-dress-highlight">
          <strong>VISTA-SE À CARÁTER DA FESTA</strong>
          <span>Vale se inspirar em cinema, Hollywood clássico, tapete vermelho, estrelas ou personagens. Capriche no look e venha viver a experiência!</span>
        </div>
        <button type="button" class="cinema-info-primary" id="closeDressCode">ENTENDI — VOU ENTRAR NO CLIMA</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";

    overlay.querySelector("#closeDressCode").addEventListener("click", () => {
      sessionStorage.setItem("cinemaDressCodeSeen", "1");
      overlay.remove();
      document.documentElement.style.overflow = "";
    });
  }

  function enhancePublicPage() {
    const hero = document.querySelector(".hero-content");
    const kicker = document.querySelector(".hero-kicker");
    const eventGrid = document.querySelector(".event-grid");
    const ticketSection = document.getElementById("ingresso");
    const sectionHeading = ticketSection?.querySelector(".section-heading");
    const deadline = document.getElementById("registrationDeadlineNotice");

    document.title = "Convite de Aniversário | Claurea 60 Anos — Noite no Cinema";

    if (hero && kicker && !document.querySelector(".birthday-invite-label")) {
      const label = document.createElement("div");
      label.className = "birthday-invite-label reveal reveal-2";
      label.innerHTML = '<i class="fa-solid fa-cake-candles"></i><span>CONVITE DE ANIVERSÁRIO • CLAUREA 60 ANOS</span>';
      hero.insertBefore(label, kicker);
    }

    if (eventGrid && !document.querySelector(".hero-registration-cta")) {
      const cta = document.createElement("div");
      cta.className = "hero-registration-cta reveal reveal-7";
      cta.innerHTML = `
        <div>
          <small>CONFIRMAÇÃO DE PRESENÇA</small>
          <strong>GARANTA SEU LUGAR NO ANIVERSÁRIO</strong>
          <span>Prazo para inscrição: ${DEADLINE_TEXT}</span>
        </div>
        <button type="button"><i class="fa-solid fa-ticket"></i> FAZER INSCRIÇÃO</button>
      `;
      eventGrid.insertAdjacentElement("afterend", cta);
      cta.querySelector("button").addEventListener("click", () => {
        document.getElementById("ingresso")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (sectionHeading) {
      const title = sectionHeading.querySelector("h2");
      const text = sectionHeading.querySelector("p");
      if (title) title.textContent = "CONFIRME SUA PRESENÇA";
      if (text) text.textContent = "Use seu código de convite para confirmar presença no aniversário de 60 anos da Claurea.";
    }

    if (deadline && !deadline.querySelector(".deadline-alert-tag")) {
      const content = deadline.querySelector("div");
      if (content) {
        const tag = document.createElement("span");
        tag.className = "deadline-alert-tag";
        tag.textContent = "ATENÇÃO";
        content.prepend(tag);
      }
    }

    if (ticketSection && !document.querySelector(".dress-code-banner")) {
      const banner = document.createElement("div");
      banner.className = "dress-code-banner";
      banner.innerHTML = `
        <i class="fa-solid fa-masks-theater"></i>
        <div><small>DRESS CODE DA NOITE</small><strong>VENHA VESTIDO À CARÁTER</strong><span>Inspire-se em cinema, Hollywood, tapete vermelho, estrelas ou personagens.</span></div>
      `;
      ticketSection.insertBefore(banner, ticketSection.firstChild);
    }

    if (mustReadInstructions) {
      makeInstructionModal(incomingInvite);
    } else if (!incomingInvite) {
      setTimeout(() => {
        if (!document.querySelector(".cinema-info-overlay")) makeDressModal();
      }, 3100);
    }
  }

  function publicInviteUrl(code) {
    const url = new URL("index.html", location.href);
    url.searchParams.set("convite", code);
    url.hash = "ingresso";
    return url.href;
  }

  function reminderMessage(code) {
    return `*Lembrete - Aniversário de 60 anos da Claurea*\n\nVocê recebeu um convite para a Noite no Cinema e sua confirmação ainda está pendente.\n\n*Confirme sua presença até ${DEADLINE_TEXT}:*\n${publicInviteUrl(code)}\n\nAo abrir o link, leia as instruções da festa e depois informe os dados solicitados para emitir os ingressos.\n\nData: ${EVENT_DATE} às ${EVENT_TIME}\nLocal: ${VENUE}\n\nEsperamos você!`;
  }

  function addReminderButtons() {
    const table = document.getElementById("inviteTable");
    if (!table) return;

    table.querySelectorAll(".invite-whatsapp-btn").forEach(whatsapp => {
      const actions = whatsapp.closest(".invite-row-actions");
      if (!actions || actions.querySelector(".invite-reminder-btn")) return;

      const code = normalizeCode(whatsapp.dataset.code);
      if (!code) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "invite-reminder-btn invite-action-wide";
      button.dataset.code = code;
      button.disabled = whatsapp.disabled;
      button.title = whatsapp.disabled ? "Disponível apenas para convites pendentes e ativos" : "Enviar lembrete de confirmação";
      button.innerHTML = '<i class="fa-regular fa-bell"></i><span>LEMBRAR</span>';
      whatsapp.insertAdjacentElement("afterend", button);
    });
  }

  function enhanceAdminPage() {
    const inviteTable = document.getElementById("inviteTable");
    if (!inviteTable) return;

    inviteTable.addEventListener("click", event => {
      const button = event.target.closest(".invite-reminder-btn");
      if (!button || button.disabled) return;

      const code = normalizeCode(button.dataset.code);
      if (!code) return;

      const waUrl = `https://wa.me/?text=${encodeURIComponent(reminderMessage(code))}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    });

    const observer = new MutationObserver(addReminderButtons);
    observer.observe(inviteTable, { childList: true, subtree: true });
    addReminderButtons();
  }

  installStyles();

  function init() {
    if (document.getElementById("ticketForm")) enhancePublicPage();
    if (document.getElementById("inviteTable")) enhanceAdminPage();
    document.documentElement.dataset.cinemaUxVersion = VERSION;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
