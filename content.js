/* ============================================
   CONTENT PAGE — Instagram reels from @drpercent

   To add videos, paste each reel's URL (or just its code) into REELS,
   newest first. Example:
     'https://www.instagram.com/reel/AbCdEfGhIjK/',
     'AbCdEfGhIjK',
   Each one is shown with Instagram's official embed (cover image,
   tap to play) and loads only as it scrolls into view.
   ============================================ */
const REELS = [
];

(function () {
  const grid = document.getElementById('reel-grid');
  if (!grid) return;

  const codes = [...new Set(REELS.map(r => {
    const m = String(r).match(/(?:reels?|p|tv)\/([\w-]+)/);
    return m ? m[1] : String(r).trim();
  }).filter(Boolean))];

  const count = document.getElementById('reels-count');
  const empty = document.getElementById('reels-empty');

  if (!codes.length) {
    empty.hidden = false;
    grid.hidden = true;
    return;
  }

  count.textContent = codes.length + ' videos';

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const frame = e.target.querySelector('iframe');
        if (frame && !frame.src) frame.src = frame.dataset.src;
        io.unobserve(e.target);
      });
    }, { rootMargin: '800px 0px' })
    : null;

  codes.forEach((code, i) => {
    const card = document.createElement('article');
    card.className = 'reel';

    const frame = document.createElement('iframe');
    frame.dataset.src = 'https://www.instagram.com/reel/' + code + '/embed';
    frame.title = 'Dr. Percent video ' + (codes.length - i);
    frame.loading = 'lazy';
    frame.allowFullscreen = true;
    frame.setAttribute('scrolling', 'no');
    card.appendChild(frame);

    const link = document.createElement('a');
    link.className = 'reel-link';
    link.href = 'https://www.instagram.com/reel/' + code + '/';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open on Instagram ↗';
    card.appendChild(link);

    grid.appendChild(card);
    if (io) io.observe(card); else frame.src = frame.dataset.src;
  });
})();
