// Кнопка «Скопировать» у адреса электронной почты.
document.querySelectorAll('.contact-card__copy').forEach((button) => {
  button.addEventListener('click', async () => {
    const text = button.dataset.copy ?? '';
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Скопировано';
    } catch {
      button.textContent = text;
    }
    setTimeout(() => (button.textContent = 'Скопировать'), 2000);
  });
});
