const switchButtons = document.querySelectorAll('.switch-btn');
const screens = document.querySelectorAll('.screen');

switchButtons.forEach((button) => {
  button.addEventListener('click', () => {
    switchButtons.forEach((btn) => btn.classList.remove('is-active'));
    screens.forEach((screen) => screen.classList.remove('is-visible'));

    button.classList.add('is-active');
    const targetId = button.getAttribute('data-target');
    const targetScreen = document.getElementById(targetId);
    if (targetScreen) {
      targetScreen.classList.add('is-visible');
    }
  });
});
