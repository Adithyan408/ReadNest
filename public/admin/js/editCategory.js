/* eslint-disable no-unused-vars */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function confirmDelete(id) {
  Swal.fire({
    title: 'Remove Category?',
    text: 'This action will affect all products within this genre and cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Yes, Delete It',
    background: '#ffffff',
    customClass: {
      title: 'font-black uppercase tracking-tight text-gray-800',
      confirmButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-4 px-8',
      cancelButton:
        'rounded-xl font-bold uppercase tracking-widest text-xs py-4 px-8',
    },
  }).then((res) => {
    if (res.isConfirmed)
      window.location.href = `/admin/deleteCategory?id=${id}`;
  });
}
