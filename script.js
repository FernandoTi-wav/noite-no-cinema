const CONFIG = {
  whatsappNumber: "5585981131932",
  whatsappMessage: "Olá! Gostaria de falar sobre a festa Noite no Cinema - Claurea 60 anos.",
  adminPassword: "cinema60",
  ticketBase: "assets/ticket-print-base.png",
  ticketPrefix: "CINEMA60",

  // Limite provisório para os testes locais.
  // Quando o Google Apps Script estiver configurado, o limite será controlado pela planilha.
  capacidadeEvento: 150
};

const $ = selector => document.querySelector(selector);

const cinemaIntro = $("#cinemaIntro");
const ticketForm = $("#ticketForm");
const inviteCodeInput = $("#inviteCode");
const validateInviteButton = $("#validateInviteButton");
const inviteValidationStatus = $("#inviteValidationStatus");
const peopleStep = $("#peopleStep");
const inviteReleaseSummary = $("#inviteReleaseSummary");
const attendeeFields = $("#attendeeFields");
const ticketPlaceholder = $("#ticketPlaceholder");
const ticketResults = $("#ticketResults");
const generateButton = $("#generateButton");
const toast = $("#toast");
const successModal = $("#successModal");
const successTitle = $("#successTitle");
const successText = $("#successText");
const successCounter = $("#successCounter");
const successKicker = $("#successKicker");

const adminButton = $("#adminButton");
const adminModal = $("#adminModal");
const closeAdmin = $("#closeAdmin");
const loginAdmin = $("#loginAdmin");
const adminPassword = $("#adminPassword");

const contactButton = $("#contactButton");
const whatsappFloating = $("#whatsappFloating");

let ticketBaseImage = null;
let cadastroEmAndamento = false;
let validatedInvite = null;

function sheetsConfigurado() {
  const url = String(window.APP_CONFIG?.webAppUrl || '').trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/.test(url);
}

function getWebAppUrl() {
  return String(window.APP_CONFIG?.webAppUrl || '').trim();
}

function getClientId() {
  const key = "cinemaAdminClientId";
  let value = localStorage.getItem(key);

  if (!value) {
    value =
      crypto.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(key, value);
  }

  return value;
}

function getStoredAdminToken() {
  return (
    sessionStorage.getItem("cinemaAdminToken") ||
    localStorage.getItem("cinemaAdminToken") ||
    ""
  );
}

function saveAdminToken(token) {
  sessionStorage.setItem("cinemaAdminToken", token);
  localStorage.setItem("cinemaAdminToken", token);
}

