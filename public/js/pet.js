// js/pets.js
(function () {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  // refs
  const form = document.getElementById("petForm");
  const responseEl = document.getElementById("response");
  const clientSelect = document.getElementById("ClientId");
  const clientInfo = document.getElementById("clientInfo");
  const photoInput = document.getElementById("photo");
  const photoPreview = document.getElementById("photoPreview");
  const inputsPet = [
    document.getElementById("name"),
    document.getElementById("type"),
    document.getElementById("breed"),
    document.getElementById("birth"),
    document.getElementById("photo"),
  ];
  const submitBtn = form.querySelector('button[type="submit"]');

  function showMessage(text, type = "success") {
    responseEl.textContent = text;
    responseEl.className = `message ${type}`;
    responseEl.style.display = "block";
  }

  function setPetFieldsEnabled(enabled) {
    inputsPet.forEach(el => el.disabled = !enabled);
    submitBtn.disabled = !enabled;
  }

  // máscara simples para CPF visual
  const maskCPF = (digits) => {
    const v = String(digits || "").replace(/\D/g, "").slice(0,11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return v.replace(/^(\d{3})(\d+)/, "$1.$2");
    if (v.length <= 9) return v.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
    return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, "$1.$2.$3-$4");
  };

  // 1) Carregar clientes do BD e popular o select
  async function carregarClientes() {
    try {
      const res = await fetch("/clients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Erro ao carregar clientes (${res.status})`);

      const data = await res.json();
      // aceita array direto ou {items:[...]}
      const list = Array.isArray(data) ? data : (data.items || []);
      if (!Array.isArray(list) || list.length === 0) {
        clientInfo.textContent = "Nenhum cliente encontrado. Cadastre um cliente primeiro.";
        setPetFieldsEnabled(false);
        return;
      }

      // popular opções
      for (const c of list) {
        // esperamos { id, name, document }
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.name} — ${maskCPF(c.document)}`;
        opt.dataset.document = c.document;
        clientSelect.appendChild(opt);
      }
      clientInfo.textContent = "Selecione um cliente para habilitar o cadastro do pet.";
    } catch (err) {
      clientInfo.textContent = "Falha ao carregar clientes.";
      showMessage(`Erro ao buscar clientes: ${err.message}`, "error");
      setPetFieldsEnabled(false);
    }
  }

  // 2) Habilitar campos ao escolher um cliente válido
  clientSelect.addEventListener("change", () => {
    const id = clientSelect.value;
    if (id) {
      setPetFieldsEnabled(true);
      const opt = clientSelect.selectedOptions[0];
      clientInfo.textContent = `Cliente selecionado: ${opt.textContent}`;
    } else {
      setPetFieldsEnabled(false);
      clientInfo.textContent = "Selecione um cliente para habilitar o cadastro do pet.";
    }
  });

  // 3) Preview da imagem
  photoInput.addEventListener("change", () => {
    photoPreview.innerHTML = "";
    const file = photoInput.files?.[0];
    if (!file) return;
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = "Prévia da foto";
    img.style.maxWidth = "160px";
    img.style.borderRadius = "10px";
    img.onload = () => URL.revokeObjectURL(img.src);
    photoPreview.appendChild(img);
  });

  // 4) Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!clientSelect.value) {
      showMessage("Selecione um cliente antes de enviar.", "error");
      return;
    }

    const fd = new FormData(form); // inclui ClientId + demais campos
    try {
      const res = await fetch("/pets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      let data = {};
      try { data = await res.json(); } catch (_) {}

      if (!res.ok) {
        const msg = data?.message || `Erro ${res.status}`;
        throw new Error(msg);
      }

      showMessage(`Enviado com sucesso!`, "success");
      form.reset();
      setPetFieldsEnabled(false);
      photoPreview.innerHTML = "";
      clientInfo.textContent = "Selecione um cliente para habilitar o cadastro do pet.";
    } catch (err) {
      showMessage(`Erro: ${err.message}`, "error");
    }
  });

  // 5) Navbar: logout quando botão aparecer (navbar é injetada)
  const obs = new MutationObserver(() => {
    const logout = document.getElementById("logoutButton");
    if (logout) {
      logout.addEventListener("click", () => {
        localStorage.removeItem("authToken");
        window.location.href = "/login.html";
      });
      obs.disconnect();
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // inicializa
  setPetFieldsEnabled(false);
  carregarClientes();
})();
