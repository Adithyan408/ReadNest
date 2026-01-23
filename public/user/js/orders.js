/* eslint-disable no-undef */
const orderInput = document.getElementById('orderSearch');
const orderClear = document.getElementById('orderClearBtn');

if (orderInput.value.trim() !== '') orderClear.classList.remove('hidden');

function applyOrderSearch() {
  const search = orderInput.value.trim();
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  window.location.href = `/orders?${params.toString()}`;
}

let typingTimer;
orderInput.addEventListener('input', () => {
  clearTimeout(typingTimer);
  orderClear.classList.toggle('hidden', orderInput.value.trim() === '');
  typingTimer = setTimeout(applyOrderSearch, 800);
});

orderInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') applyOrderSearch();
});
orderClear.addEventListener('click', () => {
  window.location.href = '/orders';
});

if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
  if (window.location.search.includes('search'))
    window.location.replace('/orders');
}
