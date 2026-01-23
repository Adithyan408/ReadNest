/* eslint-disable no-unused-vars */
function openBlog() {
  window.location.href = '/blog';
}

async function toggleLike(blogId) {
  try {
    const res = await fetch('/blog/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) location.reload();
  } catch (err) {
    console.error('Like failed');
  }
}

async function toggleSave(blogId) {
  try {
    const res = await fetch('/blogs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogId }),
    });
    if (res.ok) location.reload();
  } catch (err) {
    console.error('Save failed');
  }
}

const notifBtn = document.getElementById('notificationBtn');
const notifModal = document.getElementById('notificationModal');
const notifList = document.getElementById('notificationList');

notifBtn.onclick = async (e) => {
  e.stopPropagation();
  notifModal.classList.toggle('hidden');
  if (notifModal.classList.contains('hidden')) return;

  const res = await fetch('/notifications');
  const notifications = await res.json();
  notifList.innerHTML =
    notifications.length === 0
      ? '<p class="p-8 text-center text-gray-400 text-sm">No new notifications</p>'
      : '';

  notifications.forEach((n) => {
    notifList.innerHTML += `
            <div class="p-4 flex gap-3 ${n.isRead ? 'bg-white' : 'bg-blue-50'} transition border-b border-gray-50">
              <i class="fa-solid ${n.type === 'like' ? 'fa-heart text-red-500' : 'fa-comment text-blue-500'} mt-1"></i>
              <div class="text-xs">
                <p class="text-gray-800">
                  <span class="font-bold text-gray-900">${n.sender.name}</span> ${n.type === 'like' ? 'liked' : 'commented on'}
                  <a href="/blogs/${n.blog._id}" class="text-blue-600 font-bold hover:underline">"${n.blog.title}"</a>
                </p>
                <p class="text-[10px] text-gray-400 mt-1 uppercase font-medium">${new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>`;
  });
};

document.getElementById('closeNotification').onclick = () =>
  notifModal.classList.add('hidden');

document.getElementById('markAllRead').onclick = async () => {
  await fetch('/notifications/mark-all-read', { method: 'POST' });
  notifList.innerHTML = '<p class="p-6 text-center text-gray-500 text-sm">Cleared! 🎉</p>';
  document.getElementById('notifCount').classList.add('hidden');
};

async function loadUnreadCount() {
  const res = await fetch('/notifications/unread-count');
  const data = await res.json();
  const badge = document.getElementById('notifCount');
  if (data.count > 0) {
    badge.textContent = data.count;
    badge.classList.remove('hidden');
  }
}

window.onclick = (e) => {
  if (!notifModal.contains(e.target) && e.target !== notifBtn)
    notifModal.classList.add('hidden');
};

loadUnreadCount();
