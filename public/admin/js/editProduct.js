/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
//   const backendErrors = <%- JSON.stringify(errors || {}) %>;

Object.keys(backendErrors).forEach((field) => {
  showError(field, backendErrors[field]);
});

//       function clearAllErrors() {
//   document.querySelectorAll("[id^='error-']").forEach((p) => {
//     p.textContent = "";
//     p.classList.add("hidden");
//   });
// }

/* ---------------------------
         DELETE PRODUCT
      --------------------------- */
function confirmDelete(productId) {
  Swal.fire({
    title: 'Are you sure?',
    text: 'This action cannot be undone!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = `/admin/deleteProduct?id=${productId}`;
    }
  });
}

// -----------------------------
// Cropper Logic (Page Local)
// -----------------------------
const fileInput = document.getElementById('productImages');
const existingPreviewContainer = document.getElementById(
  'productImagePreviewContainer',
);
const newImagesPreviewContainer = document.getElementById(
  'newImagesPreviewContainer',
);
const oldImagesContainer = document.getElementById('oldImagesContainer');

const cropperModal = document.getElementById('cropperModal');
const cropperImage = document.getElementById('cropperImage');
const cropperConfirmBtn = document.getElementById('cropperConfirmBtn');

let cropper = null;
let pendingFiles = [];
let currentFileIndex = 0;
let newCroppedFiles = []; // { file, url }
let cropMode = null; // "add" | "replace"
let replaceTargetOldUrl = null;

// Handle new images selection
fileInput.addEventListener('change', function (e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  pendingFiles = files;
  currentFileIndex = 0;
  cropMode = 'add';
  fileInput.value = '';

  openCropperForCurrentFile();
});

function openCropperForCurrentFile() {
  if (
    !pendingFiles.length ||
    currentFileIndex < 0 ||
    currentFileIndex >= pendingFiles.length
  ) {
    return;
  }

  const file = pendingFiles[currentFileIndex];
  const imageUrl = URL.createObjectURL(file);

  cropperImage.src = imageUrl;
  cropperModal.classList.remove('hidden');

  cropperImage.onload = function () {
    if (cropper) cropper.destroy();

    cropper = new Cropper(cropperImage, {
      aspectRatio: 3 / 4,
      viewMode: 1,
      autoCropArea: 1,
    });
  };
}

