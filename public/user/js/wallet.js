/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
function openAddMoneyModal() {
  const m = document.getElementById('addMoneyModal');
  m.classList.replace('hidden', 'flex');
}
function closeAddMoneyModal() {
  const m = document.getElementById('addMoneyModal');
  m.classList.replace('flex', 'hidden');
}

async function addMoneyWithRazorpay() {
  const amount = document.getElementById('walletAmount').value;
  if (!amount || amount <= 0)
    return Swal.fire(
      'Amount required',
      'Enter a valid top-up amount',
      'warning',
    );

  try {
    const res = await fetch('/wallet/create-razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!data.success)
      return Swal.fire('Error', 'Payment gateway is busy', 'error');

    const options = {
      key: RAZO_KEY,
      amount: data.order.amount,
      currency: 'INR',
      name: 'ReadNest Wallet',
      description: 'Digital Wallet Top-up',
      order_id: data.order.id,
      handler: async function (response) {
        const verifyRes = await fetch('/wallet/verify-razorpay-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...response, amount }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          Swal.fire(
            'Success!',
            '₹' + amount + ' added to your wallet.',
            'success',
          ).then(() => location.reload());
        } else {
          Swal.fire('Failed', 'Transaction verification failed', 'error');
        }
      },
      theme: { color: '#312e81' },
    };
    new Razorpay(options).open();
  } catch (err) {
    Swal.fire('Error', 'Could not initiate payment', 'error');
  }
}
