// js/perfil.js

(function () {
  // --- Guard de autenticação ---
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  // --- Util: aguardar elemento existir (útil porque navbar é injetada via JS) ---
  function waitForEl(selector, timeout = 4000) {
    return new Promise((resolve, reject) => {
      const elNow = document.querySelector(selector);
      if (elNow) return resolve(elNow);

      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });

      setTimeout(() => {
        obs.disconnect();
        reject(new Error(`Elemento não encontrado: ${selector}`));
      }, timeout);
    });
  }

  // --- Logout (quando a navbar terminar de montar) ---
  waitForEl("#logoutButton").then((btn) => {
    btn.addEventListener("click", () => {
      localStorage.removeItem("authToken");
      window.location.href = "/login.html";
    });
  }).catch(() => {/* opcional: ignorar se não houver botão */});

  // --- Helpers de UI ---
  const form = document.getElementById("client-form");
  const messageDiv = document.getElementById("message");

  function showMessage(text, type = "success") {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
  }

  // (Opcional) máscara simples de CPF enquanto digita
  const docInput = document.getElementById("document");
  docInput.addEventListener("input", () => {
    let v = docInput.value.replace(/\D/g, "").slice(0, 11);
    // 000.000.000-00
    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, "$1.$2.$3-$4");
    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, "$1.$2.$3");
    else if (v.length > 3) v = v.replace(/^(\d{3})(\d{0,3}).*/, "$1.$2");
    docInput.value = v;
  });

  // --- Submit para /clients com { name, document } ---
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = (form.name.value || "").trim();
    const documentRaw = (form.document.value || "").trim();
    if (!name || !documentRaw) {
      showMessage("Preencha nome e documento.", "error");
      return;
    }

    // Envie o documento sem pontuação (se seu backend preferir limpo)
    const documentNumbers = documentRaw.replace(/\D/g, "");

    try {
      const response = await fetch("/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          document: documentNumbers   // <-- campo compatível com sua tabela
        })
      });

      // Tenta parsear JSON mesmo em erros
      let result = {};
      try { result = await response.json(); } catch (_) {}

      if (!response.ok) {
        const msg = result?.message || `Erro ${response.status}`;
        throw new Error(msg);
      }

      // Espera { id, name, document, ... } do backend
      showMessage(`Perfil salvo com sucesso! ID do Cliente: ${result.id}`, "success");

      // Redirecionar depois de salvar, se quiser:
      // window.location.href = "/pet.html";
    } catch (err) {
      showMessage(`Erro: ${err.message}`, "error");
    }
  });
})();
