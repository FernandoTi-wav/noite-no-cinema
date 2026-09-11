(() => {
  "use strict";

  const FILTERS = [
    ["all", "TODOS"],
    ["available", "PENDENTES"],
    ["redeemed", "RESGATADOS"],
    ["inactive", "INATIVOS"]
  ];
  let activeFilter = "all";
  let inviteObserver = null;

  function installStyles() {
    if (document.getElementById("admin-enhancements-styles")) return;
    const style = document.createElement("style");
    style.id = "admin-enhancements-styles";
    style.textContent = `
      .summary-grid .summary-extra small{
        display:block;margin-top:5px;color:#887b66;font-family:var(--ui);font-size:12px;letter-spacing:.2px
      }
      .summary-grid .summary-extra strong{font-size:34px}
      .summary-grid .summary-extra i{opacity:.52}
      .invite-quick-filters{
        display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 2px
      }
      .invite-quick-filter{
        min-height:36px;padding:0 12px;border:1px solid rgba(216,166,67,.2);border-radius:7px;
        background:#0b0906;color:#9f917a;font-family:var(--display);font-size:11px;letter-spacing:.9px;cursor:pointer
      }
      .invite-quick-filter:hover{border-color:rgba(224,177,78,.45);color:#e2c178}
      .invite-quick-filter.active{
        border-color:rgba(232,188,93,.62);background:rgba(206,151,41,.10);color:#f0c864;
        box-shadow:0 0 0 2px rgba(206,151,41,.05)
      }
      .invite-filter-empty{
        display:none;margin:15px 0 0;padding:18px;border:1px dashed rgba(220,170,70,.2);border-radius:8px;
        color:#8e8170;text-align:center;font-size:13px
      }
      .invite-filter-empty.show{display:block}
      @media(max-width:700px){
        .invite-quick-filters{display:grid;grid-template-columns:1fr 1fr}
        .invite-quick-filter{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function addSummaryCards() {
    const grid = document.querySelector(".summary-grid");
    if (!grid) return;

    if (!document.getElementById("peopleConfirmedCard")) {
      const card = document.createElement("article");
      card.id = "peopleConfirmedCard";
      card.className = "summary-extra";
      card.innerHTML = `
        <span>PESSOAS CONFIRMADAS</span>
        <strong id="peopleConfirmedValue">0 / 120</strong>
        <small id="peopleConfirmedDetail">0 pessoas confirmadas</small>
        <i class="fa-solid fa-person-circle-check"></i>
      `;
      const deadline = document.getElementById("deadlineSummaryCard");
      grid.insertBefore(card, deadline || null);
    }

    if (!document.getElementById("occupancyCard")) {
      const card = document.createElement("article");
      card.id = "occupancyCard";
      card.className = "summary-extra";
      card.innerHTML = `
        <span>OCUPAÇÃO</span>
        <strong id="occupancyValue">0%</strong>
        <small id="occupancyDetail">0 de 120 vagas preenchidas</small>
        <i class="fa-solid fa-chart-pie"></i>
      `;
      const deadline = document.getElementById("deadlineSummaryCard");
      grid.insertBefore(card, deadline || null);
    }
  }

  function refreshSummaryCards() {
    const emittedEl = document.getElementById("totalIngressos");
    const remainingEl = document.getElementById("vagasRestantes");
    if (!emittedEl || !remainingEl) return;

    const emitted = Math.max(0, Number(emittedEl.textContent) || 0);
    const remaining = Math.max(0, Number(remainingEl.textContent) || 0);
    const capacity = Math.max(1, emitted + remaining);
    const percent = Math.min(100, Math.round((emitted / capacity) * 100));

    const peopleValue = document.getElementById("peopleConfirmedValue");
    const peopleDetail = document.getElementById("peopleConfirmedDetail");
    const occupancyValue = document.getElementById("occupancyValue");
    const occupancyDetail = document.getElementById("occupancyDetail");

    if (peopleValue) peopleValue.textContent = `${emitted} / ${capacity}`;
    if (peopleDetail) peopleDetail.textContent = `${emitted} ${emitted === 1 ? "pessoa confirmada" : "pessoas confirmadas"}`;
    if (occupancyValue) occupancyValue.textContent = `${percent}%`;
    if (occupancyDetail) occupancyDetail.textContent = `${emitted} de ${capacity} vagas preenchidas`;
  }

  function statusFromRow(row) {
    const label = String(row.querySelector(".invite-status")?.textContent || "").toUpperCase();
    if (label.includes("RESGATADO")) return "redeemed";
    if (label.includes("INATIVO")) return "inactive";
    return "available";
  }

  function applyInviteFilter() {
    const table = document.getElementById("inviteTable");
    if (!table) return;

    const rows = [...table.querySelectorAll("tr")];
    let visible = 0;
    rows.forEach(row => {
      const show = activeFilter === "all" || statusFromRow(row) === activeFilter;
      row.style.display = show ? "" : "none";
      if (show) visible++;
    });

    const empty = document.getElementById("inviteFilterEmpty");
    if (empty) empty.classList.toggle("show", activeFilter !== "all" && rows.length > 0 && visible === 0);
  }

  function addInviteFilters() {
    const toolbar = document.querySelector(".invite-toolbar");
    const table = document.getElementById("inviteTable");
    if (!toolbar || !table || document.getElementById("inviteQuickFilters")) return;

    const wrap = document.createElement("div");
    wrap.id = "inviteQuickFilters";
    wrap.className = "invite-quick-filters";
    wrap.setAttribute("aria-label", "Filtros rápidos dos convites");

    FILTERS.forEach(([value, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `invite-quick-filter${value === activeFilter ? " active" : ""}`;
      button.dataset.filter = value;
      button.textContent = label;
      button.addEventListener("click", () => {
        activeFilter = value;
        wrap.querySelectorAll(".invite-quick-filter").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.filter === activeFilter);
        });
        applyInviteFilter();
      });
      wrap.appendChild(button);
    });

    toolbar.insertAdjacentElement("beforebegin", wrap);

    const empty = document.createElement("div");
    empty.id = "inviteFilterEmpty";
    empty.className = "invite-filter-empty";
    empty.textContent = "Nenhum convite encontrado neste filtro.";
    toolbar.insertAdjacentElement("afterend", empty);

    inviteObserver = new MutationObserver(() => applyInviteFilter());
    inviteObserver.observe(table, { childList: true });
  }

  function observeSummary() {
    const emitted = document.getElementById("totalIngressos");
    const remaining = document.getElementById("vagasRestantes");
    if (!emitted || !remaining) return;
    const observer = new MutationObserver(refreshSummaryCards);
    observer.observe(emitted, { childList: true, characterData: true, subtree: true });
    observer.observe(remaining, { childList: true, characterData: true, subtree: true });
  }

  function polishDeadlineText() {
    const date = document.getElementById("registrationDeadlineDate");
    if (!date) return;
    const observer = new MutationObserver(() => {
      if (date.textContent.includes("INSCRIÇÕES ATÉ")) {
        date.textContent = date.textContent.replace("INSCRIÇÕES ATÉ", "CONFIRMAÇÕES ATÉ");
      }
    });
    observer.observe(date, { childList: true, characterData: true, subtree: true });
    if (date.textContent.includes("INSCRIÇÕES ATÉ")) {
      date.textContent = date.textContent.replace("INSCRIÇÕES ATÉ", "CONFIRMAÇÕES ATÉ");
    }
  }

  function init() {
    installStyles();
    addSummaryCards();
    refreshSummaryCards();
    observeSummary();
    addInviteFilters();
    polishDeadlineText();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();