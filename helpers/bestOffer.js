export const getActiveProductOffer = (product) => {
  if (!product || !product.offer || product.offer <= 0) return 0;

  const now = new Date();

  const start = product.offerStart ? new Date(product.offerStart) : null;
  const end = product.offerEnd ? new Date(product.offerEnd) : null;

  const validStart = start instanceof Date && !isNaN(start);
  const validEnd = end instanceof Date && !isNaN(end);

 
  if (!validStart && !validEnd) return product.offer;


  if (validStart && !validEnd) return now >= start ? product.offer : 0;


  if (!validStart && validEnd) return now <= end ? product.offer : 0;


  if (now >= start && now <= end) return product.offer;

  return 0;
};

export const getActiveCategoryOffer = (category) => {
  if (!category || !category.offer || category.offer <= 0) return 0;

  const now = new Date();
  const start = category.offerStart ? new Date(category.offerStart) : null;
  const end = category.offerEnd ? new Date(category.offerEnd) : null;

  if (!start && !end) return category.offer;
  if (start && !end) return now >= start ? category.offer : 0;
  if (!start && end) return now <= end ? category.offer : 0;

  if (now >= start && now <= end) {
    return category.offer;
  }

  return 0;
};
