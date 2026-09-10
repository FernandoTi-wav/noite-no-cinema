(() => {
  "use strict";

  function installStyles() {
    if (document.getElementById("deadline-polish-styles")) return;

    const style = document.createElement("style");
    style.id = "deadline-polish-styles";
    style.textContent = `
      #registrationDeadlineNotice{
        position:relative!important;
        justify-content:center!important;
        text-align:center!important;
        padding-left:86px!important;
        padding-right:86px!important;
      }

      #registrationDeadlineNotice>i{
        position:absolute!important;
        left:24px!important;
        top:50%!important;
        transform:translateY(-50%)!important;
        width:42px!important;
        height:42px!important;
        display:grid!important;
        place-items:center!important;
        margin:0!important;
        border:1px solid rgba(255,255,255,.28)!important;
        border-radius:10px!important;
        background:rgba(255,255,255,.07)!important;
        color:#fff!important;
        font-size:19px!important;
      }

      #registrationDeadlineNotice>div{
        width:100%!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
      }

      #registrationDeadlineNotice small{
        font-size:13px!important;
        letter-spacing:2.4px!important;
        line-height:1.1!important;
      }

      #registrationDeadlineNotice strong{
        margin-top:5px!important;
        font-size:24px!important;
        line-height:1!important;
        letter-spacing:.4px!important;
      }

      @media(max-width:700px){
        #registrationDeadlineNotice{
          padding-left:72px!important;
          padding-right:18px!important;
        }

        #registrationDeadlineNotice>i{
          left:18px!important;
          width:38px!important;
          height:38px!important;
          font-size:17px!important;
        }

        #registrationDeadlineNotice small{
          font-size:12px!important;
        }

        #registrationDeadlineNotice strong{
          font-size:22px!important;
        }
      }

      @media(max-width:430px){
        #registrationDeadlineNotice{
          padding:18px 14px!important;
          flex-direction:column!important;
          gap:9px!important;
        }

        #registrationDeadlineNotice>i{
          position:static!important;
          transform:none!important;
          width:36px!important;
          height:36px!important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function updateDeadlineText() {
    const notice = document.getElementById("registrationDeadlineNotice");
    if (!notice || notice.classList.contains("closed")) return;

    const strong = notice.querySelector("strong");
    if (strong && strong.textContent.trim() !== "ATÉ 15/10/2026") {
      strong.textContent = "ATÉ 15/10/2026";
    }
  }

  function init() {
    installStyles();
    updateDeadlineText();

    const notice = document.getElementById("registrationDeadlineNotice");
    if (!notice) return;

    const observer = new MutationObserver(() => updateDeadlineText());
    observer.observe(notice, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
