export const normalizeCoupons = (coupons = []) => {
  return coupons.map(c => ({
    ...c,
    expiryFormatted: new Date(c.expiry).toDateString(),
  }));
};
