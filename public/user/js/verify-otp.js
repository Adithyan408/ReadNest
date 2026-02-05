/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */


const otpInputs = document.querySelectorAll('.otp-input');
const confirmBtn = document.getElementById('confirmBtn');
const timerElement = document.getElementById('timer');
const resendLink = document.getElementById('resendLink');
let timeLeft = 60;
let timerInterval;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  startTimer();
  setupOTPLogic();
  otpInputs[0].focus();
});

function startTimer() {
  resendLink.disabled = true;
  resendLink.classList.add('opacity-50');
  timeLeft = 60;
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerElement.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      resendLink.disabled = false;
      resendLink.classList.remove('opacity-50');
    }
  }, 1000);
}

function setupOTPLogic() {
  otpInputs.forEach((input, index) => {
    // Input handling
    input.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!/^\d$/.test(value)) {
        e.target.value = '';
        return;
      }
      if (value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
    });

    // Backspace handling
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });

    // Paste handling
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const data = e.clipboardData.getData('text').split('');
      otpInputs.forEach((inp, i) => {
        if (data[i] && /^\d$/.test(data[i])) inp.value = data[i];
      });
      otpInputs[Math.min(data.length, 5)].focus();
    });
  });
}
const { forgotPass, email } = window.APP_CONFIG;


async function verifyCode() {
  const otp = Array.from(otpInputs)
    .map((i) => i.value)
    .join('');
  if (otp.length < 6) {
    showError('Enter all 6 digits');
    otpInputs.forEach((i) => !i.value && i.classList.add('error'));
    setTimeout(
      () => otpInputs.forEach((i) => i.classList.remove('error')),
      500,
    );
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'VERIFYING...';

  try {
    const res = await fetch(
      forgotPass ? '/forgot-verify-otp' : '/verify-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      },
    );
    const data = await res.json();

    if (data.success) {
      showSuccess(data.message || 'Identity Verified!');
      setTimeout(() => {
        window.location.href = forgotPass
          ? `/reset-password?email=${encodeURIComponent('<%= email %>')}`
          : '/';
      }, 1000);
    } else {
      showError(data.message || 'Invalid Code');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Code';
      otpInputs.forEach((i) => {
        i.value = '';
        i.classList.add('error');
      });
      otpInputs[0].focus();
      setTimeout(
        () => otpInputs.forEach((i) => i.classList.remove('error')),
        500,
      );
    }
  } catch (err) {
    showError('Connection failed');
    confirmBtn.disabled = false;
  }
}

async function resendCode() {
  if (resendLink.disabled) return;
  try {
    showSuccess('Requesting new code...');
    const res = await fetch('/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '<%= email %>' }),
    });
    if (res.ok) {
      showSuccess('New code sent!');
      startTimer();
    } else showError('Resend limit reached');
  } catch (err) {
    showError('Error resending');
  }
}

function showError(msg) {
  const el = document.getElementById('errorMessage');
  document.getElementById('errorText').textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function showSuccess(msg) {
  const el = document.getElementById('successMessage');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}
