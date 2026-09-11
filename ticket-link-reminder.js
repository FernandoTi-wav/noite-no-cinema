(() => {
  "use strict";

  const INVITE_SESSION_KEY = "cinemaInviteCodeV22";

  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 40);
  }

  function currentInviteCode() {
    return normalizeCode(
      window.__cinemaInviteCodeV22 ||
      sessionStorage.getItem(INVITE_SESSION_KEY) ||
      ""
    );
  }

  function personalInviteUrl(code) {
    const url = new URL("index.html", location.href);
    url.searchParams.set("convite", code);
    url.hash = "inicio";
    return url.href;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  }

  function installStyles() {
    if (document.getElementById("ticket-link-reminder-styles")) return;
    const style = document.createElement("style");
    style.id = "ticket-link-reminder-styles";
    style.textContent = `
      .ticket-link-reminder{
        margin:18px 0 0;padding:15px 16px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;
        border:1px solid rgba(220,167,61,.26);border-radius:10px;background:linear-gradient(135deg,rgba(29,21,9,.96),rgba(10,8,5,.97));
        box-shadow:0 12px 30px rgba(0,0,0,.22)
      }
      .ticket-link-reminder>i{font-size:22px;color:#e2b64d}
      .ticket-link-reminder strong{display:block;color:#f3d17c;font-family:var(--display);font-size:14px;letter-spacing:.8px}
      .ticket-link-reminder span{display:block;margin-top:3px;color:#a89d8c;font-size:12px;line-height:1.45}
      .ticket-link-reminder button{
        min-height:40px;padding:0 12px;border:1px solid rgba(231,188,94,.38);border-radius:7px;background:#0a0805;color:#e9c56d;
        font-family:var(--display);font-size:11px;font-weight:700;letter-spacing:.8px;cursor:pointer;white-space:nowrap
      }
      .ticket-link-reminder button:hover{border-color:rgba(238,196,104,.7);color:#ffe09a}
      @media(max-width:700px){
        .ticket-link-reminder{grid-template-columns:auto 1fr}
        .ticket-link-reminder button{grid-column:1/-1;width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureReminder() {
    const results = document.getElementById("ticketResults");
    if (!results || results.classList.contains("hidden")) return;

    const hasTicket = Boolean(results.querySelector(".generated-card, .generated-ticket-image"));
    if (!hasTicket || document.getElementById("ticketLinkReminder")) return;

    const code = currentInviteCode();
    if (!code) return;

    const reminder = document.createElement("div");
    reminder.id = "ticketLinkReminder";
    reminder.className = "ticket-link-reminder";
    reminder.innerHTML = `
      <i class="fa-solid fa-bookmark"></i>
      <div>
        <strong>GUARDE O LINK DO SEU CONVITE</strong>
        <span>Salve este link ou adicione a página aos favoritos para voltar ao convite com facilidade neste aparelho.</span>
      </div>
      <button type="button"><i class="fa-regular fa-copy"></i> COPIAR LINK</button>
    `;

    results.insertAdjacentElement("afterend", reminder);
    const button = reminder.querySelector("button");
    button?.addEventListener("click", async () => {
      await copyText(personalInviteUrl(code));
      const old = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-check"></i> LINK COPIADO';
      setTimeout(() => { button.innerHTML = old; }, 2200);
    });
  }

  function init() {
    installStyles();
    const results = document.getElementById("ticketResults");
    if (!results) return;
    const observer = new MutationObserver(ensureReminder);
    observer.observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    ensureReminder();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();