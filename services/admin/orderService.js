import Order from "../../models/orderSchema.js";
import Product from "../../models/productsSchema.js";

export const loadOrders = async (req, res) => {
  try {
    const search = req.query.search || "";
    const statusFilter = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    let match = {};

    if (search) {
      match.$or = [
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: search,
              options: "i",
            },
          },
        },
        { "user.name": { $regex: search, $options: "i" } },
        { "user.email": { $regex: search, $options: "i" } },
      ];
    }

    const allOrders = await Order.find(match)
      .populate("user", "name email")
      .lean()
      .sort({ createdAt: -1 });

    // 1️⃣ Add overallStatus
    const ordersWithStatus = allOrders.map((order) => {
      const statuses = (order.items || []).map((i) => i.status);
      const unique = [...new Set(statuses)];

      let overallStatus;
      if (unique.length === 0) overallStatus = "N/A";
      else if (unique.length > 1) overallStatus = "Multiple";
      else overallStatus = unique[0];

      return { ...order, overallStatus };
    });

    // 2️⃣ FILTER BY STATUS (IF SELECTED)
    let filteredOrders = ordersWithStatus;

    if (statusFilter) {
      filteredOrders = filteredOrders.filter(
        (order) => order.overallStatus === statusFilter
      );
    }

    // 3️⃣ PAGINATION (AFTER FILTER)
    const totalOrders = filteredOrders.length;
    const totalPages = Math.ceil(totalOrders / limit);

    const paginatedOrders = filteredOrders.slice(
      (page - 1) * limit,
      page * limit
    );

    // 4️⃣ RENDER
    res.render("orderList", {
      orders: paginatedOrders,
      currentPage: page,
      totalPages,
      search,
      statusFilter,
    });
  } catch (error) {
    console.log("Admin Orders Error:", error);
    res.render("admin-error");
  }
};

export const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate("items.product", "productName productImage regularPrice")
      .lean();

    if (!order) {
      return res.render("notFound");
    }

    res.render("orderDetails", { order });
  } catch (error) {
    console.log("Order Details Error:", error);
    res.render("admin-error");
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "processing",
      "partially_cancelled",
      "cancelled",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.json({ success: false, message: "Invalid status" });
    }

    await Order.findByIdAndUpdate(orderId, { status });

    res.json({ success: true });
  } catch (error) {
    console.log("Order Status Update Error:", error);
    res.json({ success: false, message: "Server error" });
  }
};

export const updateItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ _id: orderId, "items._id": itemId });

    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    const previousStatus = item.status;
    const quantity = item.quantity;
    const productId = item.product;

    item.status = status;
    await order.save();

    // restore stock if cancelled
    if (status === "cancelled" && previousStatus !== "cancelled") {
      await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } });
    }

    // AUTO UPDATE ORDER STATUS
    const allStatuses = order.items.map((i) => i.status);

    if (allStatuses.every((s) => s === "delivered")) {
      order.status = "completed";
    } else if (allStatuses.every((s) => s === "cancelled")) {
      order.status = "cancelled";
    } else if (allStatuses.some((s) => s === "cancelled")) {
      order.status = "partially_cancelled";
    } else {
      order.status = "processing";
    }

    await order.save();

    return res.json({ success: true });
  } catch (err) {
    console.log("Update Item Status Error:", err);
    return res.json({ success: false });
  }
};
