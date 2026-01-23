/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}
function toggleFilterMenu() {
  document.getElementById('filterMenu').classList.toggle('hidden');
}

function searchOrders() {
  const q = document.getElementById('searchInput').value.trim();
  const params = new URLSearchParams(window.location.search);

  if (q) params.set('search', q);
  else params.delete('search');

  params.set('page', 1); // reset pagination
  window.location.href = `/admin/orders?${params.toString()}`;
}

function clearSearch() {
  window.location.href = '/admin/orders';
}

// Close dropdowns on outside click
document.addEventListener('click', function (event) {
  const fw = document.querySelector('.filter-wrapper');
  if (fw && !fw.contains(event.target))
    document.getElementById('filterMenu').classList.add('hidden');
});

document.getElementById('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchOrders();
});
