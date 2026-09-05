const button = document.getElementById('status-reload');
if (button instanceof HTMLButtonElement) {
  button.addEventListener('click', () => {
    location.reload();
  });
}
