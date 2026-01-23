/* eslint-disable no-unused-vars */

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

async function toggleBlockBlog(blogId) {
  const { isConfirmed } = await Swal.fire({
    title: 'Confirm Visibility Change',
    text: 'Updating the status will reflect immediately for all users.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Yes, update status',
    customClass: {
      container: 'rounded-3xl',
      popup: 'rounded-[2rem]',
    },
  });

  if (isConfirmed) {
    try {
      const res = await fetch(`/admin/blogs/block/${blogId}`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          showConfirmButton: false,
          timer: 1500,
        }).then(() => location.reload());
      }
    } catch (err) {
      Swal.fire('Error', 'Connection failed', 'error');
    }
  }
}

async function deleteComment(commentId) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete Comment?',
    text: 'This operation is permanent and cannot be reversed.',
    icon: 'error',
    showCancelButton: true,
    confirmButtonColor: '#f43f5e',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Delete Permanently',
  });

  if (isConfirmed) {
    try {
      const res = await fetch(`/admin/blogs/comment/${commentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          showConfirmButton: false,
          timer: 1500,
        }).then(() => location.reload());
      }
    } catch (err) {
      Swal.fire('Error', 'Action failed', 'error');
    }
  }
}
