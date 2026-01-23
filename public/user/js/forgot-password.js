/* eslint-disable no-undef */
const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('email');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

function showError(message) {
  errorText.textContent = message;
  errorMessage.style.display = 'flex';
  emailInput.classList.add('border-red-500');
}

function hideError() {
  errorMessage.style.display = 'none';
  emailInput.classList.remove('border-red-500');
}

form.addEventListener('submit', (e) => {
  const email = emailInput.value.trim();
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    e.preventDefault();
    showError('Please enter your email address.');
  } else if (!pattern.test(email)) {
    e.preventDefault();
    showError('Please enter a valid email address.');
  } else {
    hideError();
  }
});

emailInput.addEventListener('input', hideError);

// Auto-clean URL
const url = new URL(window.location.href);
if (url.searchParams.get('error')) {
  url.searchParams.delete('error');
  window.history.replaceState({}, '', url.toString());
}
