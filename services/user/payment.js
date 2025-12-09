import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";
import Product from "../../models/productsSchema.js";
import Cart from "../../models/cartSchema.js";
import Category from "../../models/categorySchema.js";
import Order from "../../models/orderSchema.js";

export const loadPayment = async (req, res) => {
  try {
    const calculateOffer = async (product) => {
      const now = new Date();
      const regularPrice = product.regularPrice;

      let productDiscount = 0;
      if (product.offer?.isOffer) {
        const start = product.offer.startDate;
        const end = product.offer.endDate;

        const valid =
          (!start || now >= new Date(start)) && (!end || now <= new Date(end));

        if (valid) productDiscount = product.offer.discountValue;
      }

      let categoryDiscount = 0;
      const categoryDoc = await Category.findOne({
        categoryName: product.category,
      });

      if (categoryDoc?.offer?.isOffer) {
        const start = categoryDoc.offer.startDate;
        const end = categoryDoc.offer.endDate;

        const valid =
          (!start || now >= new Date(start)) && (!end || now <= new Date(end));

        if (valid) categoryDiscount = categoryDoc.offer.discountValue;
      }

      const bestDiscount = Math.max(productDiscount, categoryDiscount);

      const offerPrice =
        bestDiscount > 0
          ? Math.round(regularPrice - (regularPrice * bestDiscount) / 100)
          : null;

      return {
        regularPrice,
        offerPrice,
        finalPrice: offerPrice || regularPrice,
        bestDiscount,
      };
    };

    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const userData = await User.findById(userId).lean();

    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    let selectedAddress = null;

    if (addresses.length > 0) {
      if (req.session.selectedAddressId) {
        selectedAddress = addresses.find(
          (a) => a._id.toString() === req.session.selectedAddressId
        );
      }

      if (!selectedAddress) {
        selectedAddress =
          addresses.find((a) => a.addressLabel === "Home") || addresses[0];
      }
    }

    let cart = [];
    const buyNowId = req.query.buyNow;

    if (buyNowId) {
      const product = await Product.findById(buyNowId).lean();
      if (!product) return res.redirect("/notfound");

      const qty = req.session.buyNowQuantity || 1;

      const offer = await calculateOffer(product);

      req.session.buyNowProductId = buyNowId;
      req.session.buyNowUnitPrice = offer.finalPrice;

      cart = [
        {
          _id: product._id,
          name: product.productName,
          image: product.productImage[0],
          quantity: qty,
          price: offer.finalPrice,
          offerPrice: offer.offerPrice,
          regularPrice: product.regularPrice,
          stock: product.stock,
        },
      ];
    } else {
      const cartData = await Cart.findOne({ userId })
        .populate("items.productId")
        .lean();

      cart = cartData
        ? await Promise.all(
            cartData.items.map(async (i) => {
              const p = i.productId;
              const offer = await calculateOffer(p);

              return {
                _id: p._id,
                name: p.productName,
                image: p.productImage[0],
                quantity: i.quantity,
                price: offer.finalPrice,
                offerPrice: offer.offerPrice,
                regularPrice: p.regularPrice,
                stock: p.stock,
              };
            })
          )
        : [];
    }

    let subtotal = 0;
    cart.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    const discount = Math.floor(subtotal * 0.05);
    const totalAmount = subtotal - discount;

    req.session.total = totalAmount;

    res.render("payment", {
      user: userData,
      addresses,
      selectedAddress,
      cart,
      subtotal,
      discount,
      totalAmount,
      isBuyNow: Boolean(buyNowId),
    });
  } catch (error) {
    console.log("Load Payment Error:", error);
    res.render("notFound");
  }
};

