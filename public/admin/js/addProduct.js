/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

const form = document.getElementById('productForm');
const offerToggle = document.getElementById('isOffer');
const offerInputs = document.getElementById('offerInputs');

// Toggle Campaign Inputs
offerToggle.onchange = () =>
  offerInputs.classList.toggle('hidden', offerToggle.value === 'false');

// Validation Helper
function setError(id, msg) {
  const el = document.getElementById(`err-${id}`);
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
    const input = document.getElementById(id);
    if (input) input.classList.add('error-input');
  }
  return false;
}

function clearErrors() {
  document
    .querySelectorAll("[id^='err-']")
    .forEach((el) => el.classList.add('hidden'));
  document
    .querySelectorAll('.error-input')
    .forEach((el) => el.classList.remove('error-input'));
}

// IMAGE CROPPER LOGIC (Enhanced)
const fileInput = document.getElementById('productImageInput');
const previewContainer = document.getElementById('imagePreview');
const cropperModal = document.getElementById('cropperModal');
const cropperImage = document.getElementById('cropperImage');
const cropperConfirmBtn = document.getElementById('cropperConfirmBtn');

let cropper = null;
let pendingFiles = [];
let currentFileIndex = 0;
let croppedFiles = [];

fileInput.addEventListener('change', function (e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  pendingFiles = files;
  currentFileIndex = 0;
  fileInput.value = '';
  openCropper();
});

function openCropper() {
  if (currentFileIndex >= pendingFiles.length) return;
  cropperImage.src = URL.createObjectURL(pendingFiles[currentFileIndex]);
  cropperModal.classList.replace('hidden', 'flex');
  cropperImage.onload = () => {
    if (cropper) cropper.destroy();
    cropper = new Cropper(cropperImage, { aspectRatio: 3 / 4, viewMode: 2 });
  };
}

function handleCropCancel() {
  cropperModal.classList.replace('flex', 'hidden');
  currentFileIndex++;
  openCropper();
}

cropperConfirmBtn.onclick = () => {
  const canvas = cropper.getCroppedCanvas({ width: 600, height: 800 });
  canvas.toBlob(
    (blob) => {
      const file = new File([blob], `book_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      const url = URL.createObjectURL(file);
      croppedFiles.push({ file, url });

      const box = document.createElement('div');
      box.className = 'relative aspect-[3/4]';
      box.innerHTML = `<img src="${url}" class="w-full h-full object-cover rounded-2xl border border-white shadow-sm">
                                 <button type="button" class="absolute -top-2 -right-2 bg-rose-500 text-white w-7 h-7 rounded-full text-xs flex items-center justify-center">✕</button>`;
      box.querySelector('button').onclick = () => {
        croppedFiles = croppedFiles.filter((f) => f.url !== url);
        box.remove();
      };
      previewContainer.appendChild(box);
      handleCropCancel();
    },
    'image/jpeg',
    0.9,
  );
};

// FORM SUBMISSION VALIDATION
form.onsubmit = (e) => {
  clearErrors();
  let isValid = true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Required Fields
  if (!form.productName.value.trim())
    isValid = setError('productName', 'Title is required');
  if (form.description.value.trim().length < 10)
    isValid = setError('description', 'Description too short (min 10 chars)');
  if (!form.category.value) isValid = setError('category', 'Select a category');
  if (!form.language.value)
    isValid = setError('language', 'Language is required');
  if (!form.author.value.trim())
    isValid = setError('author', 'Author name is required');

  // Year Validation
  const year = form.yearOfPublishing.value;
  if (!/^\d{4}$/.test(year) || parseInt(year) > new Date().getFullYear())
    isValid = setError('year', 'Enter a valid year');

  // Price & Stock
  if (parseFloat(form.regularPrice.value) <= 0)
    isValid = setError('price', 'Price must be positive');
  if (parseInt(form.stock.value) < 0)
    isValid = setError('stock', 'Stock cannot be negative');

  // Campaign Validation
  if (form.isOffer.value === 'true') {
    const disc = parseInt(form.discountValue.value);
    if (isNaN(disc) || disc < 1 || disc > 95)
      isValid = setError('discount', 'Discount must be 1% - 95%');

    const start = new Date(form.startDate.value);
    const end = new Date(form.endDate.value);
    if (!form.startDate.value || !form.endDate.value)
      isValid = setError('dates', 'Start and End dates are required');
    else if (start < today)
      isValid = setError('dates', 'Start date cannot be in the past');
    else if (end <= start)
      isValid = setError('dates', 'End date must be after start date');
  }

  // Image Validation
  if (croppedFiles.length === 0)
    isValid = setError('images', 'Add at least one cover image');

  if (!isValid) {
    e.preventDefault();
    Swal.fire({
      icon: 'warning',
      title: 'Check Fields',
      text: 'Please correct the highlighted errors.',
    });
  } else {
    // Attach cropped files to the form
    const dt = new DataTransfer();
    croppedFiles.forEach((item) => dt.items.add(item.file));
    fileInput.files = dt.files;
  }
};
