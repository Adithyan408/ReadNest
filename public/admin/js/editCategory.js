/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

// -----------------------------
// Sidebar Toggle (Mobile)
// -----------------------------
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

// -----------------------------
// Delete Category (SweetAlert)
// -----------------------------
function confirmDelete(id) {
  Swal.fire({
    title: 'Remove Category?',
    text: 'This action will affect all products in this category and cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Yes, Delete It',
    cancelButtonText: 'Cancel',
    background: '#ffffff',
    customClass: {
      title: 'font-black uppercase tracking-tight text-gray-800',
      confirmButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-4 px-8',
      cancelButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-4 px-8',
    },
  }).then((res) => {
    if (res.isConfirmed) {
      window.location.href = `/admin/deleteCategory?id=${id}`;
    }
  });
}

// -----------------------------
// Form & Elements
// -----------------------------
const form = document.getElementById('categoryForm');
const categoryNameInput = document.getElementById('categoryName');

const offerSelect = form.isOffer;
const offerFields = ['discountValue', 'startDate', 'endDate'];

// -----------------------------
// Enable / Disable Offer Fields
// -----------------------------
function toggleOfferFields() {
  const enabled = offerSelect.value === 'true';
  offerFields.forEach((name) => {
    form[name].disabled = !enabled;
  });
}

offerSelect.addEventListener('change', toggleOfferFields);
toggleOfferFields(); // run once on page load

// -----------------------------
// Form Validation
// -----------------------------
form.addEventListener('submit', function (e) {
  let hasError = false;
  clearErrors();

  const categoryName = categoryNameInput.value.trim();
  const isOffer = offerSelect.value === 'true';

  const discountValue = Number(form.discountValue.value);
  const startDateValue = form.startDate.value;
  const endDateValue = form.endDate.value;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ---------- CATEGORY NAME ---------- */
   function normalizeCategory(name) {
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .trim();
  }

  const normalizedName = normalizeCategory(categoryName);

  if (!categoryName) {
    showError('categoryName', 'Category name is required');
    categoryNameInput.classList.add('border-red-500', 'bg-red-50');
    hasError = true;
  } else if (!normalizedName) {
    showError('categoryName', 'Invalid category name format');
    categoryNameInput.classList.add('border-red-500', 'bg-red-50');
    hasError = true;
  }

   if (hasError) {
    setTimeout(() => {
      categoryNameInput.classList.remove('border-red-500', 'bg-red-50');
    }, 2000);
  }


  /* ---------- OFFER VALIDATION ---------- */
  if (isOffer) {
    // Discount
    if (
      Number.isNaN(discountValue) ||
      discountValue < 5 ||
      discountValue > 95
    ) {
      showError('discountValue', 'Discount must be between 5% and 95%');
      hasError = true;
    }

    // Start Date
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

    // End Date
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

  /* ---------- STOP SUBMIT ---------- */
  if (hasError) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// -----------------------------
// Helpers
// -----------------------------
function showError(field, message) {
  const el = document.getElementById(`err-${field}`);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearErrors() {
  document.querySelectorAll("[id^='err-']").forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
}