export const postCoupon = async (req, res) => {
  try {
    const { coupon, totalAmount } = req.body;

    if (!coupon || !totalAmount) {
      return res.json({ success: false, message: "Invalid data" });
    }

    const code = coupon.toUpperCase();

    if (req.session.appliedCoupon === code) {
      return res.json({
        success: false,
        message: "Coupon already applied!",
      });
    }

    let discountValue = 0;

    if (code === "RUSH25") {
      const randomRate = Math.random() * 0.25;
      discountValue = Math.floor(totalAmount * randomRate);

      req.session.appliedCoupon = code;

      return res.json({
        success: true,
        discount: discountValue,
        finalAmount: totalAmount - discountValue,
        message: "25% discount applied!",
      });
    }

    if (code === "FLAT20") {
      discountValue = 20;

      req.session.appliedCoupon = code;

      return res.json({
        success: true,
        discount: discountValue,
        finalAmount: totalAmount - discountValue,
        message: "₹20 discount applied!",
      });
    }

    return res.json({
      success: false,
      message: "Invalid coupon code!",
    });
  } catch (err) {
    console.log("Coupon Error:", err);
    return res.json({ success: false, message: "Server Error" });
  }
};


export const orderPlaced = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const totalAmount = req.session.total;

    if (!userId) return res.redirect("/login");

    const userData = await User.findById(userId).lean();
    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc?.addresses || [];

    let selectedAddress =
      addresses.find(
        (a) => a._id.toString() === req.session.selectedAddressId
      ) ||
      addresses.find((a) => a.addressLabel === "Home") ||
      addresses[0] ||
      null;

    const calculateOffer = async (product) => {
      const now = new Date();
      const regularPrice = product.regularPrice;

      
      let productDiscount = 0;
      if (product.offer?.isOffer) {
        const start = product.offer.startDate;
        const end = product.offer.endDate;

        const valid =
          (!start || now >= new Date(start)) && (!end || now <= new Date(end));

        if (valid) productDiscount = product.offer.discountValue;
      }

  
      let categoryDiscount = 0;
      const categoryDoc = await Category.findOne({
        categoryName: product.category,
      });

      if (categoryDoc?.offer?.isOffer) {
        const start = categoryDoc.offer.startDate;
        const end = categoryDoc.offer.endDate;

        const valid =
          (!start || now >= new Date(start)) && (!end || now <= new Date(end));

        if (valid) categoryDiscount = categoryDoc.offer.discountValue;
      }

   
      const bestDiscount = Math.max(productDiscount, categoryDiscount);

      const offerPrice =
        bestDiscount > 0
          ? Math.round(regularPrice - (regularPrice * bestDiscount) / 100)
          : null;

      const finalPrice = offerPrice || regularPrice;

      return {
        regularPrice,
        offerPrice,
        finalPrice,
        bestDiscount,
      };
    };

    let cartItems = [];

   
    if (req.session.buyNowProductId) {
      const product = await Product.findById(req.session.buyNowProductId);
      const qty = req.session.buyNowQuantity || 1;

      const offer = await calculateOffer(product);

      cartItems = [
        {
          product: product._id,
          productName: product.productName,
          regularPrice: offer.regularPrice,
          offerPrice: offer.offerPrice,
          finalPrice: offer.finalPrice,
          bestDiscount: offer.bestDiscount,
          quantity: qty,
          subtotal: offer.finalPrice * qty,
          productImage: product.productImage,
          stock: product.stock,
        },
      ];
    }

   
    else {
      const cartData = await Cart.findOne({ userId }).populate(
        "items.productId"
      );

      cartItems = await Promise.all(
        cartData.items.map(async (i) => {
          const p = i.productId;
          const offer = await calculateOffer(p);

          return {
            product: p._id,
            productName: p.productName,
            regularPrice: offer.regularPrice,
            offerPrice: offer.offerPrice,
            finalPrice: offer.finalPrice,
            bestDiscount: offer.bestDiscount,
            quantity: i.quantity,
            subtotal: offer.finalPrice * i.quantity,
            productImage: p.productImage,
            stock: p.stock,
          };
        })
      );
    }

    
    const newOrder = new Order({
      user: userId,
      items: cartItems,
      total: totalAmount,
      paymentId: null,
      status: "processing",
      address: selectedAddress ? { ...selectedAddress } : null,
    });

    await newOrder.save();

   
    for (let item of cartItems) {
      await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }

  
    if (!req.session.buyNowProductId) {
      await Cart.updateOne({ userId }, { items: [] });
    }

  
    req.session.appliedCoupon = null;
    req.session.buyNowQuantity = null;
    req.session.buyNowProductId = null;

    res.render("placed", {
      user: userData,
      addresses,
      selectedAddress,
      totalAmount,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.log("Order placing error:", error);
    res.render("notFound");
  }
};
