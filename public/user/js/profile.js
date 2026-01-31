/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* ======================== MODAL CONTROL ======================== */
function closeSetPasswordModal() {
  document.getElementById('setPassModal').classList.add('hidden');
}
function closeChangePasswordModal() {
  document.getElementById('changePassModal').classList.add('hidden');
}
function closeEmailModal() {
  document.getElementById('emailUpdateModal').classList.add('hidden');
  document.getElementById('emailOtpSection').classList.add('hidden');
}

/* ======================== NAME UPDATE ======================== */
function toggleProfileEdit() {
  const first = document.getElementById('firstName');
  const last = document.getElementById('lastName');
  const lastWrapper = document.getElementById('lastNameWrapper');
  const phone = document.getElementById('phoneInput');
  const btn = document.getElementById('profileEditBtn');

  const isEditMode = first.disabled;

  /* ================= ENTER EDIT MODE ================= */
  if (isEditMode) {
    first.disabled = false;
    phone.disabled = false;

    // Show last name field when editing
    lastWrapper.classList.remove('hidden');
    last.disabled = false;

    btn.textContent = 'Save';
    btn.classList.replace('text-blue-600', 'text-green-600');
    return;
  }

  /* ================= VALIDATION ================= */

  if (!first.value.trim()) {
    Swal.fire('Error', 'First name cannot be empty', 'error');
    return;
  }

  if (first.value.trim().length < 3) {
    Swal.fire('Error', 'First name should have atleast 3 charracters', 'error');
    return;
  }

  const nameRegex = /^[A-Za-z ]+$/;

  if (!nameRegex.test(first.value.trim())) {
    Swal.fire(
      'Invalid First Name',
      'Only letters, spaces  are allowed',
      'error',
    );
    return;
  }

  if (last.value.trim() && !nameRegex.test(last.value.trim())) {
    Swal.fire(
      'Invalid Last Name',
      'Only letters, spaces  are allowed',
      'error',
    );
    return;
  }

  const phoneVal = phone.value.trim();
  if (phoneVal && !/^[0-9]{10}$/.test(phoneVal)) {
    Swal.fire('Invalid Phone', 'Enter a valid 10-digit mobile number', 'error');
    return;
  }

  /* ================= CONFIRM ================= */

  Swal.fire({
    title: 'Confirm Changes?',
    text: 'Update profile information?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#16a34a',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, Save',
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    const res = await fetch('/account/update-profile', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: first.value,
        lastName: last.value,
        phone: phoneVal,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      Swal.fire('Error', data.message, 'error');
      return;
    }

    Swal.fire('Updated!', 'Profile updated successfully', 'success');

    /* ================= EXIT EDIT MODE ================= */
    first.disabled = true;
    phone.disabled = true;
    last.disabled = true;

    // Hide last name again if still empty
    if (!last.value.trim()) {
      lastWrapper.classList.add('hidden');
    }

    btn.textContent = 'Edit';
    btn.classList.replace('text-green-600', 'text-blue-600');
  });
}

/* ======================== PASSWORD VISIBILITY ======================== */
function toggleVisibility(inputId, eyeId) {
  const input = document.getElementById(inputId);
  const eye = document.getElementById(eyeId);

  if (input.type === 'password') {
    input.type = 'text';
    eye.classList.remove('fa-eye');
    eye.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    eye.classList.remove('fa-eye-slash');
    eye.classList.add('fa-eye');
  }
}

/* ======================== OPEN PASSWORD MODALS ======================== */
function openSetPasswordModal() {
  document.getElementById('setPassModal').classList.remove('hidden');
}
function openChangePasswordModal() {
  document.getElementById('changePassModal').classList.remove('hidden');
}

/* ======================== SEND OTP FOR SET PASSWORD ======================== */
function isValidPassword(password) {
  const regex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
  return regex.test(password);
}

