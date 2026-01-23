/* eslint-disable no-unused-vars */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full');
}

document.getElementById('couponForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const form = e.target;
  const code = form.code.value.trim();
  const discount = form.discount.value;
  const minPurchase = form.minPurchase.value;
  const maxDiscount = form.maxDiscount.value;
  const expiry = form.expiry.value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!code || !/^[A-Z0-9]{3,20}$/.test(code)) {
    return Swal.fire(
      'Error',
      'Valid code required (3-20 uppercase/numbers)',
      'warning',
    );
  }
  if (!discount || discount < 1 || discount > 90) {
    return Swal.fire('Error', 'Discount must be between 1% and 90%', 'warning');
  }
  if (!maxDiscount || maxDiscount < 0) {
    return Swal.fire(
      'Error',
      'Please set a valid Maximum Discount cap',
      'warning',
    );
  }
  if (!expiry || new Date(expiry) <= today) {
    return Swal.fire('Error', 'Expiry must be a future date', 'warning');
  }

  form.submit();
});
