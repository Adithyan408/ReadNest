/* eslint-disable no-unused-vars */
// ... (downloadInvoice, showInvoiceInfo, confirmCancel, confirmFullOrderCancel, confirmReturn JS logic stays the same)
function showInvoiceInfo() {
  Swal.fire({
    icon: 'info',
    title: 'Invoice not available',
    text: 'Invoice will be available after at least one item is delivered.',
  });
}

async function downloadInvoice(orderId) {
  try {
    const res = await fetch(`/orders/${orderId}/invoice`);
    if (!res.ok) {
      const data = await res.json();
      return Swal.fire({ icon: 'info', title: 'Wait!', text: data.message });
    }
    window.location.href = `/orders/${orderId}/invoice`;
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Please try again later.',
    });
  }
}

function confirmCancel(orderId, itemId) {
  Swal.fire({
    title: 'Cancel this item?',
    text: 'This action is permanent.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Yes, cancel it',
  }).then(async (result) => {
    if (!result.isConfirmed) return;
    const res = await fetch(`/orders/${orderId}/items/${itemId}/cancel`, {
      method: 'POST',
    });
    if (res.ok) location.reload();
    else {
      const d = await res.json();
      Swal.fire({ icon: 'info', title: 'Action restricted', text: d.message });
    }
  });
}

function confirmFullOrderCancel(orderId) {
  Swal.fire({
    title: 'Cancel entire order?',
    text: 'All remaining items will be cancelled.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Yes, cancel order',
  }).then(async (result) => {
    if (!result.isConfirmed) return;
    const res = await fetch(`/orders/${orderId}/cancel`, { method: 'POST' });
    if (res.ok) location.reload();
  });
}

function confirmReturn(orderId, itemId) {
  Swal.fire({
    title: 'Return Item',
    input: 'textarea',
    inputLabel: 'Why are you returning this?',
    inputPlaceholder: 'Reason for return...',
    showCancelButton: true,
    inputValidator: (v) => {
      if (!v) return 'Please provide a reason!';
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `/orders/${orderId}/items/${itemId}/return`;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'returnReason';
      input.value = result.value;
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    }
  });
}
