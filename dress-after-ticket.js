(() => {
  "use strict";

  const KEY = "cinemaDressCodeSeen";
  const currentState = sessionStorage.getItem(KEY);
  const alreadySeen = currentState === "1";

  // Impede o popup antigo de aparecer automaticamente ao abrir a página.
  // O valor continua diferente de "1" para sabermos que o aviso ainda deve
  // ser exibido depois que os ingressos forem gerados.
  if (!alreadySeen) {
    sessionStorage.setItem(KEY, "deferred-until-ticket");
  }

  function installPopupStyles() {
    if (document.getElementById("dress-after-ticket-styles")) return;

    const style = document.createElement("style");
    style.id = "dress-after-ticket-styles";
    style.textContent = `
      .cinema-print-highlight{
        margin:14px 0 16px;
        padding:15px;
        display:flex;
        align-items:flex-start;
        gap:12px;
        border:1px solid rgba(238,74,79,.72);
        border-radius:10px;
        background:linear-gradient(135deg,rgba(132,10,16,.34),rgba(74,5,9,.24));
        box-shadow:0 0 0 3px rgba(190,25,31,.08);
      }
      .cinema-print-highlight>i{
        flex:0 0 auto;
        margin-top:2px;
        color:#ff787d;
        font-size:21px;
      }
      .cinema-print-highlight strong{
        display:block;
        color:#fff;
        font-family:var(--display);
        font-size:16px;
        letter-spacing:.9px;
      }
      .cinema-print-highlight span{
        display:block;
        margin-top:4px;
        color:#f0cfd0;
        font-size:13px;
        line-height:1.45;
      }
      #dressCodeModal .cinema-info-primary{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
      }
    `;
    document.head.appendChild(style);
  }

  function showDressCodeAfterTicket() {
    if (alreadySeen || sessionStorage.getItem(KEY) === "1") return;
    if (document.getElementById("dressCodeModal")) return;

    installPopupStyles();

    // Mantém a trava ativa para evitar que o trigger antigo de 3,1 s
    // crie um segundo modal enquanto este estiver aberto.
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
        document.getElementById("ticketResults")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
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

      const hasGeneratedTicket = Boolean(
        results.querySelector(".generated-card, .generated-ticket-image")
      );

      if (!hasGeneratedTicket || results.classList.contains("hidden")) return;

      scheduled = true;
      setTimeout(showDressCodeAfterTicket, 550);
    };

    const observer = new MutationObserver(check);
    observer.observe(results, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    check();
  }

  function loadTicketRecovery() {
    if (document.getElementById("ticket-recovery-script")) return;
    const script = document.createElement("script");
    script.id = "ticket-recovery-script";
    script.src = "ticket-recovery.js?v=21.1.0";
    script.defer = true;
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      installTicketObserver();
      loadTicketRecovery();
    }, { once: true });
  } else {
    installTicketObserver();
    loadTicketRecovery();
  }
})();
