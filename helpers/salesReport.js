export const getSalesReportData = async ({ filter, start, end }) => {
  const now = new Date();
  let fromDate, toDate;

  switch (filter) {
    case "today":
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      break;

    case "week":
      fromDate = new Date();
      fromDate.setDate(now.getDate() - 6);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date();
      break;

    case "month":
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date();
      break;

    case "year":
      fromDate = new Date(now.getFullYear(), 0, 1);
      toDate = new Date();
      break;

    case "custom":
      fromDate = new Date(start);
      toDate = new Date(end);
      toDate.setHours(23, 59, 59, 999);
      break;

    default:
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date();
  }

  const salesMatch = {
    $or: [
      { paymentMethod: "COD", "items.status": "delivered" },
      { paymentMethod: { $in: ["Razorpay", "WALLET"] } },
    ],
  };

  const salesData = await Order.aggregate([
    { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
    { $unwind: "$items" },
    { $match: salesMatch },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        orderId: 1,
        username: "$user.name",
        date: "$createdAt",
        product: "$items.productName",
        quantity: "$items.quantity",
        status: "$items.status",
        amount: {
          $cond: [
            { $in: ["$items.status", ["cancelled", "returned"]] },
            { $multiply: ["$items.subtotal", -1] },
            "$items.subtotal",
          ],
        },
        discount: {
          $subtract: ["$items.regularPrice", "$items.unitPrice"],
        },
      },
    },
    { $sort: { date: -1 } },
  ]);

  /* summary */
  const uniqueOrders = new Set(salesData.map(s => s.orderId)).size;

  const totalSales = salesData
    .filter(s => s.amount > 0)
    .reduce((a, b) => a + b.amount, 0);

  const refundAmount = salesData
    .filter(s => s.amount < 0)
    .reduce((a, b) => a + Math.abs(b.amount), 0);

  const totalDiscount = salesData.reduce(
    (a, b) => a + (b.discount || 0),
    0
  );

  return {
    fromDate,
    toDate,
    salesData,
    summary: {
      orders: uniqueOrders,
      totalSales,
      refundAmount,
      totalDiscount,
      revenue: totalSales - refundAmount,
    },
  };
};
