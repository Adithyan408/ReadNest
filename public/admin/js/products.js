/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function applyFilters() {
  const search = document.getElementById('productSearch').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const sort = document.getElementById('sortFilter').value;

  const queryParams = new URLSearchParams();

  if (search) queryParams.set('search', search);
  if (category) queryParams.set('category', category);
  if (sort) queryParams.set('sort', sort);

  queryParams.set('page', 1);

  window.location.href = `/admin/products?${queryParams.toString()}`;
}

const searchInput = document.getElementById('productSearch');
const clearBtn = document.getElementById('clearSearchBtn');

function clearSearch() {
  document.getElementById('productSearch').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('sortFilter').value = '';
  window.location.href = '/admin/products';
}

function confirmDelete(id) {
  Swal.fire({
    title: 'Delete Product?',
    text: 'This removal is permanent and cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    confirmButtonText: 'YES, DELETE',
    customClass: {
      title: 'font-black uppercase tracking-tight',
      confirmButton: 'rounded-xl font-bold uppercase py-4 px-8',
      cancelButton: 'rounded-xl font-bold uppercase py-4 px-8',
    },
  }).then((res) => {
    if (res.isConfirmed) window.location.href = `/admin/deleteProduct?id=${id}`;
  });
}

// Status Logic
window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const box = document.getElementById('statusMessage');
  if (status) {
    const config = {
      added: [
        'Item Published',
        'bg-emerald-50 text-emerald-600 border-emerald-100',
      ],
      deleted: ['Item Deleted', 'bg-rose-50 text-rose-600 border-rose-100'],
      updated: [
        'Item Updated ',
        'bg-indigo-50 text-indigo-600 border-indigo-100',
      ],
    };
    if (config[status]) {
      box.textContent = config[status][0];
      box.className = `${config[status][1]} border p-4 rounded-2xl mb-6 block text-center`;
      setTimeout(() => (box.style.display = 'none'), 4000);
    }
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
};
