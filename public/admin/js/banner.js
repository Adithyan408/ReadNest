/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

// Search logic
function searchBanners() {
  const query = document.getElementById('bannerSearch').value.trim();
  const params = new URLSearchParams(window.location.search);

  if (query) params.set('search', query);
  else params.delete('search');

  params.set('page', 1);
  window.location.href = `${window.location.pathname}?${params.toString()}`;
}

function clearBannerSearch() {
  window.location.href = window.location.pathname;
}

// Delete Handler
function confirmDelete(id) {
  Swal.fire({
    title: 'Remove Banner?',
    text: 'This promotion will be permanently removed from the storefront.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Yes, Delete It',
    background: '#ffffff',
    customClass: {
      title: 'font-black uppercase tracking-tight text-gray-800',
      confirmButton: 'rounded-xl font-bold uppercase tracking-widest text-xs',
      cancelButton: 'rounded-xl font-bold uppercase tracking-widest text-xs',
    },
  }).then((res) => {
    if (res.isConfirmed) window.location.href = `/admin/deleteBanner?id=${id}`;
  });
}

// URL Status Handling
window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const box = document.getElementById('statusMessage');

  if (status) {
    const config = {
      added: [
        'Banner Active!',
        'bg-emerald-100 text-emerald-700 border border-emerald-200',
      ],
      deleted: [
        'Banner Removed',
        'bg-rose-100 text-rose-700 border border-rose-200',
      ],
      updated: [
        'Banner Updated',
        'bg-indigo-100 text-indigo-700 border border-indigo-200',
      ],
      error: [
        'Operation Failed',
        'bg-amber-100 text-amber-700 border border-amber-200',
      ],
    };

    if (config[status]) {
      box.textContent = config[status][0];
      box.className = `${config[status][1]} p-4 rounded-2xl mb-6 text-sm font-black uppercase tracking-widest text-center shadow-sm`;
      box.classList.remove('hidden');
      setTimeout(() => box.classList.add('hidden'), 4000);
    }

    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
};

document.getElementById('bannerSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBanners();
});
