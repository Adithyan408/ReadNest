/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* ... existing toggleLike, addComment, deleteBlog, deleteComment, updateBlog, updateComment logic ... */

/* ============================================================
       1. GLOBAL SEARCH LOGIC (Works for Desktop & Mobile)
    ============================================================ */
const searchInputs = ['globalSearchInput', 'mobileSearchInput'];
const globalResults = document.getElementById('globalSearchResults');
const globalClear = document.getElementById('globalClearSearch');
let searchTimer;

searchInputs.forEach((id) => {
  const inputElement = document.getElementById(id);
  if (!inputElement) return;

  inputElement.addEventListener('input', () => {
    const query = inputElement.value.trim();

    // Show/Hide clear button only for desktop
    if (globalClear) globalClear.classList.toggle('hidden', query === '');

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (!query) {
        globalResults.innerHTML = '';
        globalResults.classList.add('hidden');
        return;
      }

      fetch(`/live-search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((items) => {
          if (!items.length) {
            globalResults.innerHTML = '<p class="p-3 text-gray-500 text-sm italic">No books found</p>';
          } else {
            globalResults.innerHTML = items
              .map(
                (p) => `
                                <a href="/product?id=${p._id}" class="block p-3 hover:bg-gray-50 border-b last:border-none transition">
                                    <div class="flex items-center gap-3">
                                        <img src="${p.productImage[0]}" class="w-10 h-14 object-cover rounded shadow-sm">
                                        <div>
                                            <p class="font-bold text-gray-900 text-sm">${p.productName}</p>
                                            <p class="text-xs text-gray-500">${p.author}</p>
                                        </div>
                                    </div>
                                </a>
                            `,
              )
              .join('');
          }
          globalResults.classList.remove('hidden');
        });
    }, 300);
  });
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
  if (
    !e.target.closest('#globalSearchResults') &&
    !searchInputs.some((id) => e.target.closest(`#${id}`))
  ) {
    globalResults?.classList.add('hidden');
  }
});

if (globalClear) {
  globalClear.onclick = () => {
    searchInputs.forEach((id) => (document.getElementById(id).value = ''));
    globalResults.innerHTML = '';
    globalResults.classList.add('hidden');
    globalClear.classList.add('hidden');
  };
}

/* ============================================================
       2. NOTIFICATION SYSTEM
    ============================================================ */
const notifBtn = document.getElementById('notificationBtn');
const notifModal = document.getElementById('notificationModal');
const notifList = document.getElementById('notificationList');
const notifBadge = document.getElementById('notifCount');

if (notifBtn) {
  notifBtn.onclick = async (e) => {
    e.stopPropagation();
    notifModal.classList.toggle('hidden');
    if (notifModal.classList.contains('hidden')) return;

    const res = await fetch('/notifications');
    const notifications = await res.json();
    notifList.innerHTML = '';

    if (notifications.length === 0) {
      notifList.innerHTML = '<div class="p-8 text-center"><i class="fa-solid fa-bell-slash text-gray-300 text-3xl mb-2 block"></i><p class="text-gray-500 text-sm">No new notifications</p></div>';
      return;
    }

    notifications.forEach((n) => {
      const icon =
        n.type === 'like'
          ? 'fa-heart text-red-500'
          : 'fa-comment text-blue-500';
      const actionText = n.type === 'like' ? 'liked your post' : 'commented on';

      notifList.innerHTML += `
                    <div class="p-4 flex gap-3 ${
                      n.isRead ? 'bg-white' : 'bg-blue-50'
                    } hover:bg-gray-50 transition border-b border-gray-100">
                        <i class="fa-solid ${icon} mt-1"></i>
                        <div class="text-sm">
                            <p class="text-gray-800">
                                <span class="font-bold">${
                                  n.sender.name
                                }</span> ${actionText} 
                                <a href="/blogs/${
                                  n.blog._id
                                }" class="text-blue-600 font-medium hover:underline">"${
                                  n.blog.title
                                }"</a>
                            </p>
                            <p class="text-[10px] text-gray-400 mt-1 uppercase font-semibold">${new Date(
                              n.createdAt,
                            ).toLocaleString()}</p>
                        </div>
                    </div>
                `;
    });
  };
}

document.getElementById('markAllRead')?.addEventListener('click', async () => {
  await fetch('/notifications/mark-all-read', { method: 'POST' });
  notifList.innerHTML = '<p class="p-6 text-center text-gray-500 text-sm">All caught up! 🎉</p>';
  notifBadge?.classList.add('hidden');
});

/* ============================================================
       3. BLOG INTERACTIONS (LIKE / COMMENT / DELETE)
    ============================================================ */
async function toggleLike(blogId) {
  try {
    const res = await fetch('/blog/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) location.reload();
  } catch (err) {
    console.error('Like failed', err);
  }
}

async function addComment(blogId) {
  const text = document.getElementById('commentText').value.trim();
  if (!text)
    return Swal.fire(
      'Empty Comment',
      'Please type something first.',
      'warning',
    );

  const res = await fetch('/blog/comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blogId, comment: text }),
  });
  const data = await res.json();
  if (data.success) location.reload();
}

function deleteBlog(blogId) {
  Swal.fire({
    title: 'Delete Blog?',
    text: 'This will permanently remove your story.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Yes, delete',
  }).then(async (result) => {
    if (result.isConfirmed) {
      const res = await fetch(`/blog/delete/${blogId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) window.location.href = '/blog';
    }
  });
}

/* ============================================================
       4. MODAL MANAGEMENT (EDIT BLOG & COMMENT)
    ============================================================ */
let blogEditor;
let activeCommentId = null;

function openEditModal() {
  const modal = document.getElementById('editModal');
  modal.classList.replace('hidden', 'flex');
  if (!blogEditor) {
    blogEditor = CKEDITOR.replace('editContent', { height: 300 });
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.replace('flex', 'hidden');
}

async function updateBlog(blogId) {
  const title = document.getElementById('editTitle').value;
  const content = blogEditor.getData();
  if (!title || !content)
    return Swal.fire('Required', 'Title and content cannot be empty', 'error');

  const res = await fetch(`/blog/edit/${blogId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  const data = await res.json();
  if (data.success) {
    Swal.fire('Success', 'Blog updated!', 'success').then(() =>
      location.reload(),
    );
  }
}

function openEditCommentModal(id, text) {
  activeCommentId = id;
  document.getElementById('editCommentText').value = text;
  const modal = document.getElementById('editCommentModal');
  modal.classList.replace('hidden', 'flex');
}

function closeEditCommentModal() {
  document
    .getElementById('editCommentModal')
    .classList.replace('flex', 'hidden');
  activeCommentId = null;
}

async function updateComment() {
  const text = document.getElementById('editCommentText').value.trim();
  if (!text) return;
  const res = await fetch(`/blog/comment/${activeCommentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment: text }),
  });
  const data = await res.json();
  if (data.success) location.reload();
}

function deleteComment(id) {
  Swal.fire({
    title: 'Delete comment?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
  }).then(async (result) => {
    if (result.isConfirmed) {
      const res = await fetch(`/blog/comment/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) location.reload();
    }
  });
}

/* ============================================================
       5. INITIALIZATION
    ============================================================ */
async function init() {
  const res = await fetch('/notifications/unread-count');
  const data = await res.json();
  if (data.count > 0) {
    notifBadge.textContent = data.count;
    notifBadge.classList.remove('hidden');
  }
}

function openBlog() {
  window.location.href = '/blog';
}

document.addEventListener('DOMContentLoaded', init);

// Modal helpers for Flex display

