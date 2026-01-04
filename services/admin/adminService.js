import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import PDFDocument from "pdfkit";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";

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
      return res.render("admin-login", { message: "Admin not found" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
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

    const { filter, start, end } = req.query;

    const totalCustomers = await User.countDocuments({ isBlocked: false });

    const completedOrdersCount = await Order.countDocuments({
      status: "completed",
    });

    const lifetimeSalesAgg = await Order.aggregate([
      {
        $match: {
          status: "completed",
          paymentStatus: "paid",
        },
      },
      { $unwind: "$items" },
      {
        $match: {
          "items.status": "delivered",
        },
      },
      {
        $group: {
          _id: null,

          totalSales: { $sum: "$items.subtotal" },

          itemDiscount: {
            $sum: {
              $subtract: ["$items.regularPrice", "$items.unitPrice"],
            },
          },

          couponDiscount: { $sum: { $ifNull: ["$discount", 0] } },
        },
      },
      {
        $project: {
          totalSales: 1,
          totalDiscount: { $add: ["$itemDiscount", "$couponDiscount"] },
        },
      },
    ]);

    const lifetime = {
      totalOrders: completedOrdersCount,
      totalSales: lifetimeSalesAgg[0]?.totalSales || 0,
      totalDiscount: lifetimeSalesAgg[0]?.totalDiscount || 0,
    };

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

    const filteredAgg = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      { $unwind: "$items" },
      {
        $match: { "items.status": "delivered" },
      },
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

    const salesByDate = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      { $unwind: "$items" },
      {
        $match: { "items.status": "delivered" },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
            },
          },
          total: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chartLabels = salesByDate.map((d) => d._id);
    const chartValues = salesByDate.map((d) => d.total);

    const topProducts = await Order.aggregate([
      { $unwind: "$items" },

      { $match: { "items.status": "delivered" } },

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

    const topCategories = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "delivered" } },
      {
        $group: {
          _id: "$items.category",
          sold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 3 },
    ]).then((data) =>
      data.map((c) => ({
        name: c._id,
        sold: c.sold,
      }))
    );

    const topPaymentAgg = await Order.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
        },
      },

      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    const topPaymentMethod = topPaymentAgg[0]
      ? {
          method: topPaymentAgg[0]._id,
          count: topPaymentAgg[0].count,
        }
      : null;

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
    let { filter, start, end } = req.query;
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

    const salesData = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: fromDate, $lte: toDate },
          status: "completed",
        },
      },
      { $unwind: "$items" },
      { $match: { "items.status": "delivered" } },

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
          username: "$user.name",
          orderId: "$_id",
          date: "$createdAt",
          product: "$items.productName",
          quantity: "$items.quantity",
          amount: "$items.subtotal",
          discount: {
            $subtract: ["$items.regularPrice", "$items.unitPrice"],
          },
        },
      },
      { $sort: { date: -1 } },
    ]);

    const totalOrders = new Set(salesData.map((s) => s.orderId.toString()))
      .size;

    const totalSales = salesData.reduce((sum, s) => sum + s.amount, 0);

    const totalDiscount = salesData.reduce(
      (sum, s) => sum + (s.discount || 0),
      0
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report.pdf`
    );

    doc.pipe(res);

    /* -------------------- TITLE -------------------- */
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

    /* ---------- SUMMARY ---------- */
    doc.font("Helvetica-Bold").fontSize(12).text("Summary (Selected Period)");

    doc.moveDown(0.5);

    doc.font("Helvetica").fontSize(10);
    doc.text(`Total Orders   : ${totalOrders}`);
    doc.text(`Total Sales    : ₹${totalSales.toFixed(2)}`);
    doc.text(`Total Discount : ₹${totalDiscount.toFixed(2)}`);

    doc.moveDown(2);

    /* -------------------- TABLE CONFIG -------------------- */
    const tableTop = doc.y;
    const rowHeight = 22;

    // Column positions
    const col = {
      no: 40,
      user: 70,
      product: 180,
      qty: 340,
      date: 380,
      amount: 460,
    };

    // Table Header
    doc.fontSize(10).font("Helvetica-Bold");
    drawRow(tableTop, "No", "Customer", "Product", "Qty", "Date", "Amount");

    drawLine(tableTop + rowHeight);

    /* -------------------- TABLE DATA -------------------- */
    doc.font("Helvetica");
    let y = tableTop + rowHeight;
    let totalRevenue = 0;

    if (!salesData.length) {
      doc.moveDown(2).fontSize(12).text("No sales found for selected period.");
    } else {
      salesData.forEach((item, index) => {
        totalRevenue += item.amount;

        // Page break handling
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

    /* -------------------- HELPERS -------------------- */
    function drawRow(y, no, user, product, qty, date, amount) {
      doc
        .fontSize(10)
        .text(no, col.no, y, { width: 25 })
        .text(user, col.user, y, { width: 100 })
        .text(product, col.product, y, { width: 140 })
        .text(qty, col.qty, y, { width: 30, align: "center" })
        .text(date, col.date, y, { width: 80 })
        .text(amount, col.amount, y, { width: 80, align: "right" });
    }

    function drawLine(y) {
      doc
        .strokeColor("#aaa")
        .lineWidth(0.5)
        .moveTo(40, y)
        .lineTo(555, y)
        .stroke();
    }
    doc.end();
  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).send("Unable to generate PDF");
  }
};

export const downloadSalesExcel = async (req, res) => {
  try {
    let { filter, start, end } = req.query;
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

    const salesData = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: fromDate, $lte: toDate },
          status: "completed",
        },
      },
      { $unwind: "$items" },
      { $match: { "items.status": "delivered" } },

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
          orderId: "$orderId",
          username: "$user.name",
          date: "$createdAt",
          product: "$items.productName",
          quantity: "$items.quantity",
          amount: "$items.subtotal",
          discount: {
            $subtract: ["$items.regularPrice", "$items.unitPrice"],
          },
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "User Name", key: "username", width: 25 },
      { header: "Date", key: "date", width: 15 },
      { header: "Product", key: "product", width: 30 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Amount", key: "amount", width: 15 },
    ];

  salesData.forEach((row) => {
  sheet.addRow({
    username: row.username, 
    date: new Date(row.date).toDateString(),
    product: row.product,
    quantity: row.quantity,
    amount: row.amount,
  });
});


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