function closeCropperModal() {
  cropperModal.classList.add('hidden');
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

function handleCropCancel() {
  closeCropperModal();
  currentFileIndex++;
  if (currentFileIndex < pendingFiles.length) {
    openCropperForCurrentFile();
  } else {
    pendingFiles = [];
    currentFileIndex = 0;
    cropMode = null;
    replaceTargetOldUrl = null;
  }
}

cropperConfirmBtn.addEventListener('click', function () {
  if (!cropper) return;

  cropperConfirmBtn.disabled = true;
  cropperConfirmBtn.innerText = 'Processing...';

  const canvas = cropper.getCroppedCanvas({
    width: 600,
    height: 800,
  });

  if (!canvas) {
    cropperConfirmBtn.disabled = false;
    cropperConfirmBtn.innerText = 'Crop & Save';
    alert('Something went wrong while cropping.');
    return;
  }

  canvas.toBlob(
    function (blob) {
      cropperConfirmBtn.disabled = false;
      cropperConfirmBtn.innerText = 'Crop & Save';

      if (!blob) {
        alert('Failed to generate cropped image.');
        return;
      }

      const fileName = `product_edit_${Date.now()}_${currentFileIndex + 1}.jpg`;
      const croppedFile = new File([blob], fileName, {
        type: 'image/jpeg',
      });
      const url = URL.createObjectURL(croppedFile);

      const item = { file: croppedFile, url };
      newCroppedFiles.push(item);

      if (cropMode === 'replace' && replaceTargetOldUrl) {
        replaceImage(replaceTargetOldUrl, item);
      } else {
        addNewImagePreview(item);
      }

      closeCropperModal();
      currentFileIndex++;
      if (currentFileIndex < pendingFiles.length) {
        openCropperForCurrentFile();
      } else {
        pendingFiles = [];
        currentFileIndex = 0;
        cropMode = null;
        replaceTargetOldUrl = null;
      }
    },
    'image/jpeg',
    0.9,
  );
});

// Add preview for new cropped images
function addNewImagePreview(item) {
  const box = document.createElement('div');
  box.className = 'relative group w-40 h-56';
  box.dataset.newImageUrl = item.url;

  box.innerHTML = `
          <img src="${item.url}" class="w-full h-full object-cover rounded-lg shadow">
          <button type="button"
            class="absolute bottom-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100">
            Delete
          </button>
        `;

  const deleteBtn = box.querySelector('button');
  deleteBtn.addEventListener('click', function () {
    removeNewImage(item.url);
  });

  newImagesPreviewContainer.appendChild(box);
}

// Remove existing image (old URL)
function removeExistingImage(url) {
  // Remove preview card(s)
  document
    .querySelectorAll(
      `[data-existing-image-url="${CSS.escape ? CSS.escape(url) : url}"]`,
    )
    .forEach((card) => card.remove());

  // Remove hidden input(s)
  if (oldImagesContainer) {
    oldImagesContainer
      .querySelectorAll(`input[value="${url}"]`)
      .forEach((input) => input.remove());
  }
}

// Start replace flow for an existing image
function startReplaceImage(oldUrl) {
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/*';

  picker.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    pendingFiles = [file];
    currentFileIndex = 0;
    cropMode = 'replace';
    replaceTargetOldUrl = oldUrl;

    openCropperForCurrentFile();
  };

  picker.click();
}

// Replace: remove old existing image, add new cropped image
function replaceImage(oldUrl, newItem) {
  removeExistingImage(oldUrl);
  addNewImagePreview(newItem);
}

// Remove a new cropped image
function removeNewImage(url) {
  newCroppedFiles = newCroppedFiles.filter((item) => item.url !== url);

  document
    .querySelectorAll(
      `[data-new-image-url="${CSS.escape ? CSS.escape(url) : url}"]`,
    )
    .forEach((card) => card.remove());
}

// Expose cancel handler for modal close button
window.handleCropCancel = handleCropCancel;
window.startReplaceImage = startReplaceImage;
window.removeExistingImage = removeExistingImage;

function showError(field, message) {
  const el = document.getElementById(`error-${field}`);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError(field) {
  const el = document.getElementById(`error-${field}`);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

function clearAllErrors() {
  document
    .querySelectorAll("[id^='error-']")
    .forEach((p) => p.classList.add('hidden'));
}

const form = document.querySelector('form');

form.addEventListener('submit', function (e) {
  clearAllErrors();
  let hasError = false;

  const {
    productName,
    author,
    publisher,
    yearOfPublishing,
    regularPrice,
    stock,
    discountValue,
    startDate,
    endDate,
    isOffer,
  } = form;

  /* ---------- BASIC ---------- */

  if (!productName.value.trim()) {
    showError('productName', 'Product name is required');
    hasError = true;
  }

  if (!author.value.trim()) {
    showError('author', 'Author is required');
    hasError = true;
  }

  if (!publisher.value.trim()) {
    showError('publisher', 'Publisher is required');
    hasError = true;
  }

  /* ---------- YEAR ---------- */

  if (yearOfPublishing.value) {
    const year = Number(yearOfPublishing.value);
    const currentYear = new Date().getFullYear();

    if (!/^\d{4}$/.test(yearOfPublishing.value)) {
      showError('yearOfPublishing', 'Enter a valid 4-digit year');
      hasError = true;
    } else if (year > currentYear) {
      showError('yearOfPublishing', 'Publishing year cannot be in the future');
      hasError = true;
    }
  }

  /* ---------- NUMBERS ---------- */

  if (!regularPrice.value || Number(regularPrice.value) <= 0) {
    showError('regularPrice', 'Enter a valid price');
    hasError = true;
  }

  if (stock.value === '' || Number(stock.value) < 0) {
    showError('stock', 'Stock cannot be negative');
    hasError = true;
  }

  /* ---------- OFFER ---------- */

  if (isOffer.value === 'true') {
    const discountRaw = discountValue.value.trim();
    const discount = parseInt(discountRaw, 10);

    if (
      !discountRaw ||
      Number.isNaN(discount) ||
      discount < 1 ||
      discount > 95
    ) {
      showError('discountValue', 'Discount must be between 1 and 95%');
      hasError = true;
    }

    if (!startDate.value) {
      showError('startDate', 'Offer start date is required');
      hasError = true;
    }

    if (!endDate.value) {
      showError('endDate', 'Offer end date is required');
      hasError = true;
    }

    if (startDate.value) {
      const start = new Date(startDate.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);

      if (start < today) {
        showError('startDate', 'Start date cannot be in the past');
        hasError = true;
      }
    }

    if (startDate.value && endDate.value) {
      const start = new Date(startDate.value);
      const end = new Date(endDate.value);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (end <= start) {
        showError('endDate', 'End date must be after start date');
        hasError = true;
      }
    }
  }

  /* ---------- IMAGES ---------- */

  const oldImagesCount =
    document.querySelectorAll("input[name='oldImages[]']").length || 0;
  const totalImages = oldImagesCount + newCroppedFiles.length;

  if (totalImages === 0) {
    showError('images', 'At least one product image is required');
    hasError = true;
  }

  /* ---------- STOP SUBMIT ---------- */

  if (hasError) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  /* ---------- ATTACH FILES ---------- */

  const dataTransfer = new DataTransfer();
  newCroppedFiles.forEach((item) => dataTransfer.items.add(item.file));
  fileInput.files = dataTransfer.files;
});
