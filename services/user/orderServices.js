import Order from "../../models/orderSchema.js";
import Product from "../../models/productsSchema.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";


export const getOrderDetailsPage = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate("items.product", "productImage")
      .lean();

    if (!order) return res.render("notFound");

    res.render("orderDetails", { order, selectedAddress: order.address });
  } catch (err) {
    res.render("notFound");
  }
};

export const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.render("notFound");

    const item = order.items.id(itemId);
    if (!item) return res.render("notFound");

    if (item.status !== "ordered") {
      return res.render("notFound");
    }

    item.status = "cancelled";
    item.cancelledAt = new Date();

    await order.save();

    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    const updatedOrder = await Order.findById(orderId)
      .populate("items.product", "productImage")
      .lean();

    return res.render("orderDetails", {
      order: updatedOrder,
      selectedAddress: updatedOrder.address,
    });
  } catch (err) {
    return res.render("notFound");
  }
};

export const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { returnReason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.render("notFound");

    const item = order.items.id(itemId);
    if (!item) return res.render("notFound");

    if (item.status !== "delivered") {
      return res.render("notFound");
    }

    item.status = "returned";
    item.returnedAt = new Date();
    item.returnReason = returnReason;

    await order.save();

    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );

    const updatedOrder = await Order.findById(orderId)
      .populate("items.product", "productImage")
      .lean();

    return res.render("orderDetails", {
      order: updatedOrder,
      selectedAddress: updatedOrder.address,
    });
  } catch (err) {
    console.log("Return Item Error:", err);
    return res.render("notFound");
  }
};

export const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate("items.product", "productName productImage regularPrice")
      .lean();

    if (!order) return res.render("notFound");

    const invoiceName = `invoice-${orderId}.pdf`;
    const invoicePath = path.join("invoices", invoiceName);

    if (!fs.existsSync("invoices")) fs.mkdirSync("invoices");

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${invoiceName}"`);

    doc.pipe(fs.createWriteStream(invoicePath));
    doc.pipe(res);

    const logoPath = path.join("public", "images", "logo2.png");

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 70 });
    }

    doc
      .fontSize(26)
      .fillColor("#333")
      .text("READNEST", 0, 40, { align: "center" });

    doc
      .fontSize(12)
      .fillColor("#666")
      .text("Digital Book Store", { align: "center" });

    doc
      .moveTo(40, 100)
      .lineTo(550, 100)
      .lineWidth(1)
      .strokeColor("#cccccc")
      .stroke();

    doc.moveDown(2);

    doc.fontSize(20).fillColor("#222").text("INVOICE", { align: "center" });
    doc.moveDown(1);

    const orderDate = new Date(order.createdAt);
    const deliveryDate = new Date(order.createdAt);
    deliveryDate.setDate(deliveryDate.getDate() + 5);

    doc.fontSize(12).fillColor("#444");
    doc.text(`Order ID: ${order._id}`, { align: "center" });
    doc.text(`Order Date: ${orderDate.toLocaleString()}`, { align: "center" });
    doc.text(`Expected Delivery: ${deliveryDate.toDateString()}`, {
      align: "center",
    });

    doc.moveDown(2);

    if (order.address) {
      doc
        .roundedRect(40, doc.y, 510, 90, 8)
        .strokeColor("#999")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(14)
        .fillColor("#222")
        .text("Delivery Address", 50, doc.y + 8);

      const a = order.address;

      doc
        .fontSize(12)
        .fillColor("#444")
        .text(
          `${a.addressLabel}\n${a.houseName}, ${a.street}\n${a.city}, ${a.state} - ${a.pincode}\nPhone: ${a.phone}`,
          50,
          doc.y,
          { lineGap: 2 }
        );

      doc.moveDown(3);
    }

    doc.fontSize(14).fillColor("#222").text("Order Items", { underline: true });

    const tableTop = doc.y + 10;
    const columnX = { item: 40, qty: 250, price: 320, subtotal: 420 };

    doc.rect(40, tableTop, 510, 23).fill("#f2f2f2").stroke();

    doc
      .fillColor("#000")
      .fontSize(12)
      .text("Item", columnX.item, tableTop + 7)
      .text("Qty", columnX.qty, tableTop + 7)
      .text("Price", columnX.price, tableTop + 7)
      .text("Subtotal", columnX.subtotal, tableTop + 7);

    let posY = tableTop + 30;
    doc.lineWidth(0.3).strokeColor("#ddd");

    order.items.forEach((item) => {
      doc
        .fillColor("#333")
        .text(item.productName, columnX.item, posY)
        .text(item.quantity.toString(), columnX.qty, posY)
        .text(`₹${item.regularPrice}`, columnX.price, posY)
        .text(`₹${item.subtotal}`, columnX.subtotal, posY);

      doc
        .moveTo(40, posY + 18)
        .lineTo(550, posY + 18)
        .stroke();

      posY += 25;
    });

    doc.moveDown(2);

    const subtotal = order.items.reduce((sum, i) => sum + i.subtotal, 0);
    const discount = subtotal - order.total;

    doc
      .roundedRect(300, posY + 10, 250, 90, 8)
      .strokeColor("#999")
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(12)
      .fillColor("#444")
      .text(`Subtotal: ₹${subtotal}`, 320, posY + 20)
      .text(`Discount: ₹${discount}`, 320, posY + 40)
      .fontSize(13)
      .fillColor("#000")
      .text(`Total Amount: ₹${order.total}`, 320, posY + 65);

    doc.moveDown(4);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor("#ddd").stroke();

    doc.moveDown(1);

    doc
      .fontSize(10)
      .fillColor("#777")
      .text("Thank you for shopping with READNEST!", {
        align: "center",
      });

    doc.end();
  } catch (err) {
    console.log("Invoice Error:", err);
    res.render("notFound");
  }
};

export const getListOrders = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const search = req.query.search?.trim() || "";

    let query = { user: userId }; 

    if (search) {
      query.$expr = {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: search,
          options: "i",
        },
      };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    let noResultsMessage = null;

    if (search && orders.length === 0) {
      noResultsMessage = `No orders found with Order ID "${search}"`;
    }

    res.render("orders", {
      orders,
      search,
      noResultsMessage,
    });
  } catch (err) {
    console.log("Orders Page Error:", err);
    res.render("notFound");
  }
};
