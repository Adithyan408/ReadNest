export const generateOrderId = () => {
  const date = new Date();

  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  const rand = Math.floor(10 + Math.random() * 90); 

  return `${y}${m}${d}${rand}`;
};
