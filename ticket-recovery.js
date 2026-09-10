(() => {
  "use strict";

  const API_URL = String(window.APP_CONFIG?.webAppUrl || "").trim();

  function digits(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 11);
  }

  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 40);
  }

  function formatCpf(value) {
    const v = digits(value);
    return v
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  async function request(action, payload = {}, timeoutMs = 18000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ action, ...payload })
      });

      if (!response.ok) throw new Error("HTTP_" + response.status);
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "RECOVERY_ERROR");
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function installStyles() {
    if (document.getElementById("ticket-recovery-styles")) return;

    const style = document.createElement("style");
    style.id = "ticket-recovery-styles";
    style.textContent = `
      .ticket-recovery-entry{
        margin-top:14px;padding:15px;border:1px solid rgba(224,169,52,.22);border-radius:10px;
        background:rgba(255,255,255,.018);text-align:center
      }
      .ticket-recovery-entry small{display:block;color:#8e7b59;font-family:var(--display);font-size:10px;letter-spacing:1.5px}
      .ticket-recovery-entry strong{display:block;margin-top:3px;color:#e6c36d;font-family:var(--display);font-size:15px;letter-spacing:.7px}
      .ticket-recovery-entry p{margin:5px 0 12px;color:#938878;font-size:12px;line-height:1.45}
      .ticket-recovery-button{width:100%;min-height:44px;border:1px solid rgba(224,169,52,.35);border-radius:8px;background:#0b0805;color:#e7c16a;font-family:var(--display);font-weight:700;letter-spacing:.8px;cursor:pointer}
      .ticket-recovery-button:hover{border-color:rgba(238,190,89,.68);color:#ffe09a}
      .ticket-recovery-fields{display:grid;gap:12px;margin:18px 0 14px}
      .ticket-recovery-field{text-align:left}
      .ticket-recovery-field>span{display:block;margin-bottom:6px;color:#b29251;font-family:var(--display);font-size:10px;letter-spacing:1.4px}
      .ticket-recovery-field input{width:100%;min-height:48px;padding:0 13px;border:1px solid rgba(221,166,55,.24);border-radius:8px;background:#080604;color:#fff;outline:none;font-size:15px}
      .ticket-recovery-field input:focus{border-color:#dba73f;box-shadow:0 0 0 3px rgba(219,167,63,.08)}
      .ticket-recovery-error{display:none;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(231,76,81,.35);border-radius:8px;background:rgba(137,13,18,.16);color:#f0b7b9;font-size:12px;line-height:1.4;text-align:left}
      .ticket-recovery-error.show{display:block}
      .ticket-recovery-secondary{width:100%;min-height:45px;margin-top:9px;border:1px solid rgba(218,165,60,.18);border-radius:9px;background:#080604;color:#b79a5b;font-family:var(--display);letter-spacing:.8px;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function createEntry() {
    if (document.getElementById("ticketRecoveryEntry")) return;

    const form = document.getElementById("ticketForm");
    if (!form) return;

    const box = document.createElement("div");
    box.className = "ticket-recovery-entry";
    box.id = "ticketRecoveryEntry";
    box.innerHTML = `
      <small>JÁ CONFIRMOU SUA PRESENÇA?</small>
      <strong>RECUPERE SEUS INGRESSOS</strong>
      <p>Use o código do convite e o CPF do convidado principal para acessar novamente os ingressos emitidos.</p>
      <button type="button" class="ticket-recovery-button" id="openTicketRecovery"><i class="fa-solid fa-ticket"></i> RECUPERAR MEUS INGRESSOS</button>
    `;

    form.insertAdjacentElement("afterend", box);
    box.querySelector("#openTicketRecovery")?.addEventListener("click", openModal);
  }

  function openModal() {
    if (document.getElementById("ticketRecoveryModal")) return;

    const overlay = document.createElement("div");
    overlay.className = "cinema-info-overlay";
    overlay.id = "ticketRecoveryModal";
    overlay.innerHTML = `
      <div class="cinema-info-dialog" role="dialog" aria-modal="true" aria-labelledby="ticketRecoveryTitle">
        <div class="cinema-info-icon"><i class="fa-solid fa-ticket"></i></div>
        <small>INGRESSOS JÁ EMITIDOS</small>
        <h2 id="ticketRecoveryTitle">RECUPERAR MEUS INGRESSOS</h2>
        <p class="cinema-info-lead">Informe as duas credenciais usadas para proteger o acesso aos ingressos do seu convite.</p>

        <div class="ticket-recovery-fields">
          <label class="ticket-recovery-field">
            <span>CÓDIGO DO CONVITE</span>
            <input id="ticketRecoveryCode" type="text" maxlength="40" autocomplete="off" autocapitalize="characters" placeholder="Ex.: CLAUREA-AB12CD">
          </label>
          <label class="ticket-recovery-field">
            <span>CPF DO CONVIDADO PRINCIPAL</span>
            <input id="ticketRecoveryCpf" type="text" inputmode="numeric" maxlength="14" autocomplete="off" placeholder="000.000.000-00">
          </label>
        </div>

        <div class="ticket-recovery-error" id="ticketRecoveryError"></div>

        <button type="button" class="cinema-info-primary" id="ticketRecoverySubmit"><i class="fa-solid fa-unlock-keyhole"></i> ACESSAR MEUS INGRESSOS</button>
        <button type="button" class="ticket-recovery-secondary" id="ticketRecoveryClose">CANCELAR</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";

    const codeInput = overlay.querySelector("#ticketRecoveryCode");
    const cpfInput = overlay.querySelector("#ticketRecoveryCpf");
    const close = () => {
      overlay.remove();
      document.documentElement.style.overflow = "";
    };

    codeInput.addEventListener("input", () => {
      codeInput.value = normalizeCode(codeInput.value);
    });
    cpfInput.addEventListener("input", () => {
      cpfInput.value = formatCpf(cpfInput.value);
    });
    overlay.querySelector("#ticketRecoveryClose")?.addEventListener("click", close);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });
    overlay.querySelector("#ticketRecoverySubmit")?.addEventListener("click", () => recover(overlay));

    setTimeout(() => codeInput.focus(), 120);
  }

  function showError(overlay, message) {
    const error = overlay.querySelector("#ticketRecoveryError");
    error.textContent = message;
    error.classList.add("show");
  }

  async function recover(overlay) {
    const code = normalizeCode(overlay.querySelector("#ticketRecoveryCode")?.value);
    const cpf = digits(overlay.querySelector("#ticketRecoveryCpf")?.value);
    const button = overlay.querySelector("#ticketRecoverySubmit");
    const error = overlay.querySelector("#ticketRecoveryError");

    error.classList.remove("show");

    if (!code || cpf.length !== 11) {
      showError(overlay, "Informe o código do convite e o CPF completo do convidado principal.");
      return;
    }

    const old = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> LOCALIZANDO INGRESSOS...';

    try {
      const result = await request("recoverTickets", { inviteCode: code, cpf }, 22000);
      const registration = result.registration;

      if (!registration?.tickets?.length) throw new Error("RECOVERY_TICKETS_NOT_FOUND");

      try {
        if (typeof window.saveRecentRegistration === "function") {
          window.saveRecentRegistration(code, registration);
        }
      } catch (_) {}

      overlay.remove();
      document.documentElement.style.overflow = "";

      if (typeof window.mostrarPopupCadastro === "function") {
        await window.mostrarPopupCadastro({
          kicker: "INGRESSOS RECUPERADOS",
          title: "ENCONTRAMOS SEUS INGRESSOS!",
          text: "Seus ingressos foram localizados com segurança. Agora você pode baixá-los ou imprimi-los novamente.",
          quantidade: registration.tickets.length
        });
      }

      if (typeof window.renderizarIngressos !== "function") {
        throw new Error("RECOVERY_RENDER_UNAVAILABLE");
      }

      await window.renderizarIngressos(registration);
    } catch (err) {
      const message = String(err?.message || "");
      if (!document.body.contains(overlay)) {
        document.body.appendChild(overlay);
        document.documentElement.style.overflow = "hidden";
      }

      if (message.includes("RECOVERY_TICKETS_NOT_FOUND")) {
        showError(overlay, "O cadastro foi localizado, mas os ingressos não estão disponíveis. Fale com a organização.");
      } else if (message.includes("NETWORK") || message.includes("HTTP_") || err?.name === "AbortError") {
        showError(overlay, "Não foi possível acessar o servidor agora. Verifique sua internet e tente novamente.");
      } else {
        showError(overlay, "Não foi possível confirmar esses dados. Confira o código do convite e o CPF do convidado principal.");
      }
    } finally {
      button.disabled = false;
      button.innerHTML = old;
    }
  }

  async function backendSupportsRecovery() {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(API_URL)) return false;

    try {
      const health = await request("health", {}, 7000);
      return Boolean(health?.capabilities?.ticketRecovery);
    } catch (_) {
      return false;
    }
  }

  async function init() {
    installStyles();
    if (await backendSupportsRecovery()) createEntry();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