function sendOtpForSetPassword() {
  const email = document.getElementById('setPassEmail').value;
  const btn = document.getElementById('sendOtpBtn');

  if (!email.trim()) {
    Swal.fire('Error', 'Email missing!', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Sending...';

  fetch('/account/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      btn.innerText = 'Send OTP';

      if (!data.success) {
        btn.disabled = false;
        Swal.fire('Error', data.message, 'error');
        return;
      }

      Swal.fire('OTP Sent!', 'Check your email.', 'success');

      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');

      document.getElementById('setPassOtpArea').classList.remove('hidden');
    })
    .catch(() => {
      btn.disabled = false;
      btn.innerText = 'Send OTP';
      Swal.fire('Error', 'Server failure.', 'error');
    });
}

/* ======================== SUBMIT SET PASSWORD ======================== */
function submitSetPassword() {
  const email = document.getElementById('setPassEmail').value;
  const otp = document.getElementById('setPassOtp').value;
  const password = document.getElementById('setNewPassword').value;
  const confirmPassword = document.getElementById('setConfirmPassword').value;

  if (!otp || !password || !confirmPassword) {
    Swal.fire('Error', 'All fields required!', 'error');
    return;
  }
  if (password.lenght < 6) {
    swal.fire('Password must have at least 6 characters');
    return;
  }

  if (!isValidPassword(password)) {
    Swal.fire(
      'Weak Password!',
      ' Password should contail atleast 1 number, 1 uppercase and 1 lowercase letter.',
      'error',
    );
    return;
  }

  if (password !== confirmPassword) {
    Swal.fire('Error', 'Passwords do not match!', 'error');
    return;
  }

  fetch('/account/verifypassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, otp, password, confirmPassword }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        Swal.fire('Error', data.message, 'error');
        return;
      }

      Swal.fire('Success!', 'Password updated.', 'success');
      closeSetPasswordModal();
    })
    .catch(() => Swal.fire('Error', 'Server error', 'error'));
}

/* ======================== CHANGE PASSWORD ======================== */
function submitChangePassword() {
  const currentPassword = document.getElementById('currentPass').value;
  const newPassword = document.getElementById('newPass').value;
  const confirmPassword = document.getElementById('confirmPass').value;
  const updateBtn = document.getElementById('updatePassBtn');

  if (!currentPassword || !newPassword || !confirmPassword) {
    Swal.fire('Error', 'All fields required!', 'error');
    return;
  }

  if (currentPassword === newPassword) {
    Swal.fire(
      'Error',
      'New Password should not be same as current Password',
      'error',
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    Swal.fire('Error', 'Passwords do not match', 'error');
    return;
  }

  if (newPassword.lenght < 6) {
    swal.fire('Password must have at least 6 characters');
    return;
  }

  if (!isValidPassword(newPassword)) {
    Swal.fire(
      'Weak Password!',
      ' Password should contail atleast 1 number, 1 uppercase and 1 lowercase letter.',
      'error',
    );
    return;
  }

  updateBtn.disabled = true;
  updateBtn.innerText = 'Updating...';

  fetch('/account/change-password', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmPassword,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      updateBtn.disabled = false;
      updateBtn.innerText = 'Update Password';

      if (!data.success) {
        Swal.fire('Error', data.message, 'error');
        return;
      }

      Swal.fire('Updated!', 'Password changed!', 'success');
      closeChangePasswordModal();
    })
    .catch(() => {
      updateBtn.disabled = false;
      updateBtn.innerText = 'Update Password';
      Swal.fire('Error', 'Server error', 'error');
    });
}

/* ======================== EMAIL UPDATE FLOW ======================== */
function openEmailModal() {
  document.getElementById('emailUpdateModal').classList.remove('hidden');
}

