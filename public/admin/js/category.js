/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

// Search logic with Debounce
function applyCategorySearch() {
  const query = document.getElementById('categorySearch').value.trim();
  const params = new URLSearchParams(window.location.search);

  if (query) {
    params.set('search', query);
  } else {
    params.delete('search');
  }

  params.set('page', 1);
  window.location.href = `${window.location.pathname}?${params.toString()}`;
}

function clearCategorySearch() {
  window.location.href = window.location.pathname;
}

document.getElementById('categorySearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyCategorySearch();
});

function confirmDelete(id) {
  Swal.fire({
    title: 'Delete Category?',
    text: 'Deleting this may affect products assigned to it.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Yes, Remove It',
    background: '#ffffff',
    customClass: {
      title: 'font-black uppercase tracking-tight text-gray-800',
      confirmButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-4 px-8',
      cancelButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-4 px-8',
    },
  }).then((res) => {
    if (res.isConfirmed)
      window.location.href = `/admin/deleteCategory?id=${id}`;
  });
}

// Status Handler
window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const box = document.getElementById('statusMessage');

  if (status) {
    const config = {
      added: [
        'Category Created',
        'bg-emerald-50 text-emerald-700 border-emerald-200',
      ],
      deleted: ['Category Removed', 'bg-rose-50 text-rose-700 border-rose-200'],
      updated: [
        'Category Updated',
        'bg-indigo-50 text-indigo-700 border-indigo-200',
      ],
      error: ['Action Failed', 'bg-amber-50 text-amber-700 border-amber-200'],
    };

    if (config[status]) {
      box.textContent = config[status][0].toUpperCase();
      box.className = `${config[status][1]} p-4 rounded-2xl mb-8 text-[10px] font-black tracking-[0.2em] text-center shadow-sm block`;
      setTimeout(() => (box.style.display = 'none'), 4000);
    }
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
};
