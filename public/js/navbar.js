document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  try {
    const res = await fetch('/_navbar.html', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    container.innerHTML = html;
  } catch (err) {
    console.error('Falha ao carregar a navbar:', err);
    container.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand"><a href="/">PetCare</a></div>
        <ul class="navbar-links">
          <li><a href="/index.html">Início</a></li>
          <li><a href="/clients.html">Clientes</a></li>
          <li><a href="/pets.html">Pets</a></li>
        </ul>
        <div class="navbar-logout"><button id="logoutButton">Sair</button></div>
      </nav>`;
  }

  const nav   = container.querySelector('.navbar');
  const links = container.querySelector('.navbar-links');
  const logoutButton = container.querySelector('#logoutButton');

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      window.location.href = '/login.html';
    });
  }

  const here = location.pathname.replace(/\/+$/, '') || '/';
  links?.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href')?.replace(/\/+$/, '') || '';
    if (href && (href === here)) a.classList.add('active');
  });

  let burger = nav?.querySelector('.navbar-burger');
  if (nav && !burger) {
    burger = document.createElement('button');
    burger.className = 'navbar-burger';
    burger.setAttribute('aria-label', 'Abrir menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';

    const logoutWrap = nav.querySelector('.navbar-logout');
    if (logoutWrap) nav.insertBefore(burger, logoutWrap);
    else nav.appendChild(burger);
  }

  const toggleMenu = () => {
    if (!nav) return;
    nav.classList.toggle('is-open');
    const open = nav.classList.contains('is-open');
    burger?.setAttribute('aria-expanded', String(open));
  };
  burger?.addEventListener('click', toggleMenu);

  links?.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (!target) return;
    if (window.matchMedia('(max-width: 840px)').matches) {
      nav?.classList.remove('is-open');
      burger?.setAttribute('aria-expanded', 'false');
    }
  });

  function setNavbarHeightVar(){
    if (!nav) return;
    const h = Math.round(nav.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--navbar-h', `${h}px`);
  }
  setNavbarHeightVar();

  const onResize = () => setNavbarHeightVar();
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setNavbarHeightVar).catch(() => {});
  }
});
