// auth.js – versão com tratamento de erros melhorado

document.addEventListener('DOMContentLoaded', () => {
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm)  handleLogin(loginForm);
  if (signupForm) handleSignup(signupForm);
});

// ===== Utilidades comuns =====
const REQUEST_TIMEOUT_MS = 12000;

function ensureMessageDiv() {
  let el = document.getElementById('message');
  if (!el) {
    el = document.createElement('div');
    el.id = 'message';
    el.className = 'message';
    document.body.appendChild(el);
  }
  return el;
}

function showMessage(text, type = 'error') {
  const el = ensureMessageDiv();
  el.textContent = text;
  el.className = `message ${type}`; // usa .message.success / .message.error do seu CSS
  el.style.display = 'block';
}

function setLoading(form, loading) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.dataset._originalText ??= btn.textContent;
  btn.disabled = loading;
  btn.textContent = loading ? 'Enviando…' : btn.dataset._originalText;

  // Evita alterações enquanto envia
  form.querySelectorAll('input,select').forEach(i => (i.readOnly = loading));
}

async function safeParseJSON(res) {
  try { return await res.json(); } catch { return null; }
}

function buildBackendErrorText(payload, fallback = 'Erro ao processar a solicitação.') {
  if (!payload || typeof payload !== 'object') return fallback;

  // 1) message (string)
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  // 2) Arrays comuns: errors / issues / details / fieldErrors
  const arrays = [payload.errors, payload.issues, payload.details, payload.fieldErrors];
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length) {
      const msgs = arr.map(e => {
        if (e?.message && e?.field) return `${e.field}: ${e.message}`;
        if (e?.message && e?.path)  return `${e.path}: ${e.message}`;
        return e?.message || JSON.stringify(e);
      });
      return msgs.join('\n');
    }
  }

  // 3) Sequelize unique
  if (payload.name === 'SequelizeUniqueConstraintError' && Array.isArray(payload.errors)) {
    return payload.errors.map(e => e.message || `${e.path} já existe`).join('\n');
  }

  return fallback;
}

async function fetchWithHandling(url, options = {}) {
  // Timeout via AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const data = await safeParseJSON(res);

    // Mapeamento de status para mensagens amigáveis
    if (res.status === 401) {
      return { ok: false, msg: 'Não autorizado. Confira email/senha e tente novamente.', res, data };
    }
    if (res.status === 409) {
      const msg = buildBackendErrorText(data, 'Registro duplicado.');
      return { ok: false, msg, res, data };
    }
    if (res.status === 422) { // validação
      const msg = buildBackendErrorText(data, 'Dados inválidos. Verifique os campos.');
      return { ok: false, msg, res, data };
    }
    if (res.status === 429) {
      return { ok: false, msg: 'Muitas tentativas. Aguarde um pouco e tente novamente.', res, data };
    }
    if (res.status === 400) {
      const msg = buildBackendErrorText(data, 'Requisição inválida.');
      return { ok: false, msg, res, data };
    }
    if (res.status >= 500) {
      return { ok: false, msg: 'Erro no servidor. Tente novamente em instantes.', res, data };
    }

    if (!res.ok) {
      const msg = buildBackendErrorText(data, `Erro ${res.status}.`);
      return { ok: false, msg, res, data };
    }

    return { ok: true, data, res };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, msg: 'Tempo de resposta excedido. Tente novamente.', res: null, data: null };
    }
    if (/NetworkError|Failed to fetch|TypeError: Failed to fetch/i.test(err.message)) {
      return { ok: false, msg: 'Falha de rede. Verifique sua conexão/servidor.', res: null, data: null };
    }
    return { ok: false, msg: `Erro: ${err.message}`, res: null, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// ===== Fluxo de Login =====
function handleLogin(form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setLoading(form, true);
    showMessage('', 'error'); // limpa mensagens (mantém bloco visível, se quiser)

    const email = form.querySelector('#email')?.value?.trim();
    const password = form.querySelector('#password')?.value || '';
    if (!email || !password) {
      setLoading(form, false);
      return showMessage('Informe email e senha.', 'error');
    }

    const { ok, msg, data } = await fetchWithHandling('/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    setLoading(form, false);

    if (!ok) return showMessage(msg, 'error');

    // sucesso
    if (data?.token) {
      localStorage.setItem('authToken', data.token);
      showMessage('Login realizado com sucesso. Redirecionando…', 'success');
      window.location.href = '/index.html';
    } else {
      showMessage('Resposta inesperada do servidor.', 'error');
    }
  });
}

// ===== Fluxo de Cadastro =====
function handleSignup(form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setLoading(form, true);
    showMessage('', 'error'); // limpa

    const email = form.querySelector('#email')?.value?.trim();
    const password = form.querySelector('#password')?.value || '';
    if (!email || !password) {
      setLoading(form, false);
      return showMessage('Preencha email e senha.', 'error');
    }

    const { ok, msg } = await fetchWithHandling('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    setLoading(form, false);

    if (!ok) return showMessage(msg, 'error');

    // sucesso
    showMessage('Cadastro realizado com sucesso! Redirecionando para o login…', 'success');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
  });
}