function clearAdminToken() {
  sessionStorage.removeItem("cinemaAdminToken");
  localStorage.removeItem("cinemaAdminToken");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sheetsRequest(action, payload = {}, options = {}) {
  if (!sheetsConfigurado()) {
    throw new Error("SHEETS_NOT_CONFIGURED");
  }

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

let adminWarmupPromise = null;

function warmAdminBackend() {
  if (!sheetsConfigurado() || !navigator.onLine) return Promise.resolve();

  if (!adminWarmupPromise) {
    adminWarmupPromise = sheetsRequest(
      "health",
      {},
      { timeoutMs: 7000, retries: 0 }
    )
      .catch(() => null)
      .finally(() => {
        setTimeout(() => {
          adminWarmupPromise = null;
        }, 8000);
      });
  }

  return adminWarmupPromise;
}

function recentRegistrationKey(inviteCode) {
  return `cinemaRecentInvite:${String(inviteCode || "")
    .trim()
    .toUpperCase()}`;
}

function saveRecentRegistration(inviteCode, inscricao) {
  try {
    const safeCopy = {
      inviteCode: inscricao.inviteCode,
      acompanhantes: inscricao.acompanhantes,
      quantidade: inscricao.quantidade,
      tickets: inscricao.tickets || [],
      criadoEm: inscricao.criadoEm
    };

    localStorage.setItem(
      recentRegistrationKey(inviteCode),
      JSON.stringify(safeCopy)
    );
  } catch (_) {}
}

function getRecentRegistration(inviteCode) {
  try {
    return JSON.parse(
      localStorage.getItem(recentRegistrationKey(inviteCode)) || "null"
    );
  } catch (_) {
    return null;
  }
}

function friendlySheetsError(error) {
  const message = String(error?.message || error || '');

  if (message.includes('CPF_ALREADY_REGISTERED')) return 'Este CPF já possui cadastro para o evento.';
  if (message.includes('CAPACITY_EXCEEDED')) return 'Os ingressos disponíveis para o evento se esgotaram.';
  if (message.includes('REGISTRATION_CLOSED')) return 'As inscrições estão encerradas no momento.';
  if (message.includes('INVALID_CPF')) return 'O CPF informado não é válido.';
  if (message.includes('INVALID_NAME')) return 'Confira o nome completo informado.';
  if (message.includes('INVITE_CODE_REQUIRED')) return 'Informe o código do convite recebido.';
  if (message.includes('INVITE_CODE_NOT_FOUND')) return 'Este código de convite não foi encontrado.';
  if (message.includes('INVITE_CODE_INACTIVE')) return 'Este código de convite está desativado.';
  if (message.includes('INVITE_CODE_ALREADY_REDEEMED')) return 'Este código de convite já foi resgatado.';
  if (message.includes('INVITE_CODE_DUPLICATED_CONFIG')) return 'Este código está duplicado na planilha. Avise a organização do evento.';
  if (message.includes('INVITE_CODE_INVALID_COMPANIONS')) return 'Este convite está com a quantidade de acompanhantes configurada incorretamente.';
  if (message.includes('ATTENDEE_COUNT_MISMATCH')) return 'A quantidade de pessoas informadas não corresponde ao convite.';
  if (message.includes('CPF_DUPLICATED_IN_INVITE')) return 'O mesmo CPF foi informado para mais de uma pessoa neste convite.';
  if (message.includes('INVALID_QUANTITY')) return 'A quantidade liberada para este convite não é válida.';
  if (message.includes('RUN_SETUP_FIRST')) return 'O sistema ainda não foi preparado corretamente.';
  if (message.includes('NETWORK_OFFLINE')) return 'Você está sem internet. Reconecte e tente novamente.';
  if (message.includes('NETWORK_ERROR')) return 'Não foi possível acessar o servidor. Verifique sua conexão.';
  if (message.includes('REQUEST_TIMEOUT')) return 'A conexão demorou demais. Aguarde alguns segundos e tente novamente.';
  if (message.includes('INVALID_APPS_SCRIPT_RESPONSE')) return 'O servidor respondeu de forma inesperada. Tente novamente.';

  return 'Não foi possível concluir o cadastro agora. Tente novamente em alguns instantes.';
}


// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------
window.addEventListener("load", async () => {
  try {
    ticketBaseImage = await loadImage(CONFIG.ticketBase);
  } catch (error) {
    console.error("Não foi possível carregar a arte do ingresso.", error);
  }

  setTimeout(() => {
    cinemaIntro.classList.add("finished");
    document.body.classList.add("loaded");
  }, 2550);
});

if (document.fonts?.ready) {
  document.fonts.ready.catch(() => {});
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// ------------------------------------------------------------
// Partículas
// ------------------------------------------------------------
function criarParticulas() {
  const container = $("#particles");

  for (let i = 0; i < 28; i++) {
    const particle = document.createElement("span");
    particle.className = "particle";

    const size = Math.random() * 2.3 + 1;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${Math.random() * 8 + 7}s`;
    particle.style.animationDelay = `${Math.random() * 8}s`;

    container.appendChild(particle);
  }
}
criarParticulas();

// ------------------------------------------------------------
// Reveal no scroll
// ------------------------------------------------------------
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll(".reveal-section").forEach(element => observer.observe(element));

// ------------------------------------------------------------
// CPF / código do convite
// ------------------------------------------------------------
function formatarCpfInput(input) {
  let value = input.value.replace(/\D/g, "").substring(0, 11);

  if (value.length > 9) {
    value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
  } else if (value.length > 6) {
    value = value.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
  } else if (value.length > 3) {
    value = value.replace(/^(\d{3})(\d+)/, "$1.$2");
  }

  input.value = value;
}

document.addEventListener("input", event => {
  const target = event.target;

  if (target?.classList?.contains("attendee-cpf")) {
    formatarCpfInput(target);
  }
});

inviteCodeInput.addEventListener("input", function () {
  this.value = this.value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 40);

  if (
    validatedInvite &&
    this.value.trim().toUpperCase() !== validatedInvite.code
  ) {
    resetInviteValidation(false);
  }
});

function cpfSomenteNumeros(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

function cpfValido(cpf) {
  const value = cpfSomenteNumeros(cpf);

  if (value.length !== 11 || /^(\d)\1{10}$/.test(value)) {
    return false;
  }

  const calcularDigito = base => {
    let soma = 0;
    let peso = base.length + 1;

    for (const numero of base) {
      soma += Number(numero) * peso;
      peso--;
    }

    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const primeiro = calcularDigito(value.slice(0, 9));
  const segundo = calcularDigito(value.slice(0, 9) + primeiro);

  return value.endsWith(`${primeiro}${segundo}`);
}


function nomeValido(nome) {
  const value = String(nome || "").trim();

  return (
    value.length >= 3 &&
    value.length <= 120 &&
    /^[A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]+$/.test(value)
  );
}

function totalIngressosEmitidos(inscricoes = getInscricoes()) {
  return inscricoes.reduce((total, inscricao) => {
    if (Array.isArray(inscricao.tickets) && inscricao.tickets.length) {
      return total + inscricao.tickets.length;
    }

    return total + Number(inscricao.quantidade || 0);
  }, 0);
}

// ------------------------------------------------------------
// LocalStorage temporário
// ------------------------------------------------------------
function getInscricoes() {
  return JSON.parse(localStorage.getItem("cinemaInscricoes")) || [];
}

function saveInscricoes(inscricoes) {
  localStorage.setItem("cinemaInscricoes", JSON.stringify(inscricoes));
}

function getNextTicketNumber(inscricoes) {
  const numeros = [];

  inscricoes.forEach(inscricao => {
    if (Array.isArray(inscricao.tickets)) {
      inscricao.tickets.forEach(ticket => {
        const n = Number(ticket.numero);
        if (Number.isFinite(n)) numeros.push(n);
      });
    } else if (inscricao.codigo) {
      const match = String(inscricao.codigo).match(/(\d{4,})$/);
      if (match) numeros.push(Number(match[1]));
    }
  });

  return (numeros.length ? Math.max(...numeros) : 0) + 1;
}

function criarTickets(quantidade, inscricoes) {
  let next = getNextTicketNumber(inscricoes);
  const tickets = [];

  for (let i = 0; i < quantidade; i++) {
    const numero = String(next).padStart(4, "0");

    tickets.push({
      numero,
      codigo: `${CONFIG.ticketPrefix}-${numero}`,
      presente: false,
      checkInEm: null
    });

    next++;
  }

  return tickets;
}

// ------------------------------------------------------------
// Geração gráfica
// ------------------------------------------------------------
async function criarImagemIngresso(ticket, index, total) {
  if (!ticketBaseImage) {
    ticketBaseImage = await loadImage(CONFIG.ticketBase);
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = ticketBaseImage.naturalWidth;
  canvas.height = ticketBaseImage.naturalHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(ticketBaseImage, 0, 0);

  // Painel dinâmico do canhoto.
  // O template deixa esta área limpa para o navegador desenhar os
  // dados exclusivos de cada ingresso.

  ctx.save();

  // Divisor decorativo
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

  // Nº + numeração
  ctx.textAlign = "left";
  ctx.fillStyle = "#11100e";
  ctx.font = '44px "Bebas Neue", sans-serif';
  ctx.fillText("Nº", 1525, 245);

  ctx.textAlign = "center";
  ctx.fillStyle = "#8f1718";
  ctx.font = '66px "Bebas Neue", sans-serif';
  ctx.fillText(ticket.numero, 1720, 240);

  // Linha
  ctx.strokeStyle = "rgba(25,18,8,.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1520, 285);
  ctx.lineTo(1840, 285);
  ctx.stroke();

  // Código
  ctx.textAlign = "center";
  ctx.fillStyle = "#15110a";
  ctx.font = '28px "Bebas Neue", sans-serif';
  ctx.fillText("CÓDIGO ÚNICO", 1680, 325);

  ctx.font = '37px "Bebas Neue", sans-serif';
  ctx.fillText(ticket.codigo, 1680, 362);

  // Código de barras CODE128 real
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

async function renderizarIngressos(inscricao) {
  ticketResults.innerHTML = "";
  ticketPlaceholder.classList.add("hidden");
  ticketResults.classList.remove("hidden");

  const header = document.createElement("div");
  header.className = "result-header";
  header.innerHTML = `
    <div>
      <small>INGRESSOS GERADOS</small>
      <h3>${inscricao.tickets.length === 1 ? "SEU INGRESSO ESTÁ PRONTO" : `${inscricao.tickets.length} INGRESSOS ESTÃO PRONTOS`}</h3>
    </div>
    <button type="button" id="backToForm"><i class="fa-solid fa-rotate-left"></i> NOVO CADASTRO</button>
  `;
  ticketResults.appendChild(header);

  for (let i = 0; i < inscricao.tickets.length; i++) {
    const ticket = inscricao.tickets[i];
    const dataUrl = await criarImagemIngresso(ticket, i, inscricao.tickets.length);

    const card = document.createElement("article");
    card.className = "generated-card";

    const img = document.createElement("img");
    img.className = "generated-ticket-image";
    img.src = dataUrl;
    img.alt = `Ingresso ${ticket.codigo}`;
    img.title = "Clique para abrir o ingresso em tamanho maior";
    img.addEventListener("click", () => abrirImagem(dataUrl));

    const meta = document.createElement("div");
    meta.className = "generated-meta";
    meta.innerHTML = `
      <div>
        <small>INGRESSO ${i + 1} DE ${inscricao.tickets.length}</small>
        <strong>${ticket.codigo}</strong>
      </div>
      <div class="ticket-actions">
        <button type="button" class="ticket-action download">
          <i class="fa-solid fa-download"></i> BAIXAR PNG
        </button>
        <button type="button" class="ticket-action print">
          <i class="fa-solid fa-print"></i> IMPRIMIR
        </button>
      </div>
    `;

    meta.querySelector(".download").addEventListener("click", () => baixarIngresso(dataUrl, ticket.codigo));
    meta.querySelector(".print").addEventListener("click", () => imprimirIngresso(dataUrl, ticket.codigo));

    card.appendChild(img);
    card.appendChild(meta);
    ticketResults.appendChild(card);
  }

  $("#backToForm").addEventListener("click", () => {
    ticketResults.classList.add("hidden");
    ticketResults.innerHTML = "";
    ticketPlaceholder.classList.remove("hidden");
    resetInviteValidation(true);
    inviteCodeInput.focus();
  });

  ticketResults.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function baixarIngresso(dataUrl, codigo) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `ingresso-${codigo}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function imprimirIngresso(dataUrl, codigo) {
  const printWindow = window.open("", "_blank", "width=1200,height=800");

  if (!printWindow) {
    mostrarToast("O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.", true);
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>${codigo}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: white; }
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8mm;
        }
        img {
          width: 100%;
          max-width: 270mm;
          height: auto;
          display: block;
          object-fit: contain;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <img src="${dataUrl}" alt="${codigo}">
      <script>
        const img = document.querySelector("img");
        img.onload = () => {
          setTimeout(() => {
            window.focus();
            window.print();
          }, 250);
        };
      <\/script>
    </body>
    </html>
  `);

  printWindow.document.close();
}

function abrirImagem(dataUrl) {
  const viewer = window.open("", "_blank");
  if (!viewer) return;

  viewer.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Ingresso Noite no Cinema</title>
        <style>
          html,body{margin:0;min-height:100%;background:#050403;display:grid;place-items:center}
          img{max-width:98vw;max-height:96vh}
        </style>
      </head>
      <body><img src="${dataUrl}"></body>
    </html>
  `);
  viewer.document.close();
}


function attendeeLabel(index) {
  return index === 0 ? "CONVIDADO PRINCIPAL" : `ACOMPANHANTE ${index}`;
}

function renderAttendeeFields(quantity) {
  attendeeFields.innerHTML = "";

  for (let index = 0; index < quantity; index++) {
    const card = document.createElement("section");
    card.className = "attendee-card";
    card.dataset.attendee = String(index);

    card.innerHTML = `
      <div class="attendee-card-heading">
        <span class="attendee-order">${index + 1}</span>
        <div>
          <small>${index === 0 ? "TITULAR DO CONVITE" : "ACOMPANHANTE"}</small>
          <strong>${attendeeLabel(index)}</strong>
        </div>
      </div>

      <label class="field">
        <span>NOME COMPLETO</span>
        <div class="field-control">
          <i class="fa-regular fa-user"></i>
          <input
            class="attendee-name"
            type="text"
            autocomplete="name"
            maxlength="120"
            placeholder="Digite o nome completo"
            required
          >
        </div>
      </label>

      <label class="field">
        <span>CPF</span>
        <div class="field-control">
          <i class="fa-regular fa-id-card"></i>
          <input
            class="attendee-cpf"
            type="text"
            inputmode="numeric"
            maxlength="14"
            placeholder="000.000.000-00"
            required
          >
        </div>
      </label>
    `;

    attendeeFields.appendChild(card);
  }
}

function collectAttendees() {
  return [...attendeeFields.querySelectorAll(".attendee-card")].map(card => ({
    name: card.querySelector(".attendee-name").value.trim(),
    cpf: cpfSomenteNumeros(card.querySelector(".attendee-cpf").value)
  }));
}

function resetInviteValidation(clearCode = true) {
  validatedInvite = null;
  peopleStep.classList.add("hidden");
  inviteValidationStatus.classList.add("hidden");
  inviteValidationStatus.innerHTML = "";
  attendeeFields.innerHTML = "";
  inviteReleaseSummary.innerHTML = "";

  inviteCodeInput.disabled = false;
  validateInviteButton.disabled = false;
  validateInviteButton.classList.remove("validated");
  validateInviteButton.innerHTML =
    '<i class="fa-solid fa-ticket"></i><span>VALIDAR CONVITE</span>';

  if (clearCode) {
    inviteCodeInput.value = "";
  }
}

async function validarCodigoConvite() {
  const inviteCode = inviteCodeInput.value.trim().toUpperCase();

  if (!inviteCode) {
    mostrarToast("Digite o código do convite recebido.", true);
    inviteCodeInput.focus();
    return;
  }

  if (!sheetsConfigurado()) {
    mostrarToast("O sistema de convites não está conectado ao servidor.", true);
    return;
  }

  if (validatedInvite?.code === inviteCode) {
    resetInviteValidation(false);
    inviteCodeInput.focus();
    return;
  }

  validateInviteButton.disabled = true;
  const original = validateInviteButton.innerHTML;
  validateInviteButton.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i><span>VALIDANDO...</span>';

  try {
    const result = await sheetsRequest(
      "validateInvite",
      { inviteCode },
      { timeoutMs: 18000, retries: 1 }
    );

    validatedInvite = {
      code: result.invite.code,
      companions: Number(result.invite.companions || 0),
      quantity: Number(result.invite.quantity || 1)
    };

    inviteCodeInput.value = validatedInvite.code;
    inviteCodeInput.disabled = true;

    inviteValidationStatus.classList.remove("hidden");
    inviteValidationStatus.innerHTML = `
      <i class="fa-solid fa-circle-check"></i>
      <div>
        <strong>CONVITE VÁLIDO</strong>
        <span>${validatedInvite.quantity} ${validatedInvite.quantity === 1 ? "pessoa liberada" : "pessoas liberadas"}</span>
      </div>
    `;

    inviteReleaseSummary.innerHTML = validatedInvite.companions > 0
      ? `Este código libera <strong>1 convidado principal + ${validatedInvite.companions} ${validatedInvite.companions === 1 ? "acompanhante" : "acompanhantes"}</strong>. Preencha os dados de todas as pessoas abaixo.`
      : "Este código libera <strong>somente o convidado principal</strong>.";

    renderAttendeeFields(validatedInvite.quantity);
    peopleStep.classList.remove("hidden");

    validateInviteButton.classList.add("validated");
    validateInviteButton.innerHTML =
      '<i class="fa-solid fa-pen"></i><span>TROCAR CÓDIGO</span>';
    validateInviteButton.disabled = false;

    setTimeout(() => {
      attendeeFields.querySelector(".attendee-name")?.focus();
    }, 120);

    peopleStep.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    validatedInvite = null;
    mostrarToast(friendlySheetsError(error), true);
    validateInviteButton.disabled = false;
    validateInviteButton.innerHTML = original;
  }
}

validateInviteButton.addEventListener("click", validarCodigoConvite);

function pluralizarIngresso(qtd) {
  return `${qtd} ${qtd === 1 ? "ingresso confirmado" : "ingressos confirmados"}`;
}

function mostrarPopupCadastro({
  kicker = "CADASTRO CONCLUÍDO",
  title = "TUDO CERTO!",
  text = "Seu cadastro foi realizado com sucesso. Estamos preparando seu ingresso.",
  quantidade = 1
} = {}) {
  successKicker.textContent = kicker;
  successTitle.textContent = title;
  successText.textContent = text;
  successCounter.textContent = pluralizarIngresso(quantidade);

  const loader = successModal.querySelector(".success-loader span");
  loader.style.animation = "none";
  loader.offsetHeight;
  loader.style.animation = "";

  successModal.classList.add("active");
  successModal.setAttribute("aria-hidden", "false");

  return new Promise(resolve => {
    setTimeout(() => {
      successModal.classList.remove("active");
      successModal.setAttribute("aria-hidden", "true");
      setTimeout(resolve, 260);
    }, 2050);
  });
}

// ------------------------------------------------------------
// Submit
// ------------------------------------------------------------
ticketForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (cadastroEmAndamento) {
    return;
  }

  if (!validatedInvite) {
    mostrarToast("Valide primeiro o código do convite.", true);
    inviteCodeInput.focus();
    return;
  }

  const attendees = collectAttendees();

  if (attendees.length !== validatedInvite.quantity) {
    mostrarToast("A quantidade de pessoas não corresponde ao convite.", true);
    return;
  }

  const invalidIndex = attendees.findIndex(
    person => !nomeValido(person.name) || !cpfValido(person.cpf)
  );

  if (invalidIndex >= 0) {
    const card = attendeeFields.querySelectorAll(".attendee-card")[invalidIndex];
    mostrarToast(
      `Confira o nome e o CPF de ${attendeeLabel(invalidIndex).toLowerCase()}.`,
      true
    );
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const uniqueCpfs = new Set(attendees.map(person => person.cpf));

  if (uniqueCpfs.size !== attendees.length) {
    mostrarToast("Cada pessoa deve informar um CPF diferente.", true);
    return;
  }

  if (typeof JsBarcode === "undefined") {
    mostrarToast(
      "Não foi possível carregar o gerador de código de barras. Verifique sua internet.",
      true
    );
    return;
  }

  const inviteCode = validatedInvite.code;
  const buttonContent = generateButton.querySelector(".button-content");
  const originalButton = buttonContent.innerHTML;

  cadastroEmAndamento = true;
  generateButton.disabled = true;
  buttonContent.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> FINALIZANDO CADASTRO';

  try {
    if (!sheetsConfigurado()) {
      mostrarToast(
        "O sistema de códigos de convite precisa estar conectado ao Google Sheets.",
        true
      );
      return;
    }

    try {
      const result = await sheetsRequest(
        "register",
        {
          inviteCode,
          attendees
        },
        { timeoutMs: 30000, retries: 0 }
      );

      const inscricao = result.registration;
      const quantidade = Number(
        inscricao.quantidade ||
        inscricao.tickets?.length ||
        attendees.length
      );

      saveRecentRegistration(inviteCode, inscricao);

      await mostrarPopupCadastro({
        kicker: "CREDENCIAMENTO CONCLUÍDO",
        title: "TUDO CERTO!",
        text: quantidade === 1
          ? "Os dados do convidado foram confirmados. Agora vamos exibir o ingresso VIP."
          : `Os dados das ${quantidade} pessoas foram confirmados. Agora vamos exibir os ingressos VIP.`,
        quantidade
      });

      await renderizarIngressos(inscricao);
      mostrarToast(
        quantidade === 1
          ? "Convite resgatado e ingresso emitido!"
          : `Convite resgatado e ${quantidade} ingressos emitidos!`
      );
      return;
    } catch (error) {
      const message = String(error?.message || "");

      if (message.includes("INVITE_CODE_ALREADY_REDEEMED")) {
        const recente = getRecentRegistration(inviteCode);

        if (recente?.tickets?.length) {
          await mostrarPopupCadastro({
            kicker: "INGRESSOS LOCALIZADOS",
            title: "JÁ ESTÁ TUDO CERTO!",
            text: "Este navegador possui uma cópia dos ingressos emitidos anteriormente para este convite.",
            quantidade: recente.tickets.length
          });

          await renderizarIngressos(recente);
          return;
        }
      }

      mostrarToast(friendlySheetsError(error), true);
      return;
    }
  } catch (error) {
    console.error(error);
    mostrarToast("Não foi possível concluir o cadastro. Tente novamente.", true);
  } finally {
    cadastroEmAndamento = false;
    generateButton.disabled = false;
    buttonContent.innerHTML = originalButton;
  }
});

// ------------------------------------------------------------
// WhatsApp
// ------------------------------------------------------------
function abrirWhatsApp() {
  const numero = CONFIG.whatsappNumber.replace(/\D/g, "");
  const mensagem = encodeURIComponent(CONFIG.whatsappMessage);
  window.open(`https://wa.me/${numero}?text=${mensagem}`, "_blank", "noopener,noreferrer");
}
contactButton.addEventListener("click", abrirWhatsApp);
whatsappFloating.addEventListener("click", abrirWhatsApp);

// ------------------------------------------------------------
// Admin
// ------------------------------------------------------------
adminButton.addEventListener("click", () => {
  const existingToken = getStoredAdminToken();

  if (existingToken) {
    sessionStorage.setItem("cinemaAdminToken", existingToken);
    window.location.href = "admin.html";
    return;
  }

  adminModal.classList.add("active");
  warmAdminBackend();
  setTimeout(() => adminPassword.focus(), 180);
});

function fecharAdmin() {
  adminModal.classList.remove("active");
}
closeAdmin.addEventListener("click", fecharAdmin);
adminModal.addEventListener("click", event => {
  if (event.target === adminModal) fecharAdmin();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") fecharAdmin();
});

async function verificarAdmin() {
  const password = adminPassword.value;

  if (!password) {
    adminPassword.focus();
    return;
  }

  loginAdmin.disabled = true;
  const originalLoginHtml = loginAdmin.innerHTML;
  loginAdmin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ACESSANDO...';

  try {
    if (sheetsConfigurado()) {
      await warmAdminBackend();

      const result = await sheetsRequest(
        "adminLogin",
        { password, clientId: getClientId() },
        { timeoutMs: 12000, retries: 1 }
      );

      saveAdminToken(result.token);
      window.location.href = "admin.html";
      return;
    }

    // Fallback apenas para testes locais.
    if (password === CONFIG.adminPassword) {
      sessionStorage.setItem("cinemaAdmin", "ok");
      window.location.href = "admin.html";
      return;
    }

    throw new Error("INVALID_ADMIN_PASSWORD");
  } catch (error) {
    const message = String(error?.message || "");
    adminPassword.parentElement.style.borderColor = "#a92325";

    if (message.includes("ADMIN_LOGIN_BLOCKED")) {
      adminPassword.value = "";
      adminPassword.placeholder = "Aguarde alguns minutos";
      mostrarToast("Muitas tentativas incorretas. Aguarde 10 minutos antes de tentar novamente.", true);
    } else if (
      message.includes("NETWORK_OFFLINE") ||
      message.includes("NETWORK_ERROR") ||
      message.includes("REQUEST_TIMEOUT")
    ) {
      adminPassword.placeholder = "Tente novamente";
      mostrarToast("O servidor demorou para responder. Tente novamente — a senha foi mantida.", true);
    } else {
      adminPassword.value = "";
      adminPassword.placeholder = "Senha incorreta";
    }

    setTimeout(() => {
      adminPassword.placeholder = "Senha";
      adminPassword.parentElement.style.borderColor = "";
    }, 2200);
  } finally {
    loginAdmin.disabled = false;
    loginAdmin.innerHTML = originalLoginHtml;
  }
}

loginAdmin.addEventListener("click", verificarAdmin);
adminPassword.addEventListener("keydown", event => {
  if (event.key === "Enter") verificarAdmin();
});

window.addEventListener("offline", () => {
  mostrarToast("Você ficou sem internet. O cadastro não será enviado até a conexão voltar.", true);
});

window.addEventListener("online", () => {
  mostrarToast("Conexão restabelecida.");
});

// ------------------------------------------------------------
// Toast
// ------------------------------------------------------------
let toastTimer;
function mostrarToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
