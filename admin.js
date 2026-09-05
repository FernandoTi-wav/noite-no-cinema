const CONFIG_ADMIN = {
  capacidadeEvento: Number(window.APP_CONFIG?.capacidadeEvento) || 150,
  ticketBase: "assets/ticket-print-base.png"
};

const table = document.getElementById("guestTable");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const exportCsvBtn = document.getElementById("exportCsvBtn");

const tabGuestsBtn = document.getElementById("tabGuestsBtn");
const tabInvitesBtn = document.getElementById("tabInvitesBtn");
const guestPanel = document.getElementById("guestPanel");
const invitePanel = document.getElementById("invitePanel");

const inviteTotal = document.getElementById("inviteTotal");
const inviteAvailable = document.getElementById("inviteAvailable");
const inviteRedeemed = document.getElementById("inviteRedeemed");
const inviteInactive = document.getElementById("inviteInactive");
const newInviteBtn = document.getElementById("newInviteBtn");
const inviteEditor = document.getElementById("inviteEditor");
const inviteEditorKicker = document.getElementById("inviteEditorKicker");
const inviteEditorTitle = document.getElementById("inviteEditorTitle");
const inviteEditorClose = document.getElementById("inviteEditorClose");
const inviteCodeInput = document.getElementById("inviteCodeInput");
const inviteCompanionsInput = document.getElementById("inviteCompanionsInput");
const inviteNoteInput = document.getElementById("inviteNoteInput");
const inviteActiveInput = document.getElementById("inviteActiveInput");
const inviteCancelBtn = document.getElementById("inviteCancelBtn");
const inviteSaveBtn = document.getElementById("inviteSaveBtn");
const inviteSearchInput = document.getElementById("inviteSearchInput");
const inviteRefreshBtn = document.getElementById("inviteRefreshBtn");
const inviteTable = document.getElementById("inviteTable");
const inviteEmptyState = document.getElementById("inviteEmptyState");

const totalInscricoes = document.getElementById("totalInscricoes");
const totalIngressos = document.getElementById("totalIngressos");
const totalPresentes = document.getElementById("totalPresentes");
const vagasRestantes = document.getElementById("vagasRestantes");
const logoutBtn = document.getElementById("logoutBtn");

const ticketAdminModal = document.getElementById("ticketAdminModal");
const ticketAdminClose = document.getElementById("ticketAdminClose");
const ticketAdminTitle = document.getElementById("ticketAdminTitle");
const ticketAdminGuest = document.getElementById("ticketAdminGuest");
const ticketAdminImage = document.getElementById("ticketAdminImage");
const ticketAdminLoading = document.getElementById("ticketAdminLoading");
const ticketAdminDownload = document.getElementById("ticketAdminDownload");
const ticketAdminPrint = document.getElementById("ticketAdminPrint");

const adminConfirmModal = document.getElementById("adminConfirmModal");
const adminConfirmTitle = document.getElementById("adminConfirmTitle");
const adminConfirmText = document.getElementById("adminConfirmText");
const adminConfirmCancel = document.getElementById("adminConfirmCancel");
const adminConfirmDelete = document.getElementById("adminConfirmDelete");

const adminToast = document.getElementById("adminToast");

let inscricoes = [];
let refreshTimer = null;
let ticketBaseImage = null;
let currentTicketDataUrl = "";
let currentTicketCode = "";
let pendingDeleteIndex = null;
let pendingInviteDeleteCode = null;
let toastTimer = null;

let inviteCodes = [];
let inviteLoaded = false;
let inviteLoading = false;
let inviteEditingCode = "";
let pendingInviteCreateRequestId = "";
const INVITE_SNAPSHOT_KEY = "cinemaInviteCodesSnapshot";


// ============================================================
// API / sessão
// ============================================================

function sheetsConfigurado() {
  const url = String(window.APP_CONFIG?.webAppUrl || "").trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(url);
}

function getWebAppUrl() {
  return String(window.APP_CONFIG?.webAppUrl || "").trim();
}

function getAdminToken() {
  return (
    sessionStorage.getItem("cinemaAdminToken") ||
    localStorage.getItem("cinemaAdminToken") ||
    ""
  );
}

