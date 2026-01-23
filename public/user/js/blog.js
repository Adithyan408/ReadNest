/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* --- NAV & SEARCH LOGIC --- */
function openBlog() {
  window.location.href = '/blog';
}

let searchTimeout;
function searchBlogs(query) {
  document.getElementById('clearSearchBtn').classList.toggle('hidden', !query);
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const res = await fetch(`/blog/search?q=${encodeURIComponent(query)}`);
    const data = await res.text();
    document.getElementById('blogsContainer').innerHTML = data;
  }, 300);
}

function clearSearch() {
  document.getElementById('blogSearch').value = '';
  document.getElementById('clearSearchBtn').classList.add('hidden');
  searchBlogs('');
}

/* --- INTERACTIONS --- */
async function toggleLike(blogId) {
  const res = await fetch('/blog/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blogId }),
  });
  location.reload();
}

async function toggleSave(blogId) {
  const res = await fetch('/blogs/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blogId }),
  });
  location.reload();
}

/* --- NOTIFICATIONS --- */
const notifBtn = document.getElementById('notificationBtn');
const notifModal = document.getElementById('notificationModal');

notifBtn.onclick = async () => {
  notifModal.classList.toggle('hidden');
  if (notifModal.classList.contains('hidden')) return;

  const res = await fetch('/notifications');
  const notifications = await res.json();
  const list = document.getElementById('notificationList');
  list.innerHTML =
    notifications.length === 0
      ? '<p class="p-6 text-center text-gray-400 text-sm italic">No new alerts</p>'
      : '';

  notifications.forEach((n) => {
    list.innerHTML += `
            <div class="p-4 flex gap-3 ${n.isRead ? 'bg-white' : 'bg-blue-50'} border-l-4 ${n.isRead ? 'border-transparent' : 'border-blue-500'}">
              <i class="fa-solid ${n.type === 'like' ? 'fa-heart text-red-500' : 'fa-comment text-blue-500'} mt-1"></i>
              <div class="text-xs">
                <p><span class="font-bold text-gray-900">${n.sender.name}</span> ${n.type === 'like' ? 'liked' : 'commented on'} 
                   <a href="/blogs/${n.blog._id}" class="text-blue-600 font-bold hover:underline">"${n.blog.title}"</a></p>
                <p class="text-[10px] text-gray-400 mt-1 uppercase">${new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>`;
  });
};

document.getElementById('closeNotification').onclick = () =>
  notifModal.classList.add('hidden');

document.getElementById('markAllRead').onclick = async () => {
  await fetch('/notifications/mark-all-read', { method: 'POST' });
  document.getElementById('notificationList').innerHTML =
    '<p class="p-6 text-center text-gray-500 text-sm">Cleared! 🎉</p>';
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

/* --- SHARING --- */
let currentShareUrl = '';
function openShareModal(btn) {
  const blogId = btn.dataset.id;
  const title = btn.dataset.title;
  currentShareUrl = `${window.location.origin}/blogs/${blogId}`;

  document.getElementById('whatsappShare').href =
    `https://wa.me/?text=${encodeURIComponent(title + ' - ' + currentShareUrl)}`;
  document.getElementById('facebookShare').href =
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentShareUrl)}`;
  document.getElementById('twitterShare').href =
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentShareUrl)}&text=${encodeURIComponent(title)}`;

  document.getElementById('shareModal').classList.replace('hidden', 'flex');
}

function closeShareModal() {
  document.getElementById('shareModal').classList.replace('flex', 'hidden');
}

function copyLink() {
  navigator.clipboard.writeText(currentShareUrl);
  Swal.fire({
    icon: 'success',
    title: 'Link Copied',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1500,
  });
}
