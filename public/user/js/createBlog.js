/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* ================= CKEDITOR SETUP ================= */
CKEDITOR.replace('editor', {
  height: 400,
  // Optimization for mobile toolbars
  toolbar: [
    { name: 'styles', items: ['Format', 'FontSize'] },
    { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline'] },
    {
      name: 'paragraph',
      items: ['NumberedList', 'BulletedList', 'Blockquote'],
    },
    { name: 'insert', items: ['Link', 'HorizontalRule'] },
    { name: 'tools', items: ['Maximize'] },
  ],
  removePlugins: 'resize,elementspath',
  placeholder: 'Start writing your amazing story here...',
});

/* ================= NOTIFICATIONS ================= */
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
      ? '<p class="p-8 text-center text-gray-400 text-sm">No new alerts</p>'
      : '';

  notifications.forEach((n) => {
    notifList.innerHTML += `
                    <div class="p-4 flex gap-3 ${n.isRead ? 'bg-white' : 'bg-blue-50'} transition border-b border-gray-100">
                        <i class="fa-solid ${n.type === 'like' ? 'fa-heart text-red-500' : 'fa-comment text-blue-500'} mt-1"></i>
                        <div class="text-xs">
                            <p class="text-gray-800 font-medium">
                                <span class="font-bold">${n.sender.name}</span> ${n.type === 'like' ? 'liked' : 'commented on'} 
                                <a href="/blogs/${n.blog._id}" class="text-blue-600 font-bold hover:underline">"${n.blog.title}"</a>
                            </p>
                            <p class="text-[10px] text-gray-400 mt-1 uppercase">${new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                    </div>`;
  });
};

document.getElementById('closeNotification').onclick = () =>
  notifModal.classList.add('hidden');

document.getElementById('markAllRead').onclick = async () => {
  await fetch('/notifications/mark-all-read', { method: 'POST' });
  notifList.innerHTML =
    '<p class="p-6 text-center text-gray-500">Cleared 🎉</p>';
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

loadUnreadCount();

function openBlog() {
  window.location.href = '/blog';
}

// Close modal when clicking outside
window.onclick = (e) => {
  if (!notifModal.contains(e.target) && e.target !== notifBtn) {
    notifModal.classList.add('hidden');
  }
};
