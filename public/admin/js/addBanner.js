/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

// Sidebar Toggle for Mobile
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full');
}

const bannerInput = document.getElementById('bannerImage');
const cropperModal = document.getElementById('cropperModal');
const cropImg = document.getElementById('cropperImage');
const preview = document.getElementById('bannerPreview');
const uploadUI = document.getElementById('uploadUI');

let cropper = null;

bannerInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  cropImg.src = URL.createObjectURL(file);
  cropperModal.classList.remove('hidden');

  cropImg.onload = function () {
    if (cropper) cropper.destroy();
    cropper = new Cropper(cropImg, {
      aspectRatio: 16 / 9, // Standard wide banner
      viewMode: 2,
      autoCropArea: 1,
    });
  };
});

function cancelCrop() {
  cropperModal.classList.add('hidden');
  if (cropper) cropper.destroy();
  cropper = null;
  bannerInput.value = '';
}

function applyCrop() {
  if (!cropper) return;
  const canvas = cropper.getCroppedCanvas({ width: 1920, height: 1080 }); // High-res output

  canvas.toBlob(
    (blob) => {
      const croppedFile = new File([blob], 'banner.jpg', {
        type: 'image/jpeg',
      });
      const dt = new DataTransfer();
      dt.items.add(croppedFile);
      bannerInput.files = dt.files;

      uploadUI.classList.add('hidden');
      preview.innerHTML = `<img src="${URL.createObjectURL(blob)}" class="max-h-48 rounded-2xl shadow-xl border-4 border-white object-cover"/>`;

      cropperModal.classList.add('hidden');
      cropper.destroy();
      cropper = null;
    },
    'image/jpeg',
    0.9,
  );
}
