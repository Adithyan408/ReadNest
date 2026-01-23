/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// UI Helpers
function togglePassword(id, icon) {
  const field = document.getElementById(id);
  const isPass = field.type === 'password';
  field.type = isPass ? 'text' : 'password';
  icon.classList.toggle('fa-eye', !isPass);
  icon.classList.toggle('fa-eye-slash', isPass);
}

function showError(id, msg) {
  const el = document.getElementById(id + 'Error');
  el.querySelector('span').textContent = msg;
  el.classList.replace('hidden', 'block');
  document.getElementById(id).classList.add('!border-rose-500', '!bg-rose-50');
}

function hideError(id) {
  const el = document.getElementById(id + 'Error');
  if (el) el.classList.replace('block', 'hidden');
  document
    .getElementById(id)
    .classList.remove('!border-rose-500', '!bg-rose-50');
}

function showMainError(msg) {
  const container = document.querySelector('.form-container');
  const el = document.getElementById('errorMessage');
  document.getElementById('errorText').textContent = msg;

  // Show and animate
  el.classList.replace('hidden', 'flex');
  container.classList.add('shake-element');

  // Clean up animation
  setTimeout(() => container.classList.remove('shake-element'), 500);

  // Auto hide message after 5 seconds
  setTimeout(() => {
    el.classList.replace('flex', 'hidden');
  }, 5000);
}

// Logic
document
  .getElementById('adminLoginForm')
  .addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    let isValid = true;

    // Clear previous errors
    hideError('email');
    hideError('password');

    // Validation
    if (!email) {
      showError('email', 'Identity required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('email', 'Invalid format');
      isValid = false;
    }

    if (!password) {
      showError('password', 'Security code required');
      isValid = false;
    } else if (password.length < 6) {
      showError('password', 'Min 6 characters');
      isValid = false;
    }

    if (isValid) {
      const btn = this.querySelector('button');
      const originalText = btn.textContent;
      btn.textContent = 'AUTHORIZING...';
      btn.disabled = true;

      try {
        const response = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        if (data.success) {
          window.location.href = '/admin';
        } else {
          showMainError(data.message || 'Access Denied: Invalid Credentials');
          btn.textContent = originalText;
          btn.disabled = false;
        }
      } catch (error) {
        showMainError('System Error: Gateway Connection Failed');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  });

// Hide specific field errors when typing
document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('input', () => hideError(input.id));
});
