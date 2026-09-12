(() => {
  "use strict";

  function installStyles() {
    if (document.getElementById("pre-confirmation-highlights-styles")) return;

    const style = document.createElement("style");
    style.id = "pre-confirmation-highlights-styles";
    style.textContent = `
      .pre-confirmation-highlights{
        width:min(640px,100%);margin:22px auto 12px;
        display:grid;grid-template-columns:1fr 1fr;gap:12px
      }
      .pre-confirmation-highlight{
        min-height:106px;padding:16px 17px;display:flex;align-items:center;gap:14px;
        border:1px solid rgba(224,174,72,.34);border-radius:12px;
        background:linear-gradient(145deg,rgba(20,15,8,.96),rgba(8,6,4,.97));
        box-shadow:0 12px 30px rgba(0,0,0,.26);text-align:left
      }
      .pre-confirmation-highlight .highlight-icon{
        width:44px;height:44px;flex:0 0 44px;display:grid;place-items:center;
        border:1px solid rgba(255,255,255,.28);border-radius:50%;
        background:rgba(255,255,255,.055);color:#fff;font-size:18px
      }
      .pre-confirmation-highlight small{
        display:block;color:rgba(255,255,255,.72);font-family:var(--display);font-size:10px;
        font-weight:700;letter-spacing:1.6px;line-height:1.1
      }
      .pre-confirmation-highlight strong{
        display:block;margin-top:5px;color:#fff;font-family:var(--display);
        font-size:17px;font-weight:700;letter-spacing:.65px;line-height:1.08
      }
      .pre-confirmation-highlight span{
        display:block;margin-top:5px;color:rgba(255,255,255,.84);font-size:12px;line-height:1.35
      }
      .pre-confirmation-highlight.dress{
        border-color:rgba(255,255,255,.34);
        background:linear-gradient(145deg,rgba(20,16,11,.96),rgba(8,6,4,.97))
      }
      .pre-confirmation-highlight.deadline{
        border-color:rgba(224,64,70,.50);
        background:linear-gradient(145deg,rgba(83,8,12,.93),rgba(37,4,6,.97))
      }
      .pre-confirmation-highlight.deadline .highlight-icon{
        border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.06);color:#fff
      }
      .pre-confirmation-highlight.deadline small{color:#ffb9bc}
      .pre-confirmation-highlight.deadline strong{color:#fff;font-size:21px}
      .pre-confirmation-highlight.deadline span{color:#efcfd0}

      @media(max-width:700px){
        .pre-confirmation-highlights{width:min(640px,100%);grid-template-columns:1fr 1fr;gap:9px;margin-top:17px}
        .pre-confirmation-highlight{min-height:108px;padding:13px 11px;gap:9px;align-items:flex-start}
        .pre-confirmation-highlight .highlight-icon{width:35px;height:35px;flex-basis:35px;font-size:15px}
        .pre-confirmation-highlight small{font-size:8px;letter-spacing:1.15px}
        .pre-confirmation-highlight strong{font-size:14px}
        .pre-confirmation-highlight.deadline strong{font-size:17px}
        .pre-confirmation-highlight span{font-size:11px}
      }

      @media(max-width:430px){
        .pre-confirmation-highlights{gap:7px}
        .pre-confirmation-highlight{padding:12px 9px;gap:7px}
        .pre-confirmation-highlight .highlight-icon{width:30px;height:30px;flex-basis:30px;font-size:13px}
        .pre-confirmation-highlight strong{font-size:12px}
        .pre-confirmation-highlight.deadline strong{font-size:15px}
        .pre-confirmation-highlight span{font-size:10px}
      }
    `;

    document.head.appendChild(style);
  }

  function addHighlights() {
    if (document.getElementById("preConfirmationHighlights")) return true;

    const cta = document.querySelector(".hero-registration-cta");
    if (!cta || !cta.parentElement) return false;

    const wrap = document.createElement("div");
    wrap.id = "preConfirmationHighlights";
    wrap.className = "pre-confirmation-highlights";
    wrap.setAttribute("aria-label", "Informações importantes antes da confirmação");
    wrap.innerHTML = `
      <article class="pre-confirmation-highlight dress">
        <div class="highlight-icon"><i class="fa-solid fa-masks-theater"></i></div>
        <div>
          <small>DRESS CODE DA NOITE</small>
          <strong>VENHA VESTIDO À CARÁTER</strong>
          <span>Inspire-se em cinema, Hollywood, tapete vermelho, estrelas ou personagens.</span>
        </div>
      </article>

      <article class="pre-confirmation-highlight deadline">
        <div class="highlight-icon"><i class="fa-regular fa-calendar-check"></i></div>
        <div>
          <small>PRAZO FINAL</small>
          <strong>15/10/2026</strong>
          <span>Confirme sua presença até esta data.</span>
        </div>
      </article>
    `;

    cta.insertAdjacentElement("beforebegin", wrap);
    return true;
  }

  function init() {
    installStyles();
    if (addHighlights()) return;

    const observer = new MutationObserver(() => {
      if (addHighlights()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
