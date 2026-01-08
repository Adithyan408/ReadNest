import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import PDFDocument from "pdfkit";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";
import { ERROR_MESSAGES } from "../../helpers/errorMessages.js";

export const pageError = async (req, res) => {
  res.render("admin-error");
};

export const getLogin = async (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin");
  }
  res.render("admin-login", { message: null });
};

export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.render("admin-login", {
        message: ERROR_MESSAGES.AUTH.ADMIN_NOT_FOUND,
      });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
      });
    }

    req.session.admin = true;
    req.session.adminData = admin;

    return res.json({ success: true });
  } catch (error) {
    return res.redirect("/pageerror");
  }
};

export const getDashboard = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    const { filter, start, end, page = 1 } = req.query;

    const limit = 10;
    const currentPage = Number(page);
    const skip = (currentPage - 1) * limit;

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

    const totalCustomers = await User.countDocuments({ isBlocked: false });

    const completedOrdersAgg = await Order.aggregate([
      { $unwind: "$items" },
      { $match: salesMatch },
      {
        $group: {
          _id: "$_id",
        },
      },
      {
        $count: "count",
      },
    ]);

    const completedOrdersCount = completedOrdersAgg[0]?.count || 0;

    const lifetimeAgg = await Order.aggregate([
      { $match: { createdAt: { $lte: toDate } } },
      { $unwind: "$items" },
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$items.subtotal" },
          discount: {
            $sum: {
              $subtract: ["$items.regularPrice", "$items.unitPrice"],
            },
          },
        },
      },
    ]);

    const lifetime = {
      totalOrders: completedOrdersCount,
      totalSales: lifetimeAgg[0]?.totalSales || 0,
      totalDiscount: lifetimeAgg[0]?.discount || 0,
    };

    /* -------------------- FILTERED SALES -------------------- */
    const filteredAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      { $unwind: "$items" },
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          ordersCount: { $addToSet: "$_id" },
          orderAmount: { $sum: "$items.regularPrice" },
          discountAmount: {
            $sum: {
              $subtract: ["$items.regularPrice", "$items.unitPrice"],
            },
          },
          netSales: { $sum: "$items.subtotal" },
        },
      },
      {
        $project: {
          ordersCount: { $size: "$ordersCount" },
          orderAmount: 1,
          discountAmount: 1,
          netSales: 1,
        },
      },
    ]);

    const filtered = filteredAgg[0] || {
      ordersCount: 0,
      orderAmount: 0,
      discountAmount: 0,
      netSales: 0,
    };

    /* -------------------- SALES CHART -------------------- */
    const salesByDate = await Order.aggregate([
      { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
      { $unwind: "$items" },
      { $match: salesMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
          total: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chartLabels = salesByDate.map((d) => d._id);
    const chartValues = salesByDate.map((d) => d.total);

    /* -------------------- TOP PRODUCTS -------------------- */
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      { $match: salesMatch },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.productName" },
          sold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 5 },
    ]);

    /* -------------------- TOP CATEGORIES -------------------- */
    const topCategories = await Order.aggregate([
      { $unwind: "$items" },
      { $match: salesMatch },
      {
        $group: {
          _id: "$items.category",
          sold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 3 },
    ]).then((data) => data.map((c) => ({ name: c._id, sold: c.sold })));

    /* -------------------- TOP PAYMENT METHOD -------------------- */
    const topPaymentAgg = await Order.aggregate([
      { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    const topPaymentMethod = topPaymentAgg[0] || null;

    const salesTableAgg = await Order.aggregate([
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
        },
      },

      { $sort: { date: -1 } },
    ]);
    const totalRows = salesTableAgg.length;
    const totalPages = Math.ceil(totalRows / limit);

    const paginatedSales = salesTableAgg.slice(skip, skip + limit);

    /* -------------------- REFUND AMOUNT -------------------- */
const refundAgg = await Order.aggregate([
  { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
  { $unwind: "$items" },
  {
    $match: {
      "items.status": { $in: ["cancelled", "returned"] },
    },
  },
  {
    $group: {
      _id: null,
      refundAmount: { $sum: "$items.subtotal" },
    },
  },
]);

const refundAmount = refundAgg[0]?.refundAmount || 0;

    /* -------------------- RENDER -------------------- */
    res.render("dashboard", {
      totalCustomers,
      lifetime,
      filtered,
      filter,
      start,
      end,
      chartLabels,
      chartValues,
      topProducts,
      topCategories,
      topPaymentMethod,

      salesMeta: {
        fromDate,
        toDate,
        generatedAt: new Date(),
      },
      salesSummary: {
        orders: filtered.ordersCount,
        totalSales: filtered.orderAmount,
        totalDiscount: filtered.discountAmount,
        refundAmount,
        // revenue: filtered.netSales,
      },
      salesRows: paginatedSales,
      pagination: {
        current: currentPage,
        total: totalPages,
        limit
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.redirect("/pageerror");
  }
};

export const postLogout = async (req, res) => {
  try {
    delete req.session.admin;
    delete req.session.adminData;

    return res.redirect("/admin/login");
  } catch (error) {
    console.log("Admin Logout error", error);
    res.redirect("/pageerror");
  }
};

export const salesReport = async (req, res) => {
  try {
    const { filter, start, end } = req.query;

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

    /* -------------------- SALES CONDITION -------------------- */
    const salesMatch = {
      $or: [
        { paymentMethod: "COD", "items.status": "delivered" },
        { paymentMethod: { $in: ["Razorpay", "WALLET"] } },
      ],
    };

    /* -------------------- FETCH SALES DATA -------------------- */
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

    /* -------------------- CALCULATIONS -------------------- */
    const uniqueOrders = new Set(salesData.map((s) => s.orderId)).size;

    const totalSales = salesData
      .filter((s) => s.amount > 0)
      .reduce((sum, s) => sum + s.amount, 0);

    const refundAmount = salesData
      .filter((s) => s.amount < 0)
      .reduce((sum, s) => sum + Math.abs(s.amount), 0);

    const cancelledCount = salesData.filter(
      (s) => s.status === "cancelled"
    ).length;

    const returnedCount = salesData.filter(
      (s) => s.status === "returned"
    ).length;

    const totalDiscount = salesData.reduce(
      (sum, s) => sum + (s.discount || 0),
      0
    );

    const totalRevenue = totalSales - refundAmount;

    /* -------------------- PDF SETUP -------------------- */
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.pdf"
    );

    doc.pipe(res);

    /* -------------------- HEADER -------------------- */
    doc.fontSize(18).text("ReadNest Sales Report", { align: "center" });
    doc
      .fontSize(10)
      .text(`Period: ${fromDate.toDateString()} - ${toDate.toDateString()}`, {
        align: "center",
      });
    doc.fontSize(10).text(`Generated on: ${new Date().toDateString()}`, {
      align: "center",
    });

    doc.moveDown(1.5);

    /* -------------------- SUMMARY -------------------- */
    doc.font("Helvetica-Bold").fontSize(12).text("Sales Summary");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10);

    doc.text(`Total Orders        : ${uniqueOrders}`);
    doc.text(`Total Sales         : ₹${totalSales.toFixed(2)}`);
    doc.text(
      `Total Discount      : ₹${totalDiscount.toFixed(
        2
      )} `
    );
    doc.text(`Cancelled Products  : ${cancelledCount}`);
    doc.text(`Returned Products   : ${returnedCount}`);
    doc.text(`Refund Amount       : -₹${refundAmount.toFixed(2)}`);

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold");
    // doc.text(`TOTAL REVENUE       : ₹${totalRevenue.toFixed(2)}`);

    doc.moveDown(2);

    /* -------------------- TABLE -------------------- */
    const col = {
      no: 40,
      user: 70,
      product: 180,
      qty: 340,
      date: 380,
      amount: 460,
    };
    const rowHeight = 22;
    let y = doc.y;

    const drawRow = (y, no, user, product, qty, date, amount) => {
      doc
        .fontSize(10)
        .text(no, col.no, y, { width: 25 })
        .text(user, col.user, y, { width: 100 })
        .text(product, col.product, y, { width: 140 })
        .text(qty, col.qty, y, { width: 30, align: "center" })
        .text(date, col.date, y, { width: 80 })
        .text(amount, col.amount, y, { width: 80, align: "right" });
    };

    const drawLine = (y) => {
      doc
        .strokeColor("#aaa")
        .lineWidth(0.5)
        .moveTo(40, y)
        .lineTo(555, y)
        .stroke();
    };

    doc.font("Helvetica-Bold");
    drawRow(y, "No", "Customer", "Product", "Qty", "Date", "Amount");
    drawLine(y + rowHeight);
    y += rowHeight;
    doc.font("Helvetica");

    if (!salesData.length) {
      doc.moveDown(2).fontSize(12).text("No sales found for selected period.");
    } else {
      salesData.forEach((item, index) => {
        if (y > doc.page.height - 50) {
          doc.addPage();
          y = 50;
          doc.font("Helvetica-Bold");
          drawRow(y, "No", "Customer", "Product", "Qty", "Date", "Amount");
          drawLine(y + rowHeight);
          y += rowHeight;
          doc.font("Helvetica");
        }

        drawRow(
          y,
          index + 1,
          item.username,
          item.product,
          item.quantity,
          new Date(item.date).toDateString(),
          `₹${item.amount.toFixed(2)}`
        );

        drawLine(y + rowHeight);
        y += rowHeight;
      });
    }

    doc.end();
  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).send("Unable to generate PDF");
  }
};

export const downloadSalesExcel = async (req, res) => {
  try {
    const { filter, start, end } = req.query;

    /* -------------------- DATE RANGE -------------------- */
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

    /* -------------------- SALES CONDITION -------------------- */
    const salesMatch = {
      $or: [
        { paymentMethod: "COD", "items.status": "delivered" },
        { paymentMethod: { $in: ["Razorpay", "WALLET"] } },
      ],
    };

    /* -------------------- FETCH SALES DATA -------------------- */
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
          status: "$items.status",
          quantity: "$items.quantity",
          amount: "$items.subtotal",
          discount: {
            $subtract: ["$items.regularPrice", "$items.unitPrice"],
          },
        },
      },

      { $sort: { date: -1 } },
    ]);

    /* -------------------- EXCEL SETUP -------------------- */
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "Order ID", key: "orderId", width: 18 },
      { header: "Customer", key: "username", width: 25 },
      { header: "Date", key: "date", width: 15 },
      { header: "Product", key: "product", width: 30 },
      { header: "Status", key: "status", width: 15 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Amount (₹)", key: "amount", width: 15 },
      { header: "Discount (₹)", key: "discount", width: 15 },
    ];

    salesData.forEach((row) => {
      sheet.addRow({
        orderId: row.orderId,
        username: row.username,
        date: new Date(row.date).toDateString(),
        product: row.product,
        status: row.status,
        quantity: row.quantity,
        amount: row.amount,
        discount: row.discount,
      });
    });

    /* -------------------- RESPONSE -------------------- */
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Error:", error);
    res.status(500).send("Unable to generate Excel");
  }
};
