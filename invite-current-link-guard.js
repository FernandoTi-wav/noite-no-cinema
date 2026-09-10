(() => {
  "use strict";

  const INVITE_SESSION_KEY = "cinemaInviteCodeV22";
  const PENDING_KEY = "cinemaPendingInviteCode";

  function currentUrlHasInvite() {
    try {
      return Boolean(String(new URL(location.href).searchParams.get("convite") || "").trim());
    } catch (_) {
      return false;
    }
  }

  // Segurança de fluxo: só um acesso que chegou NESTA navegação com
  // ?convite=... pode ativar preenchimento/validação automática.
  // Ao abrir o site normalmente, descartamos qualquer código antigo da sessão.
  if (!currentUrlHasInvite()) {
    try {
      sessionStorage.removeItem(INVITE_SESSION_KEY);
      localStorage.removeItem(PENDING_KEY);
    } catch (_) {}

    try {
      delete window.__cinemaInviteCodeV22;
    } catch (_) {
      window.__cinemaInviteCodeV22 = "";
    }
  }
})();
