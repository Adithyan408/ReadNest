// Prevent back-navigation to the checkout session
window.history.pushState(null, '', window.location.href);
window.onpopstate = function () {
  window.location.href = '/';
};
