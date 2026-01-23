/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

// Sidebar Toggle for Mobile
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full');
}

// Form Validation Logic
document
  .getElementById('categoryForm')
  .addEventListener('submit', function (e) {
    const name = document.getElementById('categoryName').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    if (!name) {
      e.preventDefault();
      errorMsg.textContent =
        'Please provide a category name before submitting.';
      errorMsg.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Shake effect for input
      const input = document.getElementById('categoryName');
      input.classList.add('border-red-500', 'bg-red-50');
      setTimeout(
        () => input.classList.remove('border-red-500', 'bg-red-50'),
        2000,
      );
    } else {
      errorMsg.classList.add('hidden');
    }
  });
