import Product from "../../models/productsSchema.js";
import User from "../../models/userSchema.js";
import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js";
import Category from "../../models/categorySchema.js"

export const getCheckout = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) return res.redirect("/login");

    const userData = await User.findById(userId).lean();

    let cart = [];
    const buyNowId = req.query.buyNow;

    // 🟢 Function to calculate offer price
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
        offerPrice,
        bestDiscount,
        finalPrice: offerPrice || regularPrice,
      };
    };

    if (buyNowId) {
      const product = await Product.findById(buyNowId).lean();
      if (!product) return res.redirect("/notfound");

      const qty = req.session.buyNowQuantity || 1;

      const { finalPrice, offerPrice } = await calculateOffer(product);

      req.session.buyNowProductId = buyNowId;
      req.session.buyNowPrice = finalPrice;

      cart = [
        {
          _id: product._id,
          name: product.productName,
          image: product.productImage[0],
          quantity: qty,
          price: finalPrice,
          regularPrice: product.regularPrice,
          offerPrice: offerPrice,
          stock: product.stock,
        },
      ];
    }

    // 🟢 NORMAL CART CHECKOUT
    else {
      const cartData = await Cart.findOne({ userId })
        .populate("items.productId")
        .lean();

      cart = cartData
        ? await Promise.all(
            cartData.items.map(async (item) => {
              const p = item.productId;
              const { finalPrice, offerPrice } = await calculateOffer(p);

              return {
                _id: p._id,
                name: p.productName,
                image: p.productImage[0],
                quantity: item.quantity,
                price: finalPrice,
                regularPrice: p.regularPrice,
                offerPrice,
                stock: p.stock,
              };
            })
          )
        : [];
    }

    // 🟢 LOAD ADDRESSES
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

    return res.render("checkout", {
      user: userData,
      cart,
      addresses,
      selectedAddress,
      isBuyNow: Boolean(buyNowId),
    });
  } catch (error) {
    console.log("Checkout Load Error:", error);
    return res.redirect("/notfound");
  }
};


export const setSelectedAddress = (req, res) => {
  try {
    const { addressId } = req.body;

    req.session.selectedAddressId = addressId;

    return res.json({
      success: true,
      message: "Address selected",
    });
  } catch (error) {
    console.log("Set address error:", error);
    return res.json({ success: false });
  }
};

export const addNewAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.json({ success: false });

    const addressData = req.body;

    let addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      addressDoc = new Address({
        userId,
        addresses: [addressData],
      });
    } else {
      addressDoc.addresses.push(addressData);
    }

    await addressDoc.save();

    return res.json({ success: true });
  } catch (error) {
    console.error("Add address error:", error);
    return res.json({ success: false });
  }
};

export const saveAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const {
      addressId,
      addressLabel,
      houseName,
      houseNumber,
      street,
      post,
      district,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;

    let addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      addressDoc = new Address({
        userId,
        addresses: [
          {
            addressLabel,
            houseName,
            houseNumber,
            street,
            post,
            district,
            state,
            pincode,
            phone,
            altPhone,
          },
        ],
      });
    } else {
      if (addressId) {
        const addr = addressDoc.addresses.id(addressId);
        addr.addressLabel = addressLabel;
        addr.houseName = houseName;
        addr.houseNumber = houseNumber;
        addr.street = street;
        addr.post = post;
        addr.district = district;
        addr.state = state;
        addr.pincode = pincode;
        addr.phone = phone;
        addr.altPhone = altPhone;
      } else {
        addressDoc.addresses.push({
          addressLabel,
          houseName,
          houseNumber,
          street,
          post,
          district,
          state,
          pincode,
          phone,
          altPhone,
        });
      }
    }

    await addressDoc.save();
    return res.json({ success: true });
  } catch (err) {
    console.log("Save address error:", err);
    return res.json({ success: false });
  }
};

export const getBuyNow = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) return res.redirect("/notfound");

  req.session.buyNowProductId = product._id;
  req.session.buyNowQuantity = 1;
  req.session.buyNowUnitPrice = product.salePrice || product.regularPrice;

  return res.redirect(`/checkout?buyNow=${product._id}`);
};