function sendOtpForEmailUpdate() {
  const email = document.getElementById('emailInputField').value.trim();
  const btn = document.getElementById('sendOtpEmailBtn');

  if (!email) {
    Swal.fire('Missing', 'Enter email', 'warning');
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    Swal.fire('Invalid Email', 'Enter a valid email address', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending...';

  fetch('/account/email-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      btn.textContent = 'Send OTP';

      if (!data.success) {
        btn.disabled = false;
        Swal.fire('Error', data.message, 'error');
        return;
      }

      Swal.fire('OTP sent!', 'Check your inbox.', 'success');

      // Disable send OTP completely
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');

      document.getElementById('emailOtpSection').classList.remove('hidden');
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = 'Send OTP';
      Swal.fire('Error', 'Server failure', 'error');
    });
}

function verifyEmailOtp() {
  const otp = document.getElementById('emailOtpInput').value.trim();
  const email = document.getElementById('emailInputField').value.trim();

  if (!otp) {
    Swal.fire('Error', 'OTP required!', 'error');
    return;
  }

  fetch('/account/verify-email-update', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp, email }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        Swal.fire('Error', data.message, 'error');
        return;
      }

      Swal.fire('Success!', 'Email updated!', 'success');

      closeEmailModal();
      setTimeout(() => location.reload(), 1500);
    })
    .catch(() => Swal.fire('Error', 'Server error', 'error'));
}
/* ================= PROFILE IMAGE + CROPPER FIXED CODE ================= */
let cropperProfile = null;
let selectedProfileFile = null;

const profileInput = document.getElementById('profileImageInput');
const cropModal = document.getElementById('cropperModal');
const cropImg = document.getElementById('cropperImage');

const hiddenFileInput = document.getElementById('hiddenProfileImageInput');
const profileForm = document.getElementById('profileImageForm');

profileForm.addEventListener('submit', () => {
  console.log('🔥 FORM SUBMITTED — Backend should receive the image');
});

/* When user selects image */
profileInput.addEventListener('change', (event) => {
  selectedProfileFile = event.target.files[0];
  if (!selectedProfileFile) return;

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  // ❌ If file is not an image → show alert + do NOT open cropper
  if (!allowedTypes.includes(selectedProfileFile.type)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid File Type',
      text: 'Only JPG, JPEG, PNG, and WEBP images are allowed as profile photos.',
    });
    profileInput.value = ''; // clear invalid file
    return; // stop here → do NOT open cropper
  }

  // ✔ If valid image → open cropper
  cropImg.src = URL.createObjectURL(selectedProfileFile);
  cropModal.classList.remove('hidden');

  cropImg.onload = function () {
    if (cropperProfile) cropperProfile.destroy();

    cropperProfile = new Cropper(cropImg, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1,
      background: false,
    });
  };
});

/* Cancel crop */
function cancelCrop() {
  cropModal.classList.add('hidden');

  if (cropperProfile) {
    cropperProfile.destroy();
    cropperProfile = null;
  }

  profileInput.value = '';
}

/* Apply crop and submit to server */
function applyCrop() {
  if (!cropperProfile) return;

  const canvas = cropperProfile.getCroppedCanvas({
    width: 500,
    height: 500,
    imageSmoothingQuality: 'high',
  });

  canvas.toBlob(
    (blob) => {
      const croppedFile = new File([blob], 'profile.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      const dt = new DataTransfer();
      dt.items.add(croppedFile);
      hiddenFileInput.files = dt.files;

      // Submit form
      profileForm.submit();

      // Close cropper modal
      cropModal.classList.add('hidden');
      cropperProfile.destroy();
      cropperProfile = null;
    },
    'image/jpeg',
    0.9,
  );
}

/* DELETE PROFILE IMAGE */
function deleteProfileImage() {
  Swal.fire({
    title: 'Delete Profile Photo?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Delete',
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    const res = await fetch('/account/delete-profile-image', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await res.json();

    if (!data.success) {
      Swal.fire('Error', data.message, 'error');
      return;
    }

    Swal.fire('Deleted!', 'Profile photo removed.', 'success');
    location.reload();
  });
}
