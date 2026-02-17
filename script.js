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
        // Typing
        typedEl.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;

        if (charIndex === currentRole.length) {
          isDeleting = true;
          setTimeout(typeLoop, pauseAfterType);
          return;
        }
        setTimeout(typeLoop, typeSpeed);
      } else {
        // Deleting
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

  /* ---------- Floating Stars ---------- */
  const canvas = document.getElementById('stars-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    const STAR_COUNT = 50;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createStars() {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.3,
          alpha: Math.random() * 0.5 + 0.1,
          dx: (Math.random() - 0.5) * 0.15,
          dy: (Math.random() - 0.5) * 0.15,
          twinkleSpeed: Math.random() * 0.01 + 0.003,
          twinklePhase: Math.random() * Math.PI * 2
        });
      }
    }

    function drawStars() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        // Update position
        star.x += star.dx;
        star.y += star.dy;

        // Wrap around edges
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;

        // Twinkle effect
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const finalAlpha = star.alpha * twinkle;

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 180, 255, ${finalAlpha})`;
        ctx.fill();
      });

      requestAnimationFrame(drawStars);
    }

    resize();
    createStars();
    drawStars();

    window.addEventListener('resize', () => {
      resize();
      createStars();
    });
  }

});
