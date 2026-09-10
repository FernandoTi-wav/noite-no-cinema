(() => {
  "use strict";

  const originalSheetsRequest = window.sheetsRequest;
  const originalFriendlySheetsError = window.friendlySheetsError;

  if (typeof originalSheetsRequest === "function") {
    window.sheetsRequest = async function(action, payload = {}, options = {}) {
      const tunedOptions = { ...options };

      // O backend pode aguardar até 30 s pela trava de cadastro.
      // Mantemos uma folga no navegador para evitar abortar uma operação
      // que ainda está sendo processada corretamente no servidor.
      if (action === "register") {
        tunedOptions.timeoutMs = Math.max(Number(tunedOptions.timeoutMs || 0), 45000);
      }

      try {
        return await originalSheetsRequest(action, payload, tunedOptions);
      } catch (error) {
        const message = String(error?.message || "");

        // SERVER_BUSY_RETRY significa que o backend NÃO entrou na área crítica
        // e, portanto, o convite ainda não foi consumido. É seguro tentar uma
        // segunda vez automaticamente após uma pequena espera.
        if (action === "register" && message.includes("SERVER_BUSY_RETRY")) {
          await new Promise(resolve => setTimeout(resolve, 1200 + Math.floor(Math.random() * 700)));
          return originalSheetsRequest(action, payload, {
            ...tunedOptions,
            retries: 0,
            timeoutMs: 45000
          });
        }

        throw error;
      }
    };
  }

  window.friendlySheetsError = function(error) {
    const message = String(error?.message || error || "");

    if (message.includes("SERVER_BUSY_RETRY")) {
      return "Há muitas confirmações sendo processadas neste momento. Seu convite não foi consumido. Aguarde alguns segundos e tente novamente.";
    }

    if (message.includes("REQUEST_TIMEOUT")) {
      return "O servidor demorou para responder. Aguarde alguns segundos e use ‘Recuperar meus ingressos’ antes de enviar novamente, pois a confirmação pode ter sido concluída.";
    }

    if (message.includes("NETWORK_ERROR")) {
      return "A conexão com o servidor foi interrompida. Aguarde alguns segundos e confira ‘Recuperar meus ingressos’ antes de tentar novamente.";
    }

    return typeof originalFriendlySheetsError === "function"
      ? originalFriendlySheetsError(error)
      : "Não foi possível concluir o cadastro agora. Tente novamente em alguns instantes.";
  };
})();
