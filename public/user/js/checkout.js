/* eslint-disable no-unused-vars */
const CHECKOUT_ITEMS = JSON.parse(
  document.getElementById('checkout-cart').textContent,
);
const ALL_ADDRESSES = JSON.parse(
  document.getElementById('addresses-data').textContent || '[]',
);

function toggleModal(id) {
  const el = document.getElementById(id);
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) el.classList.add('flex');
  else el.classList.remove('flex');
}

function toggleModals(hideId, showId) {
  toggleModal(hideId);
  toggleModal(showId);
}

function updateCheckoutQty(productId, change) {
  const qtyField = document.getElementById('qty-' + productId);
  const stock = parseInt(document.getElementById('stock-' + productId).value);
  const unit = parseInt(
    document.getElementById('unitPrice-' + productId).value,
  );
  const priceField = document.getElementById('price-' + productId);
  let qty = parseInt(qtyField.value);

  if (change === -1 && qty <= 1) return;

  if (change === 1 && qty >= stock) {
    return Swal.fire('Stock Limit', `Only ${stock} units available`, 'warning');
  }

  qty += change;
  qtyField.value = qty;
  priceField.textContent = '₹ ' + (qty * unit).toLocaleString();

  // 🔥 UPDATE DB (THIS FIXES YOUR ISSUE)
  fetch('/checkout/update-quantity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId,
      quantity: qty,
    }),
  });

  updateTotalsRight();
}

function updateTotalsRight() {
  let total = 0;
  CHECKOUT_ITEMS.forEach((item) => {
    const q = document.getElementById('qty-' + item._id);
    total += (q ? parseInt(q.value) : item.quantity) * Number(item.price);
  });
  document.getElementById('rs-total').textContent =
    '₹ ' + total.toLocaleString();
}

function setSelectedAddress() {
  const selected = document.querySelector(
    "input[name='chooseAddress']:checked",
  );
  if (!selected) return Swal.fire('Required', 'Select an address', 'info');
  fetch('/set-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addressId: selected.value }),
  })
    .then((res) => res.json())
    .then((data) => data.success && location.reload());
}

function saveNewAddress() {
  const data = {
    addressLabel: document.getElementById('add_addrLabel').value,
    houseName: document.getElementById('add_addrHouseName').value.trim(),
    houseNumber: document.getElementById('add_addrHouseNumber').value.trim(),
    street: document.getElementById('add_addrStreet').value.trim(),
    post: document.getElementById('add_addrPost').value.trim(),
    district: document.getElementById('add_addrDistrict').value.trim(),
    state: document.getElementById('add_addrState').value.trim(),
    pincode: document.getElementById('add_addrPincode').value.trim(),
    phone: document.getElementById('add_addrPhone').value.trim(),
    altPhone: document.getElementById('add_addrAltPhone').value.trim(),
  };
  if (Object.values(data).some((v) => v === ''))
    return Swal.fire('Required', 'All fields are mandatory', 'warning');

  if (data.phone && data.altPhone && data.phone === data.altPhone) {
    Swal.fire(
      'Invalid Phone Numbers',
      'Phone number and alternate phone number cannot be the same.',
      'warning',
    );
    return;
  }
  const homeExists = homeAddressExists();
  if (homeExists && data.addressLabel === 'Home') {
    Swal.fire('Not Allowed', 'You already have a Home address.', 'warning');
    return;
  }
  fetch('/add-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((d) => d.success && location.reload());
}

function openEditAddressModal(addressId) {
  const addr = ALL_ADDRESSES.find((a) => a._id === addressId);
  if (!addr) return;
  document.getElementById('edit_addressId').value = addr._id;
  document.getElementById('edit_addrLabel').value = addr.addressLabel;
  document.getElementById('edit_addrHouseName').value = addr.houseName;
  document.getElementById('edit_addrHouseNumber').value = addr.houseNumber;
  document.getElementById('edit_addrStreet').value = addr.street;
  document.getElementById('edit_addrPost').value = addr.post;
  document.getElementById('edit_addrDistrict').value = addr.district;
  document.getElementById('edit_addrState').value = addr.state;
  document.getElementById('edit_addrPincode').value = addr.pincode;
  document.getElementById('edit_addrPhone').value = addr.phone;
  document.getElementById('edit_addrAltPhone').value = addr.altPhone || '';
  toggleModal('editAddressModal');
}

function saveEditedAddress() {
  const data = {
    addressId: document.getElementById('edit_addressId').value,
    addressLabel: document.getElementById('edit_addrLabel').value,
    houseName: document.getElementById('edit_addrHouseName').value.trim(),
    houseNumber: document.getElementById('edit_addrHouseNumber').value.trim(),
    street: document.getElementById('edit_addrStreet').value.trim(),
    post: document.getElementById('edit_addrPost').value.trim(),
    district: document.getElementById('edit_addrDistrict').value.trim(),
    state: document.getElementById('edit_addrState').value.trim(),
    pincode: document.getElementById('edit_addrPincode').value.trim(),
    phone: document.getElementById('edit_addrPhone').value.trim(),
    altPhone: document.getElementById('edit_addrAltPhone').value.trim(),
  };
  if (Object.values(data).some((v) => v === ''))
    return Swal.fire('Required', 'All fields are mandatory', 'warning');

  if (data.phone && data.altPhone && data.phone === data.altPhone) {
    Swal.fire(
      'Invalid Phone Numbers',
      'Phone number and alternate phone number cannot be the same.',
      'warning',
    );
    return;
  }
  const homeExists = homeAddressExists(data.addressId);
  if (homeExists && data.addressLabel === 'Home') {
    Swal.fire('Not Allowed', 'You already have a Home address.', 'warning');
    return;
  }
  fetch('/save-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((d) => d.success && location.reload());
}

async function proceedToPayment() {
  if (ALL_ADDRESSES.length === 0) {
    return Swal.fire(
      'No Address',
      'Please add a delivery address before proceeding.',
      'warning',
    );
  }

  try {
    const res = await fetch('/cart/validate');
    const data = await res.json();

    if (!res.ok) {
      return Swal.fire('Error', data.message || 'Validation failed', 'error');
    }

    // 🚫 Unavailable items removed
    if (data.removedCount > 0) {
      const listHtml = (data.unavailableItems || [])
        .map((item) => {
          let reasonText = 'Unavailable';

          if (item.reason === 'OUT_OF_STOCK') {
            reasonText = 'Out of stock';
          } else if (item.reason === 'PRODUCT_UNLISTED') {
            reasonText = 'Product is no longer available';
          } else if (item.reason === 'CATEGORY_BLOCKED') {
            reasonText = 'Category is currently unavailable';
          }

          return `<li><b>${item.name}</b> – ${reasonText}</li>`;
        })
        .join('');

      return Swal.fire({
        title: 'Items Unavailable',
        html: `
      <p class="mb-2">Some items in your cart cannot be purchased:</p>
      <ul class="text-left list-disc pl-5">
        ${listHtml}
      </ul>
    `,
        icon: 'warning',
        confirmButtonText: 'Refresh Cart',
      }).then(() => location.reload());
    }

    // ✅ All good → proceed
    window.location.href = '/checkout/payment';
  } catch (err) {
    Swal.fire('Error', 'Cart validation failed. Please try again.', 'error');
  }
}

function homeAddressExists(excludeId = null) {
  return ALL_ADDRESSES.some((addr) => {
    if (excludeId && addr._id === excludeId) return false;
    return addr.addressLabel === 'Home';
  });
}

updateTotalsRight();
