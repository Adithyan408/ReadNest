export const generateBreadcrumbs = (req, res, next) => {
  const pathArray = req.path.split('/').filter((x) => x);

  let breadcrumbs = [];

  if (pathArray[0] === 'admin') {
    breadcrumbs.push({ name: '', url: '/admin' });
  } else {
    breadcrumbs.push({ name: 'Home', url: '/' });
  }

  pathArray.forEach((segment, index) => {
    const url = '/' + pathArray.slice(0, index + 1).join('/');
    breadcrumbs.push({
      name: segment.charAt(0).toUpperCase() + segment.slice(1),
      url,
    });
  });

  res.locals.breadcrumbs = breadcrumbs;
  next();
};
