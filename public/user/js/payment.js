/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* =====================================================
     GLOBAL STATE (UI ONLY)
  ===================================================== */
let couponValid = true;
let paymentInProgress = false;

/* =====================================================
     COUPON DROPDOWN
  ===================================================== */
function toggleCouponDropdown() {
  document.getElementById('couponDropdown').classList.toggle('hidden');
}

document.addEventListener('click', function (event) {
  const wrapper = document.getElementById('couponWrapper');
  if (!wrapper.contains(event.target)) {
    document.getElementById('couponDropdown').classList.add('hidden');
  }
});

function selectCouponFromList(code) {
  document.getElementById('selectedCouponText').textContent = code;
  document.getElementById('couponCode').value = code;
  document.getElementById('removeCouponBtn').classList.remove('hidden');
  document.getElementById('couponDropdown').classList.add('hidden');
  applyCoupon();
}

/* =====================================================
     APPLY COUPON
  ===================================================== */
function applyCoupon() {
  const coupon = document.getElementById('couponCode').value.trim();
  if (!coupon) {
    Swal.fire('Error', 'Please select a coupon', 'error');
    return;
  }

  fetch('/apply-coupon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coupon }),
  })
    .then((res) => res.json())
    .then((data) => {
      const message = document.getElementById('couponMessage');

      if (!data.success) {
        couponValid = false;
        message.textContent = data.message;
        message.className = 'text-sm mt-2 text-red-600';
        message.classList.remove('hidden');
        Swal.fire('Invalid Coupon', data.message, 'error');
        return;
      }

      couponValid = true;

      document.getElementById('discountAmount').textContent =
        '₹ ' + data.discount;
      document.getElementById('totalAmount').textContent =
        '₹ ' + data.finalAmount;
      document.getElementById('discountBox').classList.remove('hidden');

      message.textContent = 'Coupon applied successfully';
      message.className = 'text-sm mt-2 text-green-600';
      message.classList.remove('hidden');
    });
}

/* =====================================================
     REMOVE COUPON
  ===================================================== */
function removeCoupon(e) {
  e.stopPropagation();

  fetch('/remove-coupon', { method: 'POST' })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) return;

      couponValid = true;

      // Reset coupon UI
      document.getElementById('couponCode').value = '';
      document.getElementById('selectedCouponText').textContent =
        'Select a coupon';
      document.getElementById('removeCouponBtn').classList.add('hidden');
      document.getElementById('couponMessage').classList.add('hidden');

      document.getElementById('discountAmount').textContent = '₹ 0';
      document.getElementById('totalAmount').textContent =
        '₹ ' + data.payableAmount;

      document.getElementById('discountBox').classList.add('hidden');
    });
}

/* =====================================================
     PROCESS PAYMENT
  ===================================================== */
async function processPayment() {
  if (paymentInProgress) return;
  paymentInProgress = true;

  try {
    const method = document.getElementById('paymentMethod').value;

    if (!method) {
      paymentInProgress = false;
      Swal.fire('Wait!', 'Please select a payment method', 'warning');
      return;
    }

    if (!couponValid) {
      paymentInProgress = false;
      Swal.fire(
        'Coupon Error',
        'Cannot continue due to invalid coupon',
        'error',
      );
      return;
    }

    /* ===============================
       3️⃣ SAVE PAYMENT METHOD
    =============================== */
    await fetch('/save-payment-method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method }),
    });

    /* ===============================
       4️⃣ COD
    =============================== */
    if (method === 'COD') {
      const total = Number(
        document
          .getElementById('totalAmount')
          .textContent.replace('₹', '')
          .trim(),
      );

      if (total > 1000) {
        paymentInProgress = false;
        Swal.fire(
          'COD Not Available',
          'Cash on Delivery is not allowed for orders above ₹1000',
          'warning',
        );
        return;
      }

      window.location.href = '/place-order?payment=COD';
      return;
    }

    /* ===============================
       5️⃣ WALLET
    =============================== */
    if (method === 'WALLET') {
      const res = await fetch('/pay-with-wallet', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        paymentInProgress = false;
        Swal.fire('Wallet Error', data.message, 'error');
        return;
      }

      window.location.href = '/place-order?payment=WALLET';
      return;
    }

    /* ===============================
       6️⃣ RAZORPAY
    =============================== */
    if (method === 'Razorpay') {
      const res = await fetch('/create-razorpay-order', { method: 'POST' });
      const { success, order, message } = await res.json();

      if (!success) {
        paymentInProgress = false;
        Swal.fire('Error', message || 'Payment expired', 'error');
        return;
      }

      const options = {
        key: '<%= process.env.RAZO_API_KEY %>',
        amount: order.amount,
        currency: 'INR',
        name: 'ReadNest',
        description: 'Order Payment',
        order_id: order.id,

        handler: async function (response) {
          try {
            const verify = await fetch('/verify-razorpay-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });

            const result = await verify.json();
            window.location.href = result.success
              ? '/place-order?payment=Razorpay'
              : '/payment-failed?reason=Payment cancelled&paymentMethod=Razorpay';
          } catch {
            window.location.href =
              '/payment-failed?reason=Verification error&paymentMethod=Razorpay';
          }
        },

        modal: {
          ondismiss: function () {
            window.location.href =
              '/payment-failed?reason=Payment cancelled&paymentMethod=Razorpay';
          },
        },

        theme: { color: '#2563eb' },
      };

      new Razorpay(options).open();
    }
  } catch (err) {
    console.error('Payment error:', err);
    paymentInProgress = false;
    Swal.fire('Error', 'Something went wrong. Please try again.', 'error');
  }
}

/* =====================================================
     RESTORE STATE ON RETRY
  ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const coupon = "<%= appliedCoupon || '' %>";
  const discount = Number('<%= discount || 0 %>');
  const total = Number('<%= payableAmount %>');
  const method = "<%= selectedPaymentMethod || '' %>";

  if (coupon) {
    couponValid = true;
    document.getElementById('selectedCouponText').textContent = coupon;
    document.getElementById('couponCode').value = coupon;
    document.getElementById('removeCouponBtn').classList.remove('hidden');
    document.getElementById('discountAmount').textContent = '₹ ' + discount;
    document.getElementById('totalAmount').textContent = '₹ ' + total;
    document.getElementById('discountBox').classList.remove('hidden');
  }

  if (method) {
    document.getElementById('paymentMethod').value = method;
  }
});
