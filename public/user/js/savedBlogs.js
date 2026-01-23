/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// NAVIGATION
function openBlog() {
  window.location.href = '/blog';
}

// LIKE LOGIC
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

      // Toggle UI immediately for better feel
      const isLiking = icon.classList.contains('fa-regular');
      icon.classList.toggle('fa-regular');
      icon.classList.toggle('fa-solid');
      icon.classList.toggle('text-red-500');

      // Update count based on response if available, or increment/decrement
      let currentCount = parseInt(countSpan.textContent);
      countSpan.textContent = isLiking ? currentCount + 1 : currentCount - 1;
    }
  } catch (err) {
    console.error('Like operation failed', err);
  }
}

// SAVE LOGIC
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
      icon.classList.toggle('text-blue-600');
    }
  } catch (err) {
    console.error('Save operation failed', err);
  }
}

// NOTIFICATIONS SYSTEM
const notifBtn = document.getElementById('notificationBtn');
const notifModal = document.getElementById('notificationModal');
const notifList = document.getElementById('notificationList');
const notifCountBadge = document.getElementById('notifCount');

notifBtn.onclick = async (e) => {
  e.stopPropagation();
  notifModal.classList.toggle('hidden');
  if (notifModal.classList.contains('hidden')) return;

  try {
    const res = await fetch('/notifications');
    const notifications = await res.json();

    notifList.innerHTML =
      notifications.length === 0
        ? '<div class="p-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No new alerts</div>'
        : '';

    notifications.forEach((n) => {
      const statusBg = n.isRead ? 'bg-white' : 'bg-blue-50/50';
      const icon =
        n.type === 'like'
          ? 'fa-heart text-red-500'
          : 'fa-comment text-blue-500';

      notifList.innerHTML += `
                        <div class="p-4 flex gap-4 ${statusBg} transition-colors border-b border-gray-50">
                            <div class="shrink-0 mt-1"><i class="fa-solid ${icon}"></i></div>
                            <div class="text-xs">
                                <p class="text-gray-700 leading-relaxed">
                                    <span class="font-black text-gray-900">${n.sender.name}</span> 
                                    ${n.type === 'like' ? 'showed some love on' : 'commented on'}
                                    <a href="/blogs/${n.blog._id}" class="text-blue-600 font-bold hover:underline italic">"${n.blog.title}"</a>
                                </p>
                                <p class="text-[9px] text-gray-400 mt-2 font-black uppercase tracking-tighter">${new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                        </div>`;
    });
  } catch (err) {
    console.error('Could not load notifications', err);
  }
};

document.getElementById('closeNotification').onclick = () =>
  notifModal.classList.add('hidden');

document.getElementById('markAllRead').onclick = async () => {
  try {
    await fetch('/notifications/mark-all-read', { method: 'POST' });
    notifList.innerHTML =
      '<div class="p-10 text-center text-green-500 text-xs font-black uppercase tracking-widest italic">All caught up! 🎉</div>';
    notifCountBadge.classList.add('hidden');
  } catch (err) {
    console.error('Clear notifications failed', err);
  }
};

async function loadUnreadCount() {
  try {
    const res = await fetch('/notifications/unread-count');
    const data = await res.json();
    if (data.count > 0) {
      notifCountBadge.textContent = data.count > 9 ? '9+' : data.count;
      notifCountBadge.classList.remove('hidden');
    } else {
      notifCountBadge.classList.add('hidden');
    }
  } catch (err) {
    console.error('Badge update failed', err);
  }
}

// Initialize and outside-click handler
window.onclick = (e) => {
  if (!notifModal.contains(e.target) && e.target !== notifBtn)
    notifModal.classList.add('hidden');
};

loadUnreadCount();
// Refresh unread count every 30 seconds
setInterval(loadUnreadCount, 30000);
