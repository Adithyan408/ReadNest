/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

// Search logic
function searchCustomers() {
  const query = document.getElementById('customerSearch').value.trim();
  const params = new URLSearchParams(window.location.search);

  if (query) params.set('search', query);
  else params.delete('search');

  params.set('page', 1);
  window.location.href = `${window.location.pathname}?${params.toString()}`;
}

function clearCustomerSearch() {
  window.location.href = window.location.pathname;
}

async function confirmAction(userId, action) {
  const isBlock = action === 'block';

  const result = await Swal.fire({
    title: `<span class="uppercase tracking-tighter font-black">${action} user?</span>`,
    text: isBlock
      ? 'This user will lose access to their account immediately.'
      : 'Access will be restored for this user.',
    icon: isBlock ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonColor: isBlock ? '#f43f5e' : '#10b981',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: `YES, ${action.toUpperCase()}`,
    background: '#ffffff',
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`/admin/users/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();

    if (!data.success) throw new Error('Action failed');

    updateUserUI(userId, action);

    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: `User has been ${action}ed successfully`,
      timer: 1200,
      showConfirmButton: false,
    });
  } catch (err) {
    Swal.fire('Error', 'Something went wrong', 'error');
  }
}

function updateUserUI(userId, action) {
  const badge = document.getElementById(`status-${userId}`);
  const btn = document.getElementById(`btn-${userId}`);

  if (!badge || !btn) return;

  if (action === 'block') {
    badge.textContent = 'Blocked';
    badge.className =
      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-rose-50 text-rose-600 border-rose-100';

    btn.textContent = 'Unblock';
    btn.className =
      'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition active:scale-95';
    btn.onclick = () => confirmAction(userId, 'unblock');
  } else {
    badge.textContent = 'Active';
    badge.className =
      'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100';

    btn.textContent = 'Block';
    btn.className =
      'bg-rose-500 hover:bg-rose-600 shadow-rose-100 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition active:scale-95';
    btn.onclick = () => confirmAction(userId, 'block');
  }
}

document.getElementById('customerSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchCustomers();
});
