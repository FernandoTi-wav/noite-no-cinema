(() => {
  "use strict";

  function installStyles() {
    if (document.getElementById("pre-confirmation-highlights-styles")) return;

    const style = document.createElement("style");
    style.id = "pre-confirmation-highlights-styles";
    style.textContent = `
      .pre-confirmation-highlights{
        width:min(640px,100%);margin:22px auto 12px;
        display:grid;grid-template-columns:1fr;gap:12px
      }
      .pre-confirmation-highlight{
        min-height:82px;padding:14px 18px;display:flex;align-items:center;gap:16px;
        border:1px solid rgba(255,255,255,.34);border-radius:10px;
        background:linear-gradient(145deg,rgba(20,16,11,.96),rgba(8,6,4,.97));
        box-shadow:inset 0 1px rgba(255,255,255,.025),0 15px 36px rgba(0,0,0,.25);text-align:left
      }
      .pre-confirmation-highlight .highlight-icon{
        width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;
        border:1px solid rgba(255,255,255,.28);border-radius:8px;
        background:rgba(255,255,255,.055);color:#fff;font-size:21px
      }
      .pre-confirmation-highlight small{
        display:block;color:rgba(255,255,255,.72);font-family:var(--display);font-size:11px;
        font-weight:700;letter-spacing:2px;line-height:1.1
      }
      .pre-confirmation-highlight strong{
        display:block;margin-top:4px;color:#fff;font-family:var(--ui);
        font-size:19px;font-weight:500;letter-spacing:0;line-height:1.1
      }
      .pre-confirmation-highlight span{
        display:block;margin-top:3px;color:rgba(255,255,255,.84);font-family:var(--ui);
        font-size:13px;line-height:1.35
      }
      .pre-confirmation-highlight.dress{
        border-color:rgba(255,255,255,.34);
        background:linear-gradient(145deg,rgba(20,16,11,.96),rgba(8,6,4,.97))
      }

      @media(max-width:700px){
        .pre-confirmation-highlights{width:min(640px,100%);grid-template-columns:1fr;gap:9px;margin-top:17px}
        .pre-confirmation-highlight{min-height:82px;padding:14px 18px;gap:16px;align-items:center}
        .pre-confirmation-highlight .highlight-icon{width:42px;height:42px;flex-basis:42px;font-size:21px}
        .pre-confirmation-highlight small{font-size:11px;letter-spacing:2px}
        .pre-confirmation-highlight strong{font-size:19px}
        .pre-confirmation-highlight span{font-size:13px}
      }

      @media(max-width:430px){
        .pre-confirmation-highlights{gap:7px}
        .pre-confirmation-highlight{min-height:82px;padding:14px 16px;gap:14px}
        .pre-confirmation-highlight .highlight-icon{width:42px;height:42px;flex-basis:42px;font-size:21px}
        .pre-confirmation-highlight small{font-size:10px;letter-spacing:1.7px}
        .pre-confirmation-highlight strong{font-size:18px}
        .pre-confirmation-highlight span{font-size:12px}
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
