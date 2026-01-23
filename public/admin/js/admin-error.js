function goDashboard() {
  window.location.href = '/admin';
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = '/admin';
}

// Hotkeys for Admin Efficiency
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'h') goDashboard();
  if (e.key.toLowerCase() === 'b' || e.key === 'Escape') goBack();
});
