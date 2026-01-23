/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function openEditModal(
  id,
  code,
  discount,
  minPurchase,
  maxDiscount,
  expiry,
  start,
) {
  document.getElementById('edit_id').value = id;
  document.getElementById('edit_code').value = code;
  document.getElementById('edit_discount').value = discount;
  document.getElementById('edit_minPurchase').value = minPurchase;
  document.getElementById('edit_maxDiscount').value = maxDiscount;
  document.getElementById('edit_expiry').value = expiry;
  document.getElementById('edit_start').value = start;
  document.getElementById('editModal').classList.replace('hidden', 'flex');
}

function closeEditModal() {
  document.getElementById('editModal').classList.replace('flex', 'hidden');
}

function confirmDelete(id) {
  Swal.fire({
    title: 'Remove Coupon?',
    text: 'This action will permanently revoke this voucher.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    confirmButtonText: 'Yes, Delete It',
    background: '#ffffff',
    customClass: {
      title: 'font-black uppercase tracking-tight text-gray-800',
      confirmButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-3 px-6',
    },
  }).then((res) => {
    if (res.isConfirmed) window.location.href = '/admin/coupon/delete?id=' + id;
  });
}

function validateEditCoupon() {
  const disc = Number(document.getElementById('edit_discount').value);
  const startStr = document.getElementById('edit_start').value;
  const expiryStr = document.getElementById('edit_expiry').value;
  const code = document.getElementById('edit_code').value.trim();
  const maxD = Number(document.getElementById('edit_maxDiscount').value);

  if (!code || !/^[A-Z0-9]{3,20}$/.test(code)) {
    Swal.fire('Code Required', '3-20 uppercase/numeric chars.', 'warning');
    return false;
  }
  if (isNaN(disc) || disc < 1 || disc > 90) {
    Swal.fire('Invalid Discount', 'Choose between 1-90%', 'warning');
    return false;
  }
  if (maxD < 0) {
    Swal.fire('Invalid Amount', 'Max discount must be positive', 'warning');
    return false;
  }

  const start = new Date(startStr);
  const expiry = new Date(expiryStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!expiryStr) {
    Swal.fire('Date Missing', 'Expiry date is required', 'warning');
    return false;
  }
  if (expiry <= today) {
    Swal.fire('Invalid Expiry', 'Expiry must be a future date', 'warning');
    return false;
  }
  if (startStr && expiry <= start) {
    Swal.fire('Invalid Range', 'Expiry must be after start date', 'warning');
    return false;
  }
  return true;
}

// Auto-hide status message
setTimeout(() => {
  const el = document.getElementById('statusMessage');
  if (el) el.style.display = 'none';
}, 4000);

function searchCoupons() {
  const query = document.getElementById('couponSearch').value.trim();
  const params = new URLSearchParams(window.location.search);

  if (query) params.set('search', query);
  else params.delete('search');

  params.set('page', 1);
  window.location.href = `/admin/coupon?${params.toString()}`;
}

function clearCouponSearch() {
  window.location.href = '/admin/coupon';
}

// Enter key support
document.getElementById('couponSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchCoupons();
});
