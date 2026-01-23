/* eslint-disable no-unused-vars */
function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 10 + 's';
    p.style.animationDuration = Math.random() * 10 + 10 + 's';
    container.appendChild(p);
  }
}
function goHome() {
  window.location.href = '/';
}
function goBack() {
  if (window.history.length > 1) window.history.back();
  else window.location.href = '/';
}
window.addEventListener('load', createParticles);
