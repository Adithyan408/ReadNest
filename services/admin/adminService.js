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

const getDateRange = (filter, start, end) => {
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

  return { fromDate, toDate };
};
export const getDashboard = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    const { filter, start, end } = req.query;
    

    /* =====================================================
       1. BASIC LIFETIME STATS (NO FILTER)
    ===================================================== */

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

    /* =====================================================
       2. DATE RANGE (FILTERED)
    ===================================================== */

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

    /* =====================================================
       3. FILTERED SALES REPORT
    ===================================================== */

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

    /* =====================================================
       4. SALES CHART DATA (FILTERED)
    ===================================================== */

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
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          total: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    /* ✅ MISSING PART — ADD THIS */
    const chartLabels = salesByDate.map((d) => d._id);
    const chartValues = salesByDate.map((d) => d.total);

    /* =====================================================
       5. RENDER DASHBOARD
    ===================================================== */

    res.render("dashboard", {
      totalCustomers,
      lifetime,
      filtered,
      filter,
      start,
      end,
      chartLabels,
      chartValues,
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

    // -------- DATE RANGE (SAME AS DASHBOARD) --------
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

    // -------- AGGREGATION --------
    const salesData = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: fromDate, $lte: toDate },
          status: "completed",
        },
      },
      { $unwind: "$items" },
      {
        $match: {
          "items.status": "delivered",
        },
      },
      {
        $project: {
          orderId: "$_id",
          date: "$createdAt",
          product: "$items.productName",
          quantity: "$items.quantity",
          amount: "$items.subtotal",
        },
      },
      { $sort: { date: -1 } },
    ]);

    // -------- PDF SETUP --------
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report.pdf`
    );

    doc.pipe(res);

    doc.fontSize(18).text("ReadNest Sales Report", { align: "center" });
    doc
      .fontSize(10)
      .text(`Period: ${fromDate.toDateString()} - ${toDate.toDateString()}`, {
        align: "center",
      });

    doc.moveDown(2);

    let totalRevenue = 0;

    if (!salesData.length) {
      doc.fontSize(12).text("No sales found for selected period.");
    } else {
      salesData.forEach((item, index) => {
        totalRevenue += item.amount;

        doc
          .fontSize(10)
          .text(
            `${index + 1}. Order: ${item.orderId}
   Product: ${item.product}
   Qty: ${item.quantity}
   Date: ${new Date(item.date).toDateString()}
   Amount: ₹${item.amount.toFixed(2)}`
          )
          .moveDown(0.6);
      });
    }

    doc.moveDown();
    doc
      .fontSize(14)
      .text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, {
        underline: true,
      });

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

    // -------- DATE RANGE --------
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
      {
        $match: {
          "items.status": "delivered",
        },
      },
      {
        $project: {
          orderId: "$_id",
          date: "$createdAt",
          product: "$items.productName",
          quantity: "$items.quantity",
          amount: "$items.subtotal",
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "Order ID", key: "orderId", width: 25 },
      { header: "Date", key: "date", width: 15 },
      { header: "Product", key: "product", width: 30 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Amount", key: "amount", width: 15 },
    ];

    salesData.forEach((row) => {
      sheet.addRow({
        orderId: row.orderId.toString(),
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

