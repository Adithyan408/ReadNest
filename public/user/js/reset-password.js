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
  }
  document.getElementById(fieldId).classList.add('border-red-500');
}

function hideError(fieldId) {
  const errorElement = document.getElementById(fieldId + 'Error');
  if (errorElement) errorElement.style.display = 'none';
  document.getElementById(fieldId).classList.remove('border-red-500');
}

function checkPasswordStrength(password) {
  const reqs = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  Object.keys(reqs).forEach((key) => {
    document.getElementById(`req-${key}`).classList.toggle('met', reqs[key]);
  });

  let strength = Object.values(reqs).filter(Boolean).length;
  const bar = document.getElementById('strengthBar');
  const txt = document.getElementById('strengthText');

  bar.className = 'strength-bar';
  if (strength === 0) {
    bar.style.width = '0%';
    txt.textContent = '';
  } else if (strength <= 2) {
    bar.classList.add('strength-weak');
    txt.textContent = 'Weak';
    txt.className =
      'text-[10px] font-black uppercase text-red-500 tracking-wider';
  } else if (strength === 3) {
    bar.classList.add('strength-medium');
    txt.textContent = 'Medium';
    txt.className =
      'text-[10px] font-black uppercase text-amber-500 tracking-wider';
  } else {
    bar.classList.add('strength-strong');
    txt.textContent = 'Strong';
    txt.className =
      'text-[10px] font-black uppercase text-emerald-500 tracking-wider';
  }

  return reqs;
}

document.getElementById('newPassword').addEventListener('input', function () {
  checkPasswordStrength(this.value);
  hideError('newPassword');
});

document
  .getElementById('resetPasswordForm')
  .addEventListener('submit', function (e) {
    const pass = document.getElementById('newPassword').value;
    const conf = document.getElementById('confirmPassword').value;
    const requirements = checkPasswordStrength(pass);

    let isValid = true;
    if (Object.values(requirements).includes(false)) {
      showError('newPassword', 'Requirements not met');
      isValid = false;
    }
    if (pass !== conf) {
      showError('confirmPassword', 'Passwords do not match');
      isValid = false;
    }

    if (!isValid) e.preventDefault();
  });
