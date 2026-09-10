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

  function showDressCodeAfterTicket() {
    if (alreadySeen || sessionStorage.getItem(KEY) === "1") return;
    if (document.getElementById("dressCodeModal")) return;

    // Mantém a trava ativa para evitar que o trigger antigo de 3,1 s
    // crie um segundo modal enquanto este estiver aberto.
    sessionStorage.setItem(KEY, "shown-after-ticket");

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

    overlay.querySelector("#closeDressCode")?.addEventListener("click", () => {
      sessionStorage.setItem(KEY, "1");
      overlay.remove();
      document.documentElement.style.overflow = "";
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installTicketObserver, { once: true });
  } else {
    installTicketObserver();
  }
})();
