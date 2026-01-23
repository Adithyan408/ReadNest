/* eslint-disable no-unused-vars */

/**
 * TOGGLE LIKE FUNCTION
 * Updates the UI immediately (Optimistic UI) before server confirmation
 */
async function toggleLike(blogId, btnElement) {
  try {
    const res = await fetch('/blog/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogId }),
    });
    const data = await res.json();

    if (data.success !== false) {
      const icon = btnElement.querySelector('i');
      const countSpan = btnElement.querySelector('.count-span');

      const isLiking = icon.classList.contains('fa-regular');
      icon.classList.toggle('fa-regular');
      icon.classList.toggle('fa-solid');
      icon.classList.toggle('text-rose-500');

      let currentCount = parseInt(countSpan.textContent);
      countSpan.textContent = isLiking
        ? currentCount + 1
        : Math.max(0, currentCount - 1);
    }
  } catch (err) {
    console.error('Like operation failed', err);
  }
}

/**
 * TOGGLE SAVE/BOOKMARK
 */
async function toggleSave(blogId, btnElement) {
  try {
    const res = await fetch('/blogs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogId }),
    });
    const data = await res.json();
    if (data.success) {
      const icon = btnElement.querySelector('i');
      icon.classList.toggle('fa-regular');
      icon.classList.toggle('fa-solid');
      icon.classList.toggle('text-indigo-600');

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: data.isSaved ? 'Bookmarked!' : 'Removed from bookmarks',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  } catch (err) {
    console.error('Save operation failed', err);
  }
}
