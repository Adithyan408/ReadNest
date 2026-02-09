/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full');
}

const form = document.getElementById('categoryForm');
const errorMsg = document.getElementById('errorMsg');
const categoryNameInput = document.getElementById('categoryName');

const offerSelect = form.isOffer;
const offerFields = ['discountValue', 'startDate', 'endDate'];

function toggleOfferFields() {
  const enabled = offerSelect.value === 'true';
  offerFields.forEach((name) => {
    form[name].disabled = !enabled;
  });
}

offerSelect.addEventListener('change', toggleOfferFields);
toggleOfferFields();

function normalizeCategory(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}


form.addEventListener('submit', function (e) {
  let hasError = false;
  clearErrors();

  const rawName = categoryNameInput.value;
  const name = rawName.trim();
  const normalizedName = normalizeCategory(rawName);

  const isOffer = offerSelect.value === 'true';
  const discountValue = Number(form.discountValue.value);
  const startDateValue = form.startDate.value;
  const endDateValue = form.endDate.value;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

 categoryNameInput.classList.remove('border-red-500', 'bg-red-50');
  if (!name) {
    hasError = true;
    errorMsg.textContent = 'Please provide a category name.';
    errorMsg.classList.remove('hidden');

    categoryNameInput.classList.add('border-red-500', 'bg-red-50');
  }

  else if (!normalizedName) {
  hasError = true;
  errorMsg.textContent =
    'Category name cannot contain only spaces or special formatting.';
  errorMsg.classList.remove('hidden');

  categoryNameInput.classList.add('border-red-500', 'bg-red-50');
}

  if (isOffer) {
    if (Number.isNaN(discountValue) || discountValue < 5 || discountValue > 95) {
      showError('discountValue', 'Discount must be between 5% and 95%');
      hasError = true;
    }

    if (!startDateValue) {
      showError('startDate', 'Start date is required');
      hasError = true;
    } else {
      const startDate = new Date(startDateValue);
      startDate.setHours(0, 0, 0, 0);

      if (startDate < today) {
        showError('startDate', 'Start date cannot be in the past');
        hasError = true;
      }
    }

    if (!endDateValue) {
      showError('endDate', 'End date is required');
      hasError = true;
    } else if (startDateValue) {
      const startDate = new Date(startDateValue);
      const endDate = new Date(endDateValue);

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (endDate <= startDate) {
        showError('endDate', 'End date must be after start date');
        hasError = true;
      }
    }
  }

  if (hasError) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

function showError(field, message) {
  const el = document.getElementById(`err-${field}`);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearErrors() {
  errorMsg.classList.add('hidden');
  errorMsg.textContent = '';

  document.querySelectorAll("[id^='err-']").forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
}