function clearAdminToken() {
  sessionStorage.removeItem("cinemaAdminToken");
  localStorage.removeItem("cinemaAdminToken");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sheetsRequest(action, payload = {}, options = {}) {
  if (!navigator.onLine) {
    throw new Error("NETWORK_OFFLINE");
  }

  const timeoutMs = Number(options.timeoutMs || 18000);
  const retries = Math.max(0, Number(options.retries || 0));

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(getWebAppUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ action, ...payload })
      });

      if (!response.ok) {
        throw new Error("HTTP_" + response.status);
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (_) {
        throw new Error("INVALID_APPS_SCRIPT_RESPONSE");
      }

      if (!data.ok) {
        throw new Error(data.error || "APPS_SCRIPT_ERROR");
      }

      return data;
    } catch (error) {
      const normalized =
        error?.name === "AbortError"
          ? new Error("REQUEST_TIMEOUT")
          : error instanceof TypeError
            ? new Error("NETWORK_ERROR")
            : error;

      const retryable =
        normalized.message === "REQUEST_TIMEOUT" ||
        normalized.message === "NETWORK_ERROR" ||
        /^HTTP_5\d\d$/.test(normalized.message);

      if (attempt < retries && retryable) {
        await wait(350 + attempt * 350);
        continue;
      }

      throw normalized;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isAuthError(error) {
  const message = String(error?.message || "");
  return (
    message.includes("ADMIN_UNAUTHORIZED") ||
    message.includes("ADMIN_SESSION_EXPIRED")
  );
}

function showAdminToast(message, isError = false) {
  clearTimeout(toastTimer);

  adminToast.textContent = message;
  adminToast.classList.toggle("error", isError);
  adminToast.classList.add("show");

  toastTimer = setTimeout(() => {
    adminToast.classList.remove("show");
  }, 3300);
}

const ADMIN_SNAPSHOT_KEY = "cinemaAdminSnapshot";

function saveAdminSnapshot(result) {
  try {
    localStorage.setItem(
      ADMIN_SNAPSHOT_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        capacity: Number(result.capacity || CONFIG_ADMIN.capacidadeEvento),
        registrations: result.registrations || []
      })
    );
  } catch (_) {}
}

function loadAdminSnapshot() {
  try {
    const snapshot = JSON.parse(localStorage.getItem(ADMIN_SNAPSHOT_KEY) || "null");

    if (!snapshot || !Array.isArray(snapshot.registrations)) {
      return false;
    }

    // O cache serve apenas para abrir o painel rápido enquanto atualiza ao fundo.
    if (Date.now() - Number(snapshot.savedAt || 0) > 12 * 60 * 60 * 1000) {
      return false;
    }

    inscricoes = snapshot.registrations;

    if (snapshot.capacity) {
      CONFIG_ADMIN.capacidadeEvento = Number(snapshot.capacity);
    }

    updateSummary();
    render();
    return true;
  } catch (_) {
    return false;
  }
}

// ============================================================
// Helpers / dados
// ============================================================

