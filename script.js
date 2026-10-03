/* ============================================
   PORTFOLIO — script.js
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;

  /* ---------- Theme toggle (light by default, choice remembered) ---------- */
  const themeBtn = document.getElementById('theme-toggle');

  function syncThemeLabel() {
    const isDark = root.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  if (themeBtn) {
    syncThemeLabel();
    themeBtn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
      syncThemeLabel();
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#0a0a0a' : '#f8f8f8');
    });
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.getElementById('menu-btn');
  const navLinks = document.getElementById('nav-links');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- Experience tabs ---------- */
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('tab-' + tab.dataset.tab);
      if (panel) {
        panel.classList.add('active');
        panel.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
      }
    });
  });

  /* ---------- Projects: show more ---------- */
  const moreBtn = document.getElementById('proj-more');
  if (moreBtn) {
    const extra = document.querySelectorAll('.proj-card.more');
    moreBtn.addEventListener('click', () => {
      const show = moreBtn.getAttribute('aria-expanded') !== 'true';
      extra.forEach(card => { card.hidden = !show; });
      moreBtn.setAttribute('aria-expanded', String(show));
      moreBtn.textContent = show ? 'Show fewer projects' : 'Show ' + moreBtn.dataset.count + ' more projects';
    });
  }

  /* ---------- Active nav link on scroll ---------- */
  const links = document.querySelectorAll('.links a.link');
  const sections = document.querySelectorAll('main section[id]');

  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  sections.forEach(s => spy.observe(s));

  /* ---------- Scroll reveal ---------- */
  const reveals = document.querySelectorAll('.reveal');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    reveals.forEach(el => io.observe(el));
  }

  /* ---------- Footer year ---------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});
