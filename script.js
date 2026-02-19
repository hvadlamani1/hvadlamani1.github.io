/* ============================================
   PORTFOLIO — script.js
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Dynamic Greeting ---------- */
  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) {
    const hour = new Date().getHours();
    let greeting = 'Good evening!';
    if (hour >= 5 && hour < 12) greeting = 'Good morning!';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon!';
    greetingEl.textContent = greeting;
  }

  /* ---------- Typing Effect for Roles ---------- */
  const typedEl = document.getElementById('typed-role');
  if (typedEl) {
    const roles = [
      'Software Engineer',
      'Data Scientist',
      'AI Engineer'
    ];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typeSpeed = 80;
    const deleteSpeed = 40;
    const pauseAfterType = 1800;
    const pauseAfterDelete = 400;

    function typeLoop() {
      const currentRole = roles[roleIndex];

      if (!isDeleting) {
        typedEl.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;

        if (charIndex === currentRole.length) {
          isDeleting = true;
          setTimeout(typeLoop, pauseAfterType);
          return;
        }
        setTimeout(typeLoop, typeSpeed);
      } else {
        typedEl.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
          setTimeout(typeLoop, pauseAfterDelete);
          return;
        }
        setTimeout(typeLoop, deleteSpeed);
      }
    }

    typeLoop();
  }

  /* ---------- Experience Tabs ---------- */
  const tabs = document.querySelectorAll('.exp-tab');
  const contents = document.querySelectorAll('.exp-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  /* ---------- Mobile Menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });

    mobileMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
      });
    });
  }

  /* ---------- Active Nav on Scroll ---------- */
  const sectionEls = document.querySelectorAll('.section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observerOptions = {
    root: null,
    rootMargin: '-40% 0px -55% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, observerOptions);

  sectionEls.forEach(sec => observer.observe(sec));

  /* ---------- Scroll Reveal ---------- */
  const reveals = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach(el => revealObserver.observe(el));

  /* ---------- Smooth Scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* ---------- Animated Grid Background ---------- */
  const canvas = document.getElementById('grid-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const GRID_SIZE = 40;
    const LINE_COLOR = 'rgba(168, 85, 247, 0.06)';
    const PULSE_COLOR_BASE = [168, 85, 247];
    let time = 0;
    let pulses = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Spawn a pulse periodically
    function spawnPulse() {
      const isHorizontal = Math.random() > 0.5;
      if (isHorizontal) {
        const row = Math.floor(Math.random() * (canvas.height / GRID_SIZE));
        pulses.push({
          type: 'h',
          row: row,
          x: -100,
          speed: 1.5 + Math.random() * 1.5,
          alpha: 0.12 + Math.random() * 0.08
        });
      } else {
        const col = Math.floor(Math.random() * (canvas.width / GRID_SIZE));
        pulses.push({
          type: 'v',
          col: col,
          y: -100,
          speed: 1 + Math.random() * 1.5,
          alpha: 0.12 + Math.random() * 0.08
        });
      }
    }

    function drawGrid() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw static grid lines
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw animated pulses traveling along grid lines
      pulses.forEach(pulse => {
        const [r, g, b] = PULSE_COLOR_BASE;
        const gradLen = 200;

        if (pulse.type === 'h') {
          const y = pulse.row * GRID_SIZE;
          const grad = ctx.createLinearGradient(pulse.x - gradLen, y, pulse.x + gradLen, y);
          grad.addColorStop(0, `rgba(${r},${g},${b}, 0)`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b}, ${pulse.alpha})`);
          grad.addColorStop(1, `rgba(${r},${g},${b}, 0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pulse.x - gradLen, y);
          ctx.lineTo(pulse.x + gradLen, y);
          ctx.stroke();
          pulse.x += pulse.speed;
        } else {
          const x = pulse.col * GRID_SIZE;
          const grad = ctx.createLinearGradient(x, pulse.y - gradLen, x, pulse.y + gradLen);
          grad.addColorStop(0, `rgba(${r},${g},${b}, 0)`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b}, ${pulse.alpha})`);
          grad.addColorStop(1, `rgba(${r},${g},${b}, 0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, pulse.y - gradLen);
          ctx.lineTo(x, pulse.y + gradLen);
          ctx.stroke();
          pulse.y += pulse.speed;
        }
      });

      // Remove pulses that have left the screen
      pulses = pulses.filter(p => {
        if (p.type === 'h') return p.x < canvas.width + 300;
        return p.y < canvas.height + 300;
      });

      // Spawn new pulses at a steady rate
      time++;
      if (time % 90 === 0) spawnPulse();

      requestAnimationFrame(drawGrid);
    }

    resize();
    // Seed a few initial pulses
    for (let i = 0; i < 3; i++) spawnPulse();
    drawGrid();

    window.addEventListener('resize', () => {
      resize();
    });
  }

});
