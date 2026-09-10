(() => {
  "use strict";

  function installStyles() {
    if (document.getElementById("deadline-polish-styles")) return;

    const style = document.createElement("style");
    style.id = "deadline-polish-styles";
    style.textContent = `
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
        #registrationDeadlineNotice small{
          font-size:12px!important;
        }

        #registrationDeadlineNotice strong{
          font-size:22px!important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function updateDeadlineText() {
    const notice = document.getElementById("registrationDeadlineNotice");
    if (!notice || notice.classList.contains("closed")) return;

    const strong = notice.querySelector("strong");
    if (strong && strong.textContent.trim() !== "15/10/2026") {
      strong.textContent = "15/10/2026";
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
