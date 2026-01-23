/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

let cropper = null;
const bannerInput = document.getElementById('bannerImage');
const modal = document.getElementById('cropperModal');
const cropImg = document.getElementById('cropperImage');
const preview = document.getElementById('bannerPreview');

window.startBannerCrop = function (event) {
  const file = event.target.files[0];
  if (!file) return;
  cropImg.src = URL.createObjectURL(file);
  modal.classList.replace('hidden', 'flex');
  cropImg.onload = () => {
    if (cropper) cropper.destroy();
    cropper = new Cropper(cropImg, {
      aspectRatio: 16 / 9,
      viewMode: 2,
      autoCropArea: 1,
    });
  };
};

window.closeBannerCrop = function () {
  modal.classList.replace('flex', 'hidden');
  if (cropper) cropper.destroy();
  cropper = null;
  bannerInput.value = '';
};

window.applyBannerCrop = function () {
  if (!cropper) return;
  const canvas = cropper.getCroppedCanvas({ width: 1920, height: 1080 });
  canvas.toBlob(
    (blob) => {
      const file = new File([blob], 'banner_update.jpg', {
        type: 'image/jpeg',
      });
      const dt = new DataTransfer();
      dt.items.add(file);
      bannerInput.files = dt.files;
      preview.innerHTML = `<img src="${URL.createObjectURL(blob)}" class="rounded-2xl shadow-xl border-4 border-white max-h-56 object-cover"/>`;
      modal.classList.replace('flex', 'hidden');
      cropper.destroy();
      cropper = null;
    },
    'image/jpeg',
    0.9,
  );
};

function confirmDelete(id) {
  Swal.fire({
    title: 'Delete this Banner?',
    text: 'This campaign will be permanently removed from the storefront.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Yes, Delete',
    background: '#ffffff',
    customClass: {
      title: 'font-black uppercase tracking-tight text-gray-800',
      confirmButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-4 px-8',
      cancelButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-4 px-8',
    },
  }).then((res) => {
    if (res.isConfirmed) window.location.href = `/admin/deleteBanner?id=${id}`;
  });
}
