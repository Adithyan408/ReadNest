/* eslint-disable no-unused-vars */
function togglePassword(fieldId, icon) {
  const field = document.getElementById(fieldId);
  field.type = field.type === 'password' ? 'text' : 'password';
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
}

function showError(fieldId, message) {
  const errorElement = document.getElementById(fieldId + 'Error');
  if (errorElement) {
    errorElement.querySelector('span').textContent = message;
    errorElement.style.display = 'block';
    document.getElementById(fieldId).classList.add('border-red-500');
  }
}

function hideError(fieldId) {
  const errorElement = document.getElementById(fieldId + 'Error');
  if (errorElement) {
    errorElement.style.display = 'none';
    document.getElementById(fieldId).classList.remove('border-red-500');
  }
}

function googleSignIn() {
  window.location.href = '/auth/google';
}

// Logic for auto-submitting on Enter and basic front-end validation
document.getElementById('loginForm').addEventListener('submit', function (e) {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  let isValid = true;

  if (!email.includes('@')) {
    showError('email', 'Please enter a valid email');
    isValid = false;
  }
  if (password.length < 6) {
    showError('password', 'Password is too short');
    isValid = false;
  }

  if (!isValid) e.preventDefault();
});

// Clear error on input
document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('input', () => hideError(input.id));
});
