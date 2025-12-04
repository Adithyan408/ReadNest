import Order from "../../models/orderSchema.js";
import Product from "../../models/productsSchema.js";  

export const loadOrders = async (req, res) => {
  try {
    let search = req.query.search || "";
    const statusFilter = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || "";
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
        { "user.email": { $regex: search, $options: "i" } }
      ];
    }

    if (statusFilter) {
      match["items.status"] = statusFilter;
    }

    const orders = await Order.find(match)
      .populate("user", "name email")
      .populate("items.product", "productName productImage")
      .sort({ createdAt: -1 })
      .lean();

    const flatItems = orders.flatMap(order =>
      order.items.map(item => ({
        orderId: order._id,
        user: order.user,
        createdAt: order.createdAt,

        productId: item.product?._id,
        productName: item.productName || item.product?.productName,
        productImage: item.productImage?.[0] || item.product?.productImage?.[0],

        quantity: item.quantity,
        price: item.regularPrice,
        subtotal: item.subtotal,
        status: item.status,

        itemId: item._id,
      }))
    );

    const totalItems = flatItems.length;
    const totalPages = Math.ceil(totalItems / limit);

    const paginatedItems = flatItems.slice((page - 1) * limit, page * limit);

    res.render("orderList", {
      orders: paginatedItems,
      totalPages,
      currentPage: page,
      search,
      statusFilter,
      sort
    });

  } catch (error) {
    console.log("Admin Orders Error:", error);
    res.render("admin-error");
  }
};


export const updateItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ _id: orderId, "items._id": itemId });

    if (!order) {
      return res.json({ success: false, message: "Order or item not found" });
    }

    const item = order.items.id(itemId);

    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

    const previousStatus = item.status; 
    const quantity = item.quantity;
    const productId = item.product;

    item.status = status;
    await order.save();

    if (status === "cancelled" && previousStatus !== "cancelled") {
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: quantity }
      });
    }

    return res.json({ success: true });

  } catch (err) {
    console.log("Update Item Status Error:", err);
    return res.json({ success: false });
  }
};
