/* eslint-disable no-unused-vars */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function toggleItemStatusMenu(itemId) {
  const menu = document.getElementById(`item-menu-${itemId}`);
  const isHidden = menu.classList.contains('hidden');
  document
    .querySelectorAll("[id^='item-menu-']")
    .forEach((m) => m.classList.add('hidden'));
  if (isHidden) menu.classList.remove('hidden');
}

async function updateItemStatus(orderId, itemId, newStatus) {
  const { isConfirmed } = await Swal.fire({
    title: 'Confirm Status Change',
    text: `Transition manifest item to: ${newStatus.toUpperCase()}`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4f46e5',
    confirmButtonText: 'Confirm',
  });

  if (isConfirmed) {
    try {
      const res = await fetch(
        `/admin/orders/${orderId}/items/${itemId}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const data = await res.json();
      if (data.success) location.reload();
      else Swal.fire('Error', data.message, 'error');
    } catch (err) {
      Swal.fire('System Error', 'Connection lost', 'error');
    }
  }
}

async function approveReturn(orderId, itemId) {
  const { isConfirmed } = await Swal.fire({
    title: 'Approve Return Request',
    text: 'Stock will be incremented and customer will be refunded.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
  });
  if (isConfirmed) {
    const res = await fetch(
      `/admin/orders/${orderId}/items/${itemId}/approve-return`,
      { method: 'POST' },
    );
    const data = await res.json();
    if (data.success) location.reload();
  }
}

async function rejectReturn(orderId, itemId) {
  const { value: reason } = await Swal.fire({
    title: 'Reject Return',
    input: 'text',
    inputLabel: 'Provide a reason for rejection',
    inputPlaceholder: 'Reason...',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
  });
  if (reason) {
    const res = await fetch(
      `/admin/orders/${orderId}/items/${itemId}/reject-return`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: reason }),
      },
    );
    const data = await res.json();
    if (data.success) location.reload();
  }
}

window.onclick = (e) => {
  if (!e.target.closest('[id^="item-badge-"]')) {
    document
      .querySelectorAll("[id^='item-menu-']")
      .forEach((m) => m.classList.add('hidden'));
  }
};
