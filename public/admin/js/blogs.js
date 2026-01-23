/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// Sidebar Toggle
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

// Live Search Logic
let searchTimeout;
function searchBlogs(query) {
  const clearBtn = document.getElementById('clearSearchBtn');
  clearBtn.classList.toggle('hidden', !query);

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(
        `/admin/blogs/search?q=${encodeURIComponent(query)}`,
      );
      const data = await res.text();
      document.getElementById('blogsContainer').innerHTML = data;
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, 400);
}

function clearSearch() {
  document.getElementById('blogSearch').value = '';
  document.getElementById('clearSearchBtn').classList.add('hidden');
  searchBlogs('');
}
