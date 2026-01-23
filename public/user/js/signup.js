/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// Form Reset on back navigation
window.addEventListener('pageshow', (event) => {
  if (
    event.persisted ||
    performance.getEntriesByType('navigation')[0].type === 'back_forward'
  ) {
    document.getElementById('signupForm').reset();
  }
});

// Toggle Password
function togglePassword(id, icon) {
  const field = document.getElementById(id);
  const isPass = field.type === 'password';
  field.type = isPass ? 'text' : 'password';
  icon.classList.toggle('fa-eye', !isPass);
  icon.classList.toggle('fa-eye-slash', isPass);
}

// Error Handling
function showError(id, msg) {
  const el = document.getElementById(id + 'Error');
  el.querySelector('span').textContent = msg;
  el.style.display = 'block';
  document.getElementById(id).classList.add('!border-red-500', '!bg-red-50');
}

function hideError(id) {
  const el = document.getElementById(id + 'Error');
  el.style.display = 'none';
  document.getElementById(id).classList.remove('!border-red-500', '!bg-red-50');
}

// Validation Logic
const validate = {
  name: (val) => val.trim().length >= 3 || 'Name must be at least 3 characters',
  email: (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Enter a valid email',
  password: (val) => {
    if (val.length < 6) return 'Min 6 characters required';
    if (!/[A-Z]/.test(val)) return 'Needs one uppercase letter';
    if (!/[0-9]/.test(val)) return 'Needs one number';
    return true;
  },
};

// Event Listeners
document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('blur', function () {
    if (this.id === 'confirmPassword') {
      const pass = document.getElementById('password').value;
      if (this.value !== pass) showError(this.id, 'Passwords do not match');
      else hideError(this.id);
    } else if (validate[this.id]) {
      const result = validate[this.id](this.value);
      if (result !== true) showError(this.id, result);
      else hideError(this.id);
    }
  });

  input.addEventListener('input', function () {
    hideError(this.id);
  });
});

document.getElementById('signupForm').addEventListener('submit', function (e) {
  let isValid = true;
  ['name', 'email', 'password', 'confirmPassword'].forEach((id) => {
    const input = document.getElementById(id);
    if (id === 'confirmPassword') {
      if (input.value !== document.getElementById('password').value) {
        showError(id, 'Passwords do not match');
        isValid = false;
      }
    } else {
      const result = validate[id](input.value);
      if (result !== true) {
        showError(id, result);
        isValid = false;
      }
    }
  });

  if (!isValid) e.preventDefault();
  else document.getElementById('successMessage').classList.remove('hidden');
});

function googleSignIn() {
  window.location.href = '/auth/google';
}
