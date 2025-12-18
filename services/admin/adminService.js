import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import PDFDocument from "pdfkit";
import bcrypt from "bcrypt";

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
      return res.render("admin-login", { message: "Invalid password" });
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

    /* ================= BASIC COUNTS ================= */

    const totalCustomers = await User.countDocuments({ isBlocked: false });
    const totalOrders = await Order.countDocuments();

    /* ================= ITEM-LEVEL STATS ================= */

    const itemStats = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.status",
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$items.subtotal", 0] } },
        },
      },
    ]);

    let totalSales = 0;
    let pendingOrders = 0;

    itemStats.forEach((stat) => {
      if (stat._id === "delivered") {
        totalSales = stat.revenue;
      } else if (stat._id === "ordered" || stat._id === "processing") {
        pendingOrders += stat.count;
      }
    });

    /* ================= SALES CHART (DELIVERED) ================= */

    const salesByDate = await Order.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.status": "delivered",
        },
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

    const chartLabels = salesByDate.map((d) => d._id);
    const chartValues = salesByDate.map((d) => d.total);

    /* ================= DATE HELPERS ================= */

    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    /* ================= TODAY REVENUE ================= */

    const todayAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.status": "delivered",
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$items.subtotal" },
        },
      },
    ]);

    const todayRevenue = todayAgg[0]?.total || 0;

    /* ================= MONTHLY REVENUE ================= */

    const thisMonthAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.status": "delivered",
          createdAt: { $gte: startOfThisMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$items.subtotal" },
        },
      },
    ]);

    const lastMonthAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.status": "delivered",
          createdAt: {
            $gte: startOfLastMonth,
            $lte: endOfLastMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$items.subtotal" },
        },
      },
    ]);

    const monthlyRevenue = thisMonthAgg[0]?.total || 0;
    const lastMonthRevenue = lastMonthAgg[0]?.total || 0;

    /* ================= GROWTH ================= */

    const growthPercent =
      lastMonthRevenue > 0
        ? Number(
            (
              ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) *
              100
            ).toFixed(1)
          )
        : 0;

    const normalizedGrowth = Math.max(
      0,
      Math.min(100, Math.abs(growthPercent))
    );

    /* ================= TARGET LOGIC ================= */

    const monthlyTarget = 30000; // 🔹 move to DB later if needed

    const targetPercent = monthlyTarget
      ? (monthlyRevenue / monthlyTarget) * 100
      : 0;

    let targetStatus = "At Risk";
    if (targetPercent >= 100) {
      targetStatus = "Achieved";
    } else if (targetPercent >= 70) {
      targetStatus = "On Track";
    }

    /* ================= RENDER ================= */

    res.render("dashboard", {
      totalCustomers,
      totalOrders,
      pendingOrders,
      totalSales,

      chartLabels,
      chartValues,

      todayRevenue,
      monthlyRevenue,
      monthlyTarget,

      growthPercent,
      normalizedGrowth,
      targetStatus,
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
    const range = req.query.range || "monthly";
    const now = new Date();
    let startDate;

    if (range === "daily") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "weekly") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const salesOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: "paid",
          status: { $ne: "cancelled" },
        },
      },
      {
        $project: {
          orderId: "$_id",
          date: "$createdAt",
          amount: {
            $cond: [{ $gt: ["$total", 0] }, "$total", 0],
          },
        },
      },
      { $sort: { date: -1 } },
    ]);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report-${range}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text("ReadNest Sales Report", { align: "center" });
    doc.fontSize(10).text(`Range: ${range.toUpperCase()}`, { align: "center" });
    doc.moveDown(2);

    let totalRevenue = 0;

    if (!salesOrders.length) {
      doc.fontSize(12).text("No paid orders found for this period.");
    } else {
      salesOrders.forEach((order, index) => {
        const amount = Number(order.amount) || 0;
        totalRevenue += amount;

        doc
          .fontSize(10)
          .text(
            `${index + 1}. Order: ${order.orderId} | Date: ${new Date(
              order.date
            ).toDateString()} | Amount: ₹${amount.toFixed(2)}`
          )
          .moveDown(0.4);
      });
    }

    doc.moveDown(1);
    doc.fontSize(14).text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, {
      underline: true,
    });

    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor("#777")
      .text(`Generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });

    doc.end();
  } catch (err) {
    console.error("Sales Report Error:", err);
    res.status(500).send("Unable to generate sales report");
  }
};
