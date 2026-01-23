/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

// Update Main Image & Active Thumbnail
function changeMainImage(src, event) {
  const mainImage = document.getElementById('mainImage');
  mainImage.src = src;
  mainImage.setAttribute('data-zoom', src);

  document
    .querySelectorAll('.flex-row img, .flex-col img')
    .forEach((img) => img.classList.remove('thumbnail-active'));
  event.target.classList.add('thumbnail-active');

  if (window.innerWidth >= 1024) initZoom();
}

// Logic for Back Button
function goBack() {
  if (document.referrer && document.referrer !== window.location.href)
    window.history.back();
  else window.location.href = '/';
}

// Drift Zoom Logic (Disabled for Mobile)
let drift;
function initZoom() {
  if (window.innerWidth < 1024) return;
  const mainImg = document.getElementById('mainImage');
  if (drift) drift.disable();
  drift = new Drift(mainImg, {
    paneContainer: document.getElementById('zoom-pane'),
    inlinePane: false,
    zoomFactor: 2,
  });
}

window.addEventListener('load', initZoom);
window.addEventListener('resize', initZoom);

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.wishlist-btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const icon = btn.querySelector('i');

  const res = await fetch('/wishlist/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: btn.dataset.productId }),
  });

  if (res.status === 401) return (window.location.href = '/login');
  const data = await res.json();
  icon.className = data.inWishlist
    ? 'fa-solid fa-heart text-red-500 text-sm'
    : 'fa-regular fa-heart text-gray-400 text-sm';
});

async function addToCart(event, productId) {
  event.preventDefault();
  const res = await fetch('/addcart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });
  if (res.status === 401) return (window.location.href = '/login');
  const data = await res.json();
  if (res.ok) window.location.href = '/cart';
  else Swal.fire({ icon: 'warning', title: 'Wait!', text: data.message });
}
