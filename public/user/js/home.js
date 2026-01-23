/* eslint-disable no-undef */
/* MOBILE SORT */
document.getElementById('mobileSort')?.addEventListener('change', (e) => {
  const params = new URLSearchParams(window.location.search);
  if (e.target.value) params.set('sort', e.target.value);
  else params.delete('sort');
  window.location.search = params.toString();
});

/* MOBILE LANGUAGE AUTO APPLY */
document.getElementById('mobileLanguage')?.addEventListener('change', (e) => {
  const params = new URLSearchParams(window.location.search);
  params.delete('languages');
  if (e.target.value) params.append('languages', e.target.value);
  window.location.search = params.toString();
});

/* DESKTOP LANGUAGE AUTO APPLY */
document.querySelectorAll('.desktop-lang').forEach((cb) => {
  cb.addEventListener('change', () => {
    document.getElementById('desktopLanguageForm').submit();
  });
});

/* DESKTOP SORT AUTO APPLY */
document
  .querySelectorAll('#desktopSortForm input[name="sort"]')
  .forEach((r) => {
    r.addEventListener('change', () => {
      document.getElementById('desktopSortForm').submit();
    });
  });
document.getElementById('priceFilterForm')?.addEventListener('submit', (e) => {
  const minInput = document.getElementById('minPrice');
  const maxInput = document.getElementById('maxPrice');
  const errorEl = document.getElementById('priceError');

  const min = minInput.value.trim();
  const max = maxInput.value.trim();

  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  const minVal = min !== '' ? Number(min) : null;
  const maxVal = max !== '' ? Number(max) : null;

  if ((minVal !== null && minVal < 0) || (maxVal !== null && maxVal < 0)) {
    e.preventDefault();
    errorEl.textContent = 'Price cannot be a negative value.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (minVal !== null && maxVal !== null && minVal > maxVal) {
    e.preventDefault();
    errorEl.textContent = 'Minimum price cannot be greater than maximum price.';
    errorEl.classList.remove('hidden');
    return;
  }

});
