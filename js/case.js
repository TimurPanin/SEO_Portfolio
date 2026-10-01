// Скрипты страницы кейса: просмотр скриншотов и подсветка раздела в содержании.

// --- Просмотр скриншотов в модальном окне ---
const viewer = document.querySelector('#evidence-viewer');
const viewerImage = viewer?.querySelector('img');
const viewerCaption = viewer?.querySelector('p');

if (viewer && viewerImage && viewerCaption && typeof viewer.showModal === 'function') {
  for (const image of document.querySelectorAll('.case-evidence img')) {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    const open = () => {
      viewerImage.src = image.currentSrc || image.src;
      viewerImage.alt = image.alt;
      viewerCaption.textContent = image.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
      viewer.showModal();
    };
    image.addEventListener('click', open);
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  }
  viewer.querySelector('[data-close]')?.addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', (event) => {
    if (event.target === viewer) viewer.close();
  });
}

// --- Подсветка текущего раздела в содержании ---
const links = Array.from(document.querySelectorAll('.case-toc a[href^="#"]'));
const sections = links.flatMap((link) => {
  const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  return heading ? [{ link, heading }] : [];
});

if (sections.length) {
  const updateActive = () => {
    const activationLine = window.innerHeight * 0.25;
    let active = sections[0].link;

    for (const { link, heading } of sections) {
      if (heading.getBoundingClientRect().top <= activationLine) active = link;
    }

    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      active = sections[sections.length - 1].link;
    }

    for (const { link } of sections) {
      if (link === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };

  window.addEventListener('scroll', updateActive, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();
}
