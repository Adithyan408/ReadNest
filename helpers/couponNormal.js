export const normalizeCoupons = (coupons = []) => {
  return coupons.map(c => ({
    _id: c._id,
    code: c.code,
    type: c.type,             
    discount: c.discount,
    maxDiscount: c.maxDiscount,
    minPurchase: c.minPurchase,
  }));
};
