/* eslint-disable no-unused-vars */
document.addEventListener('DOMContentLoaded', () => {
  const CART_DATA = JSON.parse(
    document.getElementById('cart-data').textContent,
  );

  window.updateQuantity = function (productId, change) {
    const qtyField = document.getElementById('quantity-' + productId);
    const stock = parseInt(document.getElementById('stock-' + productId).value);
    let qty = parseInt(qtyField.value);

    if (change === 1 && qty >= stock) {
      return Swal.fire(
        'Out of Stock',
        `Only ${stock} units available.`,
        'warning',
      );
    }
    if (change === 1 && qty >= 10) {
      return Swal.fire('Limit Reached', 'Max 10 units per order.', 'warning');
    }

    qty += change;
    if (qty < 1) return;

    qtyField.value = qty;

    fetch('/update-cart-quantity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: qty }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          Swal.fire('Error', data.message, 'error');
          qtyField.value = qty - change;
        } else {
          updateTotals();
        }
      });
  };

  function updateTotals() {
    let subtotal = 0;
    let totalItemsCount = 0;
    CART_DATA.forEach((item) => {
      const field = document.getElementById('quantity-' + item._id);
      if (field) {
        const q = parseInt(field.value);
        subtotal += item.price * q;
        totalItemsCount += q;
      }
    });
    document.getElementById('total-items').textContent = totalItemsCount;
    document.getElementById('subtotal').textContent =
      subtotal.toLocaleString('en-IN');
    document.getElementById('total').textContent =
      subtotal.toLocaleString('en-IN');
  }

  window.removeItem = function (id) {
    window.location.href = `/remove-from-cart?id=${id}`;
  };

  updateTotals();
});

async function proceedToCheckout() {
  try {
    const res = await fetch('/cart/validate');

    if (res.status === 401) {
      return (window.location.href = '/login');
    }

    const data = await res.json();

    if (!res.ok) {
      return Swal.fire({
        icon: 'warning',
        title: 'Wait!',
        text: data.message || 'Unable to proceed',
      });
    }

    if (data.removedCount > 0) {
      const messageHtml = `
        <p class="mb-2">Some items in your cart are unavailable:</p>
        <ul class="text-left list-disc pl-5">
          ${(data.unavailableItems || [])
            .map((item) => {
              let reasonText = 'Unavailable';

              if (item.reason === 'PRODUCT_UNLISTED') {
                reasonText = 'Product is no longer available';
              } else if (item.reason === 'CATEGORY_BLOCKED') {
                reasonText = 'Category is currently unavailable';
              } else if (item.reason === 'OUT_OF_STOCK') {
                reasonText = 'Out of stock';
              }

              return `<li><b>${item.name}</b> – ${reasonText}</li>`;
            })
            .join('')}
        </ul>
      `;

      return Swal.fire({
        icon: 'warning',
        title: 'Cart Updated',
        html: messageHtml,
        confirmButtonText: 'Review Cart',
      }).then(() => location.reload());
    }

    window.location.href = '/checkout';
  } catch (err) {
    Swal.fire('Error', 'Validation failed. Please try again.', 'error');
  }
}