function cpfDigits(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCpf(item) {
  const d = cpfDigits(item.cpf);

  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  // Compatibilidade apenas com cadastros antigos, feitos antes da V18.
  if (item.cpfLast4) {
    return `***.***.***-${item.cpfLast4}`;
  }

  return item.cpf || "-";
}

function formatDate(iso) {
  if (!iso) return "-";

  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizeTickets(item) {
  if (Array.isArray(item.tickets) && item.tickets.length) {
    item.tickets.forEach(ticket => {
      if (typeof ticket.presente !== "boolean") {
        ticket.presente = Boolean(item.presente);
      }

      if (!("checkInEm" in ticket)) {
        ticket.checkInEm = ticket.presente ? item.criadoEm || null : null;
      }
    });

    return item.tickets;
  }

  const quantity = Number(item.quantidade || 0);

  item.tickets = Array.from({ length: quantity }, (_, index) => ({
    numero: String(index + 1).padStart(4, "0"),
    codigo: item.codigo
      ? quantity === 1
        ? item.codigo
        : `${item.codigo}-${index + 1}`
      : `LEGADO-${index + 1}`,
    presente: Boolean(item.presente),
    checkInEm: item.presente ? item.criadoEm || null : null
  }));

  return item.tickets;
}

function ticketCount(item) {
  return normalizeTickets(item).length;
}

function checkedCount(item) {
  return normalizeTickets(item).filter(ticket => ticket.presente).length;
}

function allCodes(item) {
  return normalizeTickets(item).map(ticket => ticket.codigo);
}

function saveLocal() {
  localStorage.setItem("cinemaInscricoes", JSON.stringify(inscricoes));
}

// ============================================================
// Carregamento
// ============================================================

async function carregarRemoto({ silent = false } = {}) {
  const token = getAdminToken();

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  try {
    const result = await sheetsRequest(
      "adminList",
      { token },
      { timeoutMs: 12000, retries: 1 }
    );

    inscricoes = result.registrations || [];

    if (result.capacity) {
      CONFIG_ADMIN.capacidadeEvento = Number(result.capacity);
    }

    saveAdminSnapshot(result);
    updateSummary();
    render();
  } catch (error) {
    if (isAuthError(error)) {
      clearAdminToken();
      localStorage.removeItem(ADMIN_SNAPSHOT_KEY);
      window.location.href = "index.html";
      return;
    }

    console.error(error);

    if (!silent) {
      const message = String(error?.message || "");

      if (message.includes("NETWORK_OFFLINE")) {
        showAdminToast("Sem internet. Exibindo a última lista salva.", true);
      } else if (message.includes("REQUEST_TIMEOUT")) {
        showAdminToast("Servidor lento. Mantivemos a última lista enquanto tentamos novamente.", true);
      } else {
        showAdminToast("Não foi possível atualizar a lista agora.", true);
      }
    }
  }
}

function carregarLocal() {
  if (sessionStorage.getItem("cinemaAdmin") !== "ok") {
    window.location.href = "index.html";
    return;
  }

  inscricoes = JSON.parse(localStorage.getItem("cinemaInscricoes")) || [];
  inscricoes.forEach(normalizeTickets);
  saveLocal();

  updateSummary();
  render();
}

// ============================================================
// Check-in
// ============================================================

async function atualizarCheckIn(itemIndex, ticketIndex, button) {
  const ticket = normalizeTickets(inscricoes[itemIndex])[ticketIndex];
  const novoStatus = !ticket.presente;
  const checkInEm = novoStatus ? new Date().toISOString() : null;

  if (button) {
    button.disabled = true;
    button.classList.add("busy");
  }

  try {
    if (sheetsConfigurado()) {
      const result = await sheetsRequest("adminCheckIn", {
        token: getAdminToken(),
        ticketId: ticket.id,
        present: novoStatus
      });

      ticket.presente = Boolean(result.present);
      ticket.checkInEm = result.checkInEm || null;
    } else {
      ticket.presente = novoStatus;
      ticket.checkInEm = checkInEm;
      saveLocal();
    }

    updateSummary();
    render();

    showAdminToast(
      ticket.presente
        ? `${ticket.codigo} marcado como presente.`
        : `Check-in de ${ticket.codigo} desfeito.`
    );
  } catch (error) {
    console.error(error);

    if (isAuthError(error)) {
      clearAdminToken();
      window.location.href = "index.html";
      return;
    }

    showAdminToast("Não foi possível atualizar o check-in.", true);
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("busy");
    }
  }
}

// ============================================================
// Exclusão customizada
// ============================================================

function pedirConfirmacaoExclusao(index) {
  pendingDeleteIndex = index;
  pendingInviteDeleteCode = null;
  const item = inscricoes[index];

  adminConfirmTitle.textContent = "REMOVER CONVIDADO?";
  adminConfirmText.textContent =
    `O cadastro de ${item.nome} e todos os ingressos vinculados serão removidos permanentemente. O código do convite será liberado novamente.`;

  adminConfirmModal.classList.add("active");
  adminConfirmModal.setAttribute("aria-hidden", "false");
}

function pedirConfirmacaoExclusaoConvite(code) {
  pendingDeleteIndex = null;
  pendingInviteDeleteCode = String(code || "");

  adminConfirmTitle.textContent = "REMOVER CÓDIGO?";
  adminConfirmText.textContent =
    `O código ${pendingInviteDeleteCode} será removido da lista. Esta ação não pode ser desfeita.`;

  adminConfirmModal.classList.add("active");
  adminConfirmModal.setAttribute("aria-hidden", "false");
}

function fecharConfirmacaoExclusao() {
  pendingDeleteIndex = null;
  pendingInviteDeleteCode = null;
  adminConfirmModal.classList.remove("active");
  adminConfirmModal.setAttribute("aria-hidden", "true");
}

async function confirmarExclusao() {
  if (pendingDeleteIndex === null && !pendingInviteDeleteCode) return;

  adminConfirmDelete.disabled = true;
  adminConfirmDelete.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> EXCLUINDO';

  try {
    if (pendingInviteDeleteCode) {
      const code = pendingInviteDeleteCode;

      await sheetsRequest(
        "adminInviteDelete",
        {
          token: getAdminToken(),
          code
        },
        { timeoutMs: 30000, retries: 0 }
      );

      inviteCodes = inviteCodes.filter(item => item.code !== code);
      saveInviteSnapshot();
      fecharConfirmacaoExclusao();
      updateInviteSummary();
      renderInviteCodes();
      showAdminToast(`Código ${code} removido.`);
      return;
    }

    const index = pendingDeleteIndex;
    const item = inscricoes[index];

    if (sheetsConfigurado()) {
      await sheetsRequest("adminDelete", {
        token: getAdminToken(),
        registrationId: item.id
      });
    }

    inscricoes.splice(index, 1);

    if (!sheetsConfigurado()) {
      saveLocal();
    }

    fecharConfirmacaoExclusao();
    updateSummary();
    render();

    showAdminToast(`Cadastro de ${item.nome} removido.`);
  } catch (error) {
    console.error(error);

    if (isAuthError(error)) {
      clearAdminToken();
      window.location.href = "index.html";
      return;
    }

    const message = String(error?.message || "");

    if (message.includes("INVITE_CODE_REDEEMED")) {
      showAdminToast("Códigos já resgatados não podem ser excluídos.", true);
    } else {
      showAdminToast("Não foi possível concluir a exclusão.", true);
    }
  } finally {
    adminConfirmDelete.disabled = false;
    adminConfirmDelete.innerHTML =
      '<i class="fa-solid fa-trash"></i> EXCLUIR';
  }
}


// ============================================================
// Ingresso / reimpressão
// ============================================================

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function criarImagemIngressoAdmin(ticket, index, total) {
  if (!ticketBaseImage) {
    ticketBaseImage = await loadImage(CONFIG_ADMIN.ticketBase);
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  if (typeof JsBarcode === "undefined") {
    throw new Error("BARCODE_NOT_LOADED");
  }

  const canvas = document.createElement("canvas");
  canvas.width = ticketBaseImage.naturalWidth;
  canvas.height = ticketBaseImage.naturalHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(ticketBaseImage, 0, 0);

  ctx.save();

  ctx.strokeStyle = "rgba(25,18,8,.78)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1520, 185);
  ctx.lineTo(1650, 185);
  ctx.moveTo(1710, 185);
  ctx.lineTo(1840, 185);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#181109";
  ctx.font = '28px "Bebas Neue", sans-serif';
  ctx.fillText("★", 1680, 185);

  ctx.textAlign = "left";
  ctx.fillStyle = "#11100e";
  ctx.font = '44px "Bebas Neue", sans-serif';
  ctx.fillText("Nº", 1525, 245);

  ctx.textAlign = "center";
  ctx.fillStyle = "#8f1718";
  ctx.font = '66px "Bebas Neue", sans-serif';
  ctx.fillText(ticket.numero, 1720, 240);

  ctx.strokeStyle = "rgba(25,18,8,.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1520, 285);
  ctx.lineTo(1840, 285);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#15110a";
  ctx.font = '28px "Bebas Neue", sans-serif';
  ctx.fillText("CÓDIGO ÚNICO", 1680, 325);

  ctx.font = '37px "Bebas Neue", sans-serif';
  ctx.fillText(ticket.codigo, 1680, 362);

  const barcodeCanvas = document.createElement("canvas");

  JsBarcode(barcodeCanvas, ticket.codigo, {
    format: "CODE128",
    displayValue: false,
    lineColor: "#080705",
    background: "rgba(0,0,0,0)",
    width: 3,
    height: 105,
    margin: 0
  });

  ctx.drawImage(barcodeCanvas, 1515, 397, 330, 105);

  if (total > 1) {
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(20,16,10,.72)";
    ctx.font = '21px "Barlow Condensed", sans-serif';
    ctx.fillText(`${index + 1}/${total}`, 1840, 515);
  }

  ctx.restore();

  return canvas.toDataURL("image/png");
}

async function abrirIngressoAdmin(itemIndex, ticketIndex, button) {
  const item = inscricoes[itemIndex];
  const tickets = normalizeTickets(item);
  const ticket = tickets[ticketIndex];

  ticketAdminTitle.textContent = ticket.codigo;
  ticketAdminGuest.textContent = `${item.nome} • ${maskCpf(item)}`;
  ticketAdminImage.removeAttribute("src");
  ticketAdminImage.classList.remove("ready");
  ticketAdminLoading.classList.remove("hidden");

  currentTicketDataUrl = "";
  currentTicketCode = ticket.codigo;

  ticketAdminModal.classList.add("active");
  ticketAdminModal.setAttribute("aria-hidden", "false");

  if (button) {
    button.disabled = true;
  }

  try {
    currentTicketDataUrl = await criarImagemIngressoAdmin(
      ticket,
      ticketIndex,
      tickets.length
    );

    ticketAdminImage.src = currentTicketDataUrl;
    ticketAdminImage.classList.add("ready");
    ticketAdminLoading.classList.add("hidden");
  } catch (error) {
    console.error(error);
    fecharIngressoAdmin();
    showAdminToast("Não foi possível preparar o ingresso para impressão.", true);
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function fecharIngressoAdmin() {
  ticketAdminModal.classList.remove("active");
  ticketAdminModal.setAttribute("aria-hidden", "true");
  currentTicketDataUrl = "";
  currentTicketCode = "";
}

function baixarIngressoAdmin() {
  if (!currentTicketDataUrl || !currentTicketCode) return;

  const link = document.createElement("a");
  link.href = currentTicketDataUrl;
  link.download = `ingresso-${currentTicketCode}.png`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  showAdminToast("PNG do ingresso preparado para envio.");
}

function imprimirIngressoAdmin() {
  if (!currentTicketDataUrl || !currentTicketCode) return;

  const printWindow = window.open("", "_blank", "width=1200,height=800");

  if (!printWindow) {
    showAdminToast("O navegador bloqueou a janela de impressão.", true);
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>${currentTicketCode}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          html,body { margin:0;min-height:100%;background:white; }
          body { display:flex;align-items:center;justify-content:center;padding:8mm; }
          img { width:100%;max-width:270mm;height:auto;display:block;object-fit:contain; }
          @media print { body { padding:0; } }
        </style>
      </head>
      <body>
        <img src="${currentTicketDataUrl}" alt="${currentTicketCode}">
        <script>
          const img = document.querySelector("img");
          img.onload = () => setTimeout(() => {
            window.focus();
            window.print();
          }, 250);
        <\/script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

// ============================================================
// Dashboard / render
// ============================================================

function updateSummary() {
  const emitted = inscricoes.reduce((sum, item) => sum + ticketCount(item), 0);
  const checked = inscricoes.reduce((sum, item) => sum + checkedCount(item), 0);

  totalInscricoes.textContent = inscricoes.length;
  totalIngressos.textContent = emitted;
  totalPresentes.textContent = checked;
  vagasRestantes.textContent = Math.max(
    0,
    CONFIG_ADMIN.capacidadeEvento - emitted
  );
}

function matchesStatus(item) {
  const filter = statusFilter.value;
  const present = checkedCount(item);
  const total = ticketCount(item);

  if (filter === "presentes") return present > 0;
  if (filter === "pendentes") return present < total;
  return true;
}

function ticketHtml(ticket, itemIndex, ticketIndex) {
  const checked = ticket.presente;

  return `
    <div class="ticket-chip ${checked ? "checked" : ""}">
      <div class="ticket-chip-code">
        <i class="fa-solid fa-barcode"></i>
        <span>${escapeHtml(ticket.codigo)}</span>
      </div>

      <div class="ticket-chip-actions">
        <button
          class="ticket-view-btn"
          data-view-item="${itemIndex}"
          data-view-ticket="${ticketIndex}"
          title="Abrir, baixar ou imprimir ingresso"
        >
          <i class="fa-solid fa-ticket"></i>
          INGRESSO
        </button>

        <button
          class="ticket-check-btn ${checked ? "checked" : ""}"
          data-item="${itemIndex}"
          data-ticket="${ticketIndex}"
          title="${checked ? "Desfazer check-in" : "Marcar presença"}"
        >
          <i class="fa-solid ${checked ? "fa-circle-check" : "fa-arrow-right-to-bracket"}"></i>
          ${checked ? "PRESENTE" : "CHECK-IN"}
        </button>
      </div>
    </div>
  `;
}

function render() {
  const term = searchInput.value.trim().toLowerCase();

  const filtered = inscricoes.filter(item => {
    const searchable = [
      item.nome,
      item.cpf,
      item.cpfLast4,
      item.inviteCode,
      item.acompanhantes,
      ...allCodes(item)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(term) && matchesStatus(item);
  });

  table.innerHTML = "";
  emptyState.classList.toggle("hidden", filtered.length > 0);

  filtered.forEach(item => {
    const itemIndex = inscricoes.indexOf(item);
    const tickets = normalizeTickets(item);
    const checked = checkedCount(item);

    const tr = document.createElement("tr");

    const acompanhantes = Number(item.acompanhantes || Math.max(0, tickets.length - 1));

    tr.innerHTML = `
      <td class="guest-name">
        <strong>${escapeHtml(item.nome)}</strong>
        <small>${tickets.length} ${tickets.length === 1 ? "ingresso liberado" : "ingressos liberados"}</small>
      </td>

      <td class="cpf-full">${escapeHtml(formatCpf(item))}</td>

      <td>
        <span class="invite-code-badge">
          <i class="fa-solid fa-key"></i>
          ${escapeHtml(item.inviteCode || "CADASTRO ANTIGO")}
        </span>
      </td>

      <td>
        <div class="companion-count">
          <strong>${acompanhantes}</strong>
          <span>${acompanhantes === 1 ? "ACOMPANHANTE" : "ACOMPANHANTES"}</span>
        </div>
      </td>

      <td>
        <div class="ticket-chip-list">
          ${tickets
            .map((ticket, ticketIndex) =>
              ticketHtml(ticket, itemIndex, ticketIndex)
            )
            .join("")}
        </div>
      </td>

      <td>${escapeHtml(formatDate(item.criadoEm))}</td>

      <td>
        <div class="registration-status ${
          checked === tickets.length && tickets.length
            ? "complete"
            : checked
              ? "partial"
              : ""
        }">
          <strong>${checked}/${tickets.length}</strong>
          <span>${
            checked === tickets.length && tickets.length
              ? "TODOS PRESENTES"
              : checked
                ? "CHECK-IN PARCIAL"
                : "AGUARDANDO"
          }</span>
        </div>
      </td>

      <td>
        <button class="delete-btn" data-delete="${itemIndex}" title="Excluir cadastro">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;

    table.appendChild(tr);
  });

  document.querySelectorAll(".ticket-check-btn").forEach(button => {
    button.addEventListener("click", async () => {
      await atualizarCheckIn(
        Number(button.dataset.item),
        Number(button.dataset.ticket),
        button
      );
    });
  });

  document.querySelectorAll(".ticket-view-btn").forEach(button => {
    button.addEventListener("click", async () => {
      await abrirIngressoAdmin(
        Number(button.dataset.viewItem),
        Number(button.dataset.viewTicket),
        button
      );
    });
  });

  document.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", () => {
      pedirConfirmacaoExclusao(Number(button.dataset.delete));
    });
  });
}

// ============================================================
// Gestão de códigos dos convites — carregamento sob demanda
// ============================================================

function saveInviteSnapshot() {
  try {
    localStorage.setItem(
      INVITE_SNAPSHOT_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        codes: inviteCodes
      })
    );
  } catch (_) {}
}

function loadInviteSnapshot() {
  try {
    const snapshot = JSON.parse(
      localStorage.getItem(INVITE_SNAPSHOT_KEY) || "null"
    );

    if (
      !snapshot ||
      !Array.isArray(snapshot.codes) ||
      Date.now() - Number(snapshot.savedAt || 0) > 12 * 60 * 60 * 1000
    ) {
      return false;
    }

    inviteCodes = snapshot.codes;
    updateInviteSummary();
    renderInviteCodes();
    return true;
  } catch (_) {
    return false;
  }
}

function updateInviteSummary() {
  const total = inviteCodes.length;
  const redeemed = inviteCodes.filter(item => item.redeemed).length;
  const inactive = inviteCodes.filter(
    item => !item.redeemed && !item.active
  ).length;
  const available = inviteCodes.filter(
    item => !item.redeemed && item.active
  ).length;

  inviteTotal.textContent = total;
  inviteAvailable.textContent = available;
  inviteRedeemed.textContent = redeemed;
  inviteInactive.textContent = inactive;
}

function inviteStatus(item) {
  if (item.redeemed) {
    return {
      cls: "redeemed",
      icon: "fa-circle-check",
      label: "RESGATADO"
    };
  }

  if (!item.active) {
    return {
      cls: "inactive",
      icon: "fa-circle-pause",
      label: "INATIVO"
    };
  }

  return {
    cls: "available",
    icon: "fa-circle",
    label: "DISPONÍVEL"
  };
}

function filteredInviteCodes() {
  const query = String(inviteSearchInput.value || "")
    .trim()
    .toLowerCase();

  if (!query) return inviteCodes;

  return inviteCodes.filter(item => {
    return [
      item.code,
      item.note,
      item.redeemedBy,
      item.redeemedCpfLast4
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderInviteCodes() {
  const items = filteredInviteCodes();
  inviteTable.innerHTML = "";
  inviteEmptyState.classList.toggle("hidden", items.length > 0);

  items.forEach(item => {
    const status = inviteStatus(item);
    const row = document.createElement("tr");
    const redeemedInfo = item.redeemed
      ? `
        <div class="invite-redeemed-by">
          <strong>${escapeHtml(item.redeemedBy || "Cadastro localizado")}</strong>
          <small>${item.redeemedAt ? escapeHtml(formatDate(item.redeemedAt)) : ""}</small>
        </div>
      `
      : '<span class="muted">—</span>';

    row.innerHTML = `
      <td>
        <div class="invite-code-main">
          <i class="fa-solid fa-key"></i>
          <strong>${escapeHtml(item.code)}</strong>
        </div>
      </td>
      <td>
        <div class="companion-count">
          <strong>${Number(item.companions || 0)}</strong>
          <span>ACOMP.</span>
        </div>
      </td>
      <td>
        <span class="invite-status ${status.cls}">
          <i class="fa-solid ${status.icon}"></i>
          ${status.label}
        </span>
      </td>
      <td>${redeemedInfo}</td>
      <td><div class="invite-note">${escapeHtml(item.note || "—")}</div></td>
      <td>
        <div class="invite-row-actions">
          <button
            type="button"
            class="invite-copy-btn"
            data-code="${escapeHtml(item.code)}"
            title="Copiar código"
          >
            <i class="fa-regular fa-copy"></i>
          </button>

          <button
            type="button"
            class="invite-edit-btn"
            data-code="${escapeHtml(item.code)}"
            title="Editar"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <button
            type="button"
            class="invite-delete-btn danger"
            data-code="${escapeHtml(item.code)}"
            title="Excluir"
            ${item.redeemed ? "disabled" : ""}
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;

    inviteTable.appendChild(row);
  });

  inviteTable.querySelectorAll(".invite-copy-btn").forEach(button => {
    button.addEventListener("click", () => {
      copiarCodigoConvite(button.dataset.code);
    });
  });

  inviteTable.querySelectorAll(".invite-edit-btn").forEach(button => {
    button.addEventListener("click", () => {
      abrirEditorConvite(button.dataset.code);
    });
  });

  inviteTable.querySelectorAll(".invite-delete-btn").forEach(button => {
    button.addEventListener("click", () => {
      pedirConfirmacaoExclusaoConvite(button.dataset.code);
    });
  });
}

async function carregarCodigosConvite({ force = false, silent = false } = {}) {
  if (inviteLoading) return;

  if (!force && inviteLoaded) {
    renderInviteCodes();
    return;
  }

  inviteLoading = true;
  inviteRefreshBtn.disabled = true;
  inviteRefreshBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> ATUALIZANDO';

  try {
    const result = await sheetsRequest(
      "adminInviteList",
      { token: getAdminToken() },
      { timeoutMs: 20000, retries: 1 }
    );

    inviteCodes = result.codes || [];
    inviteLoaded = true;
    saveInviteSnapshot();
    updateInviteSummary();
    renderInviteCodes();
  } catch (error) {
    console.error(error);

    if (isAuthError(error)) {
      clearAdminToken();
      window.location.href = "index.html";
      return;
    }

    const message = String(error?.message || "");

    if (!silent) {
      if (message.includes("UNKNOWN_ACTION")) {
        showAdminToast(
          "A gestão de códigos precisa do Code.gs V19 publicado no Apps Script.",
          true
        );
      } else {
        showAdminToast("Não foi possível carregar os códigos agora.", true);
      }
    }
  } finally {
    inviteLoading = false;
    inviteRefreshBtn.disabled = false;
    inviteRefreshBtn.innerHTML =
      '<i class="fa-solid fa-rotate"></i> ATUALIZAR';
  }
}

function trocarSecaoAdmin(section) {
  const invites = section === "invites";

  tabGuestsBtn.classList.toggle("active", !invites);
  tabInvitesBtn.classList.toggle("active", invites);
  guestPanel.classList.toggle("hidden", invites);
  invitePanel.classList.toggle("hidden", !invites);

  if (invites) {
    const hadCache = loadInviteSnapshot();

    if (hadCache) {
      carregarCodigosConvite({ force: true, silent: true }).catch(console.error);
    } else {
      carregarCodigosConvite().catch(console.error);
    }
  }
}

function abrirEditorConvite(code = "") {
  inviteEditingCode = String(code || "");
  const item = inviteCodes.find(entry => entry.code === inviteEditingCode);

  inviteEditor.classList.remove("hidden");

  if (item) {
    inviteEditorKicker.textContent = "EDITAR CONVITE";
    inviteEditorTitle.textContent = item.code;
    inviteCodeInput.value = item.code;
    inviteCodeInput.disabled = true;
    inviteCompanionsInput.value = Number(item.companions || 0);
    inviteNoteInput.value = item.note || "";
    inviteActiveInput.checked = Boolean(item.active);

    inviteCompanionsInput.disabled = Boolean(item.redeemed);
    inviteActiveInput.disabled = Boolean(item.redeemed);
    inviteSaveBtn.innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> SALVAR ALTERAÇÕES';
  } else {
    inviteEditingCode = "";
    pendingInviteCreateRequestId = "";
    inviteEditorKicker.textContent = "NOVO CONVITE";
    inviteEditorTitle.textContent = "CRIAR CÓDIGO";
    inviteCodeInput.value = "";
    inviteCodeInput.disabled = false;
    inviteCompanionsInput.value = 0;
    inviteCompanionsInput.disabled = false;
    inviteNoteInput.value = "";
    inviteActiveInput.checked = true;
    inviteActiveInput.disabled = false;
    inviteSaveBtn.innerHTML =
      '<i class="fa-solid fa-plus"></i> CRIAR CÓDIGO';
  }

  inviteEditor.scrollIntoView({ behavior: "smooth", block: "nearest" });

  setTimeout(() => {
    (item ? inviteNoteInput : inviteCodeInput).focus();
  }, 100);
}

function fecharEditorConvite() {
  inviteEditingCode = "";
  pendingInviteCreateRequestId = "";
  inviteEditor.classList.add("hidden");
  inviteCodeInput.disabled = false;
  inviteCompanionsInput.disabled = false;
  inviteActiveInput.disabled = false;
}

async function salvarCodigoConvite() {
  const companions = Number(inviteCompanionsInput.value);
  const note = String(inviteNoteInput.value || "").trim();
  const code = String(inviteCodeInput.value || "")
    .trim()
    .toUpperCase();

  if (!Number.isInteger(companions) || companions < 0 || companions > 9) {
    showAdminToast("Informe de 0 a 9 acompanhantes.", true);
    return;
  }

  inviteSaveBtn.disabled = true;
  const original = inviteSaveBtn.innerHTML;
  inviteSaveBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> SALVANDO';

  try {
    if (inviteEditingCode) {
      await sheetsRequest(
        "adminInviteUpdate",
        {
          token: getAdminToken(),
          code: inviteEditingCode,
          companions,
          active: inviteActiveInput.checked,
          note
        },
        // Escritas não são repetidas automaticamente para evitar ações duplicadas.
        { timeoutMs: 30000, retries: 0 }
      );

      showAdminToast(`Código ${inviteEditingCode} atualizado.`);
    } else {
      if (!pendingInviteCreateRequestId) {
        pendingInviteCreateRequestId =
          crypto.randomUUID?.() ||
          `invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      const requestId = pendingInviteCreateRequestId;

      const result = await sheetsRequest(
        "adminInviteCreate",
        {
          token: getAdminToken(),
          code,
          companions,
          note,
          requestId
        },
        // Apps Script pode terminar a gravação mesmo se o navegador perder
        // a resposta. Um timeout maior + requestId evita códigos duplicados.
        { timeoutMs: 30000, retries: 0 }
      );

      pendingInviteCreateRequestId = "";
      showAdminToast(`Código ${result.code} criado e pronto para envio.`);
    }

    fecharEditorConvite();
    inviteLoaded = false;

    // Atualizar a lista é uma leitura separada. Se ela falhar, não tratamos
    // o salvamento como falha: o código já foi persistido.
    try {
      await carregarCodigosConvite({ force: true, silent: true });
    } catch (_) {}
  } catch (error) {
    console.error(error);

    if (isAuthError(error)) {
      clearAdminToken();
      window.location.href = "index.html";
      return;
    }

    const message = String(error?.message || "");

    if (message.includes("INVITE_CODE_ALREADY_EXISTS")) {
      pendingInviteCreateRequestId = "";
      showAdminToast("Esse código já existe.", true);
    } else if (message.includes("INVITE_CODE_REDEEMED_LOCKED")) {
      showAdminToast(
        "A quantidade de acompanhantes não pode mudar após o resgate.",
        true
      );
    } else if (message.includes("UNKNOWN_ACTION")) {
      showAdminToast(
        "Publique o Code.gs V19.2 no Apps Script antes de usar esta função.",
        true
      );
    } else if (
      message.includes("REQUEST_TIMEOUT") ||
      message.includes("NETWORK_ERROR")
    ) {
      // Mantemos o mesmo requestId. Se a gravação já ocorreu no servidor,
      // clicar novamente apenas devolve o mesmo código em vez de criar outro.
      showAdminToast(
        "O servidor demorou para responder. Clique em CRIAR CÓDIGO novamente; não será duplicado.",
        true
      );
    } else {
      showAdminToast("Não foi possível salvar o código.", true);
    }
  } finally {
    inviteSaveBtn.disabled = false;
    inviteSaveBtn.innerHTML = original;
  }
}

async function copiarCodigoConvite(code) {
  const value = String(code || "");

  try {
    await navigator.clipboard.writeText(value);
  } catch (_) {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  showAdminToast(`Código ${value} copiado.`);
}


// ============================================================
// CSV
// ============================================================

function csvCell(value) {
  let text = String(value ?? "");

  // Evita que Excel/Sheets interprete campos do convidado como fórmulas.
  if (/^[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const rows = [[
    "Nome",
    "CPF completo",
    "Código do convite resgatado",
    "Acompanhantes",
    "Total de pessoas",
    "Código do ingresso",
    "Número",
    "Status",
    "Check-in em",
    "Cadastro em"
  ]];

  inscricoes.forEach(item => {
    const tickets = normalizeTickets(item);
    const acompanhantes = Number(item.acompanhantes || Math.max(0, tickets.length - 1));

    tickets.forEach(ticket => {
      rows.push([
        item.nome,
        formatCpf(item),
        item.inviteCode || "",
        acompanhantes,
        tickets.length,
        ticket.codigo,
        ticket.numero,
        ticket.presente ? "Presente" : "Pendente",
        ticket.checkInEm ? formatDate(ticket.checkInEm) : "",
        formatDate(item.criadoEm)
      ]);
    });
  });

  const csv = "\uFEFF" + rows
    .map(row => row.map(csvCell).join(";"))
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `convidados-noite-no-cinema-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  showAdminToast("Lista exportada em CSV.");
}

// ============================================================
// Eventos
// ============================================================

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
exportCsvBtn.addEventListener("click", exportCsv);

tabGuestsBtn.addEventListener("click", () => trocarSecaoAdmin("guests"));
tabInvitesBtn.addEventListener("click", () => trocarSecaoAdmin("invites"));

newInviteBtn.addEventListener("click", () => abrirEditorConvite());
inviteEditorClose.addEventListener("click", fecharEditorConvite);
inviteCancelBtn.addEventListener("click", fecharEditorConvite);
inviteSaveBtn.addEventListener("click", salvarCodigoConvite);
inviteSearchInput.addEventListener("input", renderInviteCodes);
inviteRefreshBtn.addEventListener("click", () => {
  inviteLoaded = false;
  carregarCodigosConvite({ force: true }).catch(console.error);
});

inviteCodeInput.addEventListener("input", () => {
  inviteCodeInput.value = inviteCodeInput.value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
});

logoutBtn.addEventListener("click", () => {
  clearAdminToken();
  sessionStorage.removeItem("cinemaAdmin");
  localStorage.removeItem(ADMIN_SNAPSHOT_KEY);
  localStorage.removeItem(INVITE_SNAPSHOT_KEY);
  window.location.href = "index.html";
});

ticketAdminClose.addEventListener("click", fecharIngressoAdmin);
ticketAdminModal.addEventListener("click", event => {
  if (event.target === ticketAdminModal) {
    fecharIngressoAdmin();
  }
});

ticketAdminDownload.addEventListener("click", baixarIngressoAdmin);
ticketAdminPrint.addEventListener("click", imprimirIngressoAdmin);

adminConfirmCancel.addEventListener("click", fecharConfirmacaoExclusao);
adminConfirmDelete.addEventListener("click", confirmarExclusao);
adminConfirmModal.addEventListener("click", event => {
  if (event.target === adminConfirmModal) {
    fecharConfirmacaoExclusao();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    fecharIngressoAdmin();
    fecharConfirmacaoExclusao();
    fecharEditorConvite();
  }
});

window.addEventListener("offline", () => {
  showAdminToast("Você ficou sem internet. Evite fazer check-in até a conexão voltar.", true);
});

window.addEventListener("online", () => {
  showAdminToast("Conexão restabelecida.");
  if (sheetsConfigurado()) {
    carregarRemoto({ silent: true }).catch(console.error);
  }
});

// ============================================================
// Inicialização
// ============================================================

async function iniciarAdmin() {
  if (sheetsConfigurado()) {
    const hasSnapshot = loadAdminSnapshot();

    // Se já existe uma cópia recente, o painel aparece imediatamente.
    // A atualização real acontece em seguida, sem bloquear a interface.
    if (hasSnapshot) {
      carregarRemoto({ silent: true }).catch(console.error);
    } else {
      await carregarRemoto();
    }

    refreshTimer = setInterval(() => {
      carregarRemoto({ silent: true }).catch(console.error);
    }, 20000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        carregarRemoto({ silent: true }).catch(console.error);
      }
    });

    return;
  }

  carregarLocal();
}

iniciarAdmin();