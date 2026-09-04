const CONFIG = {
  whatsappNumber: "5585999999999",
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
const nomeInput = $("#nome");
const cpfInput = $("#cpf");
const quantidadeInput = $("#quantidade");
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

async function sheetsRequest(action, payload = {}) {
  if (!sheetsConfigurado()) {
    throw new Error("SHEETS_NOT_CONFIGURED");
  }

  if (!navigator.onLine) {
    throw new Error("NETWORK_OFFLINE");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch(getWebAppUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      redirect: "follow",
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
    if (error?.name === "AbortError") {
      throw new Error("REQUEST_TIMEOUT");
    }

    if (error instanceof TypeError) {
      throw new Error("NETWORK_ERROR");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function recentRegistrationKey(cpf) {
  return `cinemaRecentRegistration:${cpfSomenteNumeros(cpf)}`;
}

function saveRecentRegistration(cpf, inscricao) {
  try {
    localStorage.setItem(recentRegistrationKey(cpf), JSON.stringify(inscricao));
  } catch (_) {}
}

function getRecentRegistration(cpf) {
  try {
    return JSON.parse(localStorage.getItem(recentRegistrationKey(cpf)));
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
  if (message.includes('INVALID_QUANTITY')) return 'A quantidade selecionada não é válida.';
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
// CPF
// ------------------------------------------------------------
cpfInput.addEventListener("input", function () {
  let value = this.value.replace(/\D/g, "").substring(0, 11);

  if (value.length > 9) {
    value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
  } else if (value.length > 6) {
    value = value.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
  } else if (value.length > 3) {
    value = value.replace(/^(\d{3})(\d+)/, "$1.$2");
  }

  this.value = value;
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
    <button type="button" id="backToForm"><i class="fa-solid fa-pen"></i> ALTERAR DADOS</button>
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
    nomeInput.focus();
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

  const nome = nomeInput.value.trim();
  const cpf = cpfSomenteNumeros(cpfInput.value);
  const quantidade = Number(quantidadeInput.value);

  if (!nomeValido(nome) || !cpfValido(cpf) || !quantidade) {
    mostrarToast("Confira o nome, informe um CPF válido e selecione a quantidade de ingressos.", true);
    return;
  }

  if (typeof JsBarcode === "undefined") {
    mostrarToast("Não foi possível carregar o gerador de código de barras. Verifique sua internet.", true);
    return;
  }

  const buttonContent = generateButton.querySelector(".button-content");
  const originalButton = buttonContent.innerHTML;
  cadastroEmAndamento = true;
  generateButton.disabled = true;
  buttonContent.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> FINALIZANDO CADASTRO';

  try {
    // ======================================================
    // GOOGLE SHEETS + APPS SCRIPT
    // ======================================================
    if (sheetsConfigurado()) {
      try {
        const result = await sheetsRequest('register', {
          name: nome,
          cpf,
          quantity: quantidade
        });

        const inscricao = result.registration;
        saveRecentRegistration(cpf, inscricao);

        await mostrarPopupCadastro({
          kicker: "CADASTRO CONCLUÍDO",
          title: "TUDO CERTO!",
          text: quantidade === 1
            ? "Seu cadastro foi confirmado e salvo na lista. Agora vamos exibir o seu ingresso VIP."
            : "Seu cadastro foi confirmado e salvo na lista. Agora vamos exibir os seus ingressos VIP.",
          quantidade
        });

        await renderizarIngressos(inscricao);
        mostrarToast(quantidade === 1 ? "Cadastro salvo e ingresso emitido!" : `Cadastro salvo e ${quantidade} ingressos emitidos!`);
        return;
      } catch (error) {
        const message = String(error?.message || '');

        if (message.includes('CPF_ALREADY_REGISTERED')) {
          const recente = getRecentRegistration(cpf);

          if (recente?.tickets?.length) {
            await mostrarPopupCadastro({
              kicker: "CADASTRO LOCALIZADO",
              title: "INGRESSOS JÁ EMITIDOS",
              text: "Este navegador ainda possui os ingressos emitidos anteriormente. Vamos exibi-los novamente.",
              quantidade: recente.tickets.length
            });

            await renderizarIngressos(recente);
            return;
          }
        }

        mostrarToast(friendlySheetsError(error), true);
        return;
      }
    }

    // ======================================================
    // MODO LOCAL — enquanto a planilha não estiver configurada
    // ======================================================
    const inscricoes = getInscricoes();
    const emitidos = totalIngressosEmitidos(inscricoes);
    const capacidade = Number(window.APP_CONFIG?.capacidadeEvento) || CONFIG.capacidadeEvento;
    const restantes = Math.max(0, capacidade - emitidos);

    if (quantidade > restantes) {
      mostrarToast(
        restantes > 0
          ? `Restam apenas ${restantes} ingresso(s) disponível(is) neste teste.`
          : "A capacidade configurada para o evento foi atingida.",
        true
      );
      return;
    }

    const existente = inscricoes.find(item => cpfSomenteNumeros(item.cpf) === cpf);

    if (existente && Array.isArray(existente.tickets) && existente.tickets.length) {
      await mostrarPopupCadastro({
        kicker: "CADASTRO LOCALIZADO",
        title: "INGRESSOS JÁ EMITIDOS",
        text: "Encontramos um cadastro anterior neste navegador. Vamos exibir os ingressos já emitidos.",
        quantidade: existente.tickets.length
      });

      await renderizarIngressos(existente);
      return;
    }

    const tickets = criarTickets(quantidade, inscricoes);
    const inscricao = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      nome,
      cpf,
      quantidade,
      tickets,
      criadoEm: new Date().toISOString(),
      presente: false
    };

    inscricoes.push(inscricao);
    saveInscricoes(inscricoes);

    await mostrarPopupCadastro({
      kicker: "CADASTRO CONCLUÍDO",
      title: "TUDO CERTO!",
      text: quantidade === 1
        ? "Seu cadastro foi confirmado. Agora vamos exibir o seu ingresso VIP."
        : "Seu cadastro foi confirmado. Agora vamos exibir os seus ingressos VIP.",
      quantidade
    });

    await renderizarIngressos(inscricao);
    mostrarToast("Modo local: cadastro salvo somente neste navegador.");
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
  adminModal.classList.add("active");
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

  try {
    if (sheetsConfigurado()) {
      const result = await sheetsRequest('adminLogin', { password, clientId: getClientId() });
      sessionStorage.setItem('cinemaAdminToken', result.token);
      window.location.href = 'admin.html';
      return;
    }

    // Fallback apenas para testes locais.
    if (password === CONFIG.adminPassword) {
      sessionStorage.setItem('cinemaAdmin', 'ok');
      window.location.href = 'admin.html';
      return;
    }

    throw new Error('INVALID_ADMIN_PASSWORD');
  } catch (error) {
    const message = String(error?.message || "");

    adminPassword.value = "";
    adminPassword.parentElement.style.borderColor = "#a92325";

    if (message.includes("ADMIN_LOGIN_BLOCKED")) {
      adminPassword.placeholder = "Aguarde alguns minutos";
      mostrarToast("Muitas tentativas incorretas. Aguarde 10 minutos antes de tentar novamente.", true);
    } else if (
      message.includes("NETWORK_OFFLINE") ||
      message.includes("NETWORK_ERROR") ||
      message.includes("REQUEST_TIMEOUT")
    ) {
      adminPassword.placeholder = "Falha de conexão";
      mostrarToast("Não foi possível acessar o servidor. Verifique sua internet.", true);
    } else {
      adminPassword.placeholder = "Senha incorreta";
    }

    setTimeout(() => {
      adminPassword.placeholder = "Senha";
      adminPassword.parentElement.style.borderColor = "";
    }, 2200);
  } finally {
    loginAdmin.disabled = false;
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
