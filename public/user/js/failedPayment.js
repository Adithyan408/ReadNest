// Prevent users from going back to a broken state
window.history.pushState(null, '', window.location.href);
window.onpopstate = function () {
  window.location.href = '/cart';
};
