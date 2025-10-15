(function () {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

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

  waitForEl("#logoutButton").then((btn) => {
    btn.addEventListener("click", () => {
      localStorage.removeItem("authToken");
      window.location.href = "/login.html";
    });
  }).catch(() => {/* opcional: ignorar se não houver botão */});

  const form = document.getElementById("client-form");
  const messageDiv = document.getElementById("message");

  function showMessage(text, type = "success") {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
  }

  const docInput = document.getElementById("document");
  docInput.addEventListener("input", () => {
    let v = docInput.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 9) v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, "$1.$2.$3-$4");
    else if (v.length > 6) v = v.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, "$1.$2.$3");
    else if (v.length > 3) v = v.replace(/^(\d{3})(\d{0,3}).*/, "$1.$2");
    docInput.value = v;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = (form.name.value || "").trim();
    const documentRaw = (form.document.value || "").trim();
    if (!name || !documentRaw) {
      showMessage("Preencha nome e documento.", "error");
      return;
    }

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
          document: documentNumbers   //campo compatível com sua tabela
        })
      });

      let result = {};
      try { result = await response.json(); } catch (_) {}

      if (!response.ok) {
        const msg = result?.message || `Erro ${response.status}`;
        throw new Error(msg);
      }

      showMessage(`Perfil salvo com sucesso! ID do Cliente: ${result.id}`, "success");

    } catch (err) {
      showMessage(`Erro: ${err.message}`, "error");
    }
  });
})();
