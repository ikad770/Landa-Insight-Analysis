const buttons = document.querySelectorAll('.screen-btn');
const screens = document.querySelectorAll('.screen');

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.target;

    buttons.forEach((btn) => {
      const active = btn === button;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    screens.forEach((screen) => {
      screen.classList.toggle('active', screen.id === target);
    });
  });
});
