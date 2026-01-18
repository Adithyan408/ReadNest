import User from "../../models/userSchema.js";
import Product from "../../models/productsSchema.js";
import Category from "../../models/categorySchema.js";
import Banner from "../../models/bannerSchema.js";
import Wishlist from "../../models/wishlistSchema.js";

export const homeLoad = async (req, res) => {
  try {
    const user = req.session.user;
    const category = req.query.category || null;

    const min = Array.isArray(req.query.min)
      ? req.query.min.at(-1)
      : req.query.min;

    const max = Array.isArray(req.query.max)
      ? req.query.max.at(-1)
      : req.query.max;

    const sort = req.query.sort || null;

    let selectedLanguages = [];
    if (req.query.languages) {
      selectedLanguages = Array.isArray(req.query.languages)
        ? req.query.languages
        : req.query.languages.split(",");
    }

    let filter = { isListed: true };

    if (category) filter.category = category;
    if (selectedLanguages.length > 0) {
      filter.language = { $in: selectedLanguages };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .skip(skip)
      .limit(limit);

    let processedProducts = await Promise.all(
      products.map(async (p) => {
        const productObj = p.toObject();
        const now = new Date();
        const regularPrice = p.regularPrice;

        let productDiscount = 0;
        if (p.offer?.isOffer) {
          const valid =
            (!p.offer.startDate || now >= new Date(p.offer.startDate)) &&
            (!p.offer.endDate || now <= new Date(p.offer.endDate));
          if (valid) productDiscount = p.offer.discountValue;
        }

        let categoryDiscount = 0;
        const categoryDoc = await Category.findOne({
          categoryName: p.category,
        });

        if (categoryDoc?.offer?.isOffer) {
          const valid =
            (!categoryDoc.offer.startDate ||
              now >= new Date(categoryDoc.offer.startDate)) &&
            (!categoryDoc.offer.endDate ||
              now <= new Date(categoryDoc.offer.endDate));
          if (valid) categoryDiscount = categoryDoc.offer.discountValue;
        }

        const bestDiscount = Math.max(productDiscount, categoryDiscount);

        productObj.offerPrice =
          bestDiscount > 0
            ? Math.round(regularPrice - (regularPrice * bestDiscount) / 100)
            : null;

        productObj.effectivePrice =
          productObj.offerPrice ?? regularPrice;

        return productObj;
      })
    );

    if (min || max) {
      const minVal = min ? parseInt(min) : null;
      const maxVal = max ? parseInt(max) : null;

      processedProducts = processedProducts.filter((p) => {
        if (minVal !== null && p.effectivePrice < minVal) return false;
        if (maxVal !== null && p.effectivePrice > maxVal) return false;
        return true;
      });
    }

    if (sort === "priceAsc") {
      processedProducts.sort((a, b) => a.effectivePrice - b.effectivePrice);
    }

    if (sort === "priceDesc") {
      processedProducts.sort((a, b) => b.effectivePrice - a.effectivePrice);
    }

    if (sort === "nameAsc") {
      processedProducts.sort((a, b) =>
        a.productName.localeCompare(b.productName)
      );
    }

    if (sort === "nameDesc") {
      processedProducts.sort((a, b) =>
        b.productName.localeCompare(a.productName)
      );
    }

    if (sort === "newest") {
      processedProducts.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    if (sort === "oldest") {
      processedProducts.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    }

    const totalProducts =
      min || max
        ? processedProducts.length
        : await Product.countDocuments(filter);

    const totalPages = Math.ceil(totalProducts / limit);

    let wishlistProducts = [];
    let userData = null;

    if (user) {
      userData = await User.findById(user._id);
      const wishlist = await Wishlist.findOne({ userId: user._id }).lean();
      wishlistProducts = wishlist
        ? wishlist.products.map((id) => id.toString())
        : [];
    }

    const categories = await Category.find({ isListed: true });
    let languages = await Product.distinct("language", { isListed: true });
    languages = languages.filter((l) => l && l.trim() !== "");

    const homeBanner = await Banner.findOne({ title: "home-page" });

    const queryParams = new URLSearchParams();
    if (category) queryParams.set("category", category);
    if (min) queryParams.set("min", min);
    if (max) queryParams.set("max", max);
    if (sort) queryParams.set("sort", sort);
    selectedLanguages.forEach((l) => queryParams.append("languages", l));

    res.render("home", {
      user: userData,
      products: processedProducts,
      totalPages,
      currentPage: page,
      categories,
      selectedCategory: category,
      selectedLanguages,
      languages,
      min,
      max,
      baseQuery: queryParams.toString(),
      sort,
      homeBanner: homeBanner?.bannerImage || null,
      isHome: req.originalUrl === "/",
      wishlistProducts,
    });
  } catch (error) {
    console.error("Home load error:", error);
    res.redirect("/notfound");
  }
};

// GET /api/product/status/:id
export const getProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select(
      "isListed stock category"
    );

    if (!product) {
      return res.status(404).json({ exists: false });
    }

    const category = await Category.findOne({
      categoryName: product.category,
    }).select("isListed");

    res.json({
      isProductListed: product.isListed,
      isCategoryListed: category?.isListed ?? false,
      isOutOfStock: product.stock <= 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Status check failed" });
  }
};

export const productDetails = async (req, res) => {
  try {
    const productId = req.query.id;
    const page = req.query.page || 1;
    const userId = req.session.user._id;

    const q = { ...req.query };
    delete q.id;

    const baseQuery = new URLSearchParams(q).toString();

    let product = await Product.findById(productId);
    if (!product) return res.redirect("/");

    const categoryDoc = await Category.findOne({
      categoryName: product.category,
    });

    if (!product.isListed || !categoryDoc?.isListed) {
      return res.redirect("/");
    }

    const now = new Date();
    let regularPrice = product.regularPrice;

    let productDiscount = 0;
    if (product.offer?.isOffer) {
      const start = product.offer.startDate;
      const end = product.offer.endDate;

      const valid =
        (!start || now >= new Date(start)) && (!end || now <= new Date(end));

      if (valid) productDiscount = product.offer.discountValue;
    }

    let categoryDiscount = 0;
    if (categoryDoc?.offer?.isOffer) {
      const start = categoryDoc.offer.startDate;
      const end = categoryDoc.offer.endDate;

      const valid =
        (!start || now >= new Date(start)) && (!end || now <= new Date(end));

      if (valid) categoryDiscount = categoryDoc.offer.discountValue;
    }

    const bestDiscount = Math.max(productDiscount, categoryDiscount);

    let offerPrice = null;
    if (bestDiscount > 0) {
      offerPrice = Math.round(
        regularPrice - (regularPrice * bestDiscount) / 100
      );
    }

    product = {
      ...product.toObject(),
      offerPrice,
      bestDiscount,
    };

    let similarProductsRaw = await Product.find({
      category: product.category,
      _id: { $ne: productId },
      isListed: true,
    }).limit(4);

    let similarProducts = await Promise.all(
      similarProductsRaw.map(async (p) => {
        const obj = p.toObject();
        const now = new Date();
        let regularPrice = p.regularPrice;

        let productDiscount = 0;
        if (p.offer?.isOffer) {
          const start = p.offer.startDate;
          const end = p.offer.endDate;

          const valid =
            (!start || now >= new Date(start)) &&
            (!end || now <= new Date(end));

          if (valid) productDiscount = p.offer.discountValue;
        }

        let categoryDiscount = 0;
        const categoryDoc = await Category.findOne({
          categoryName: p.category,
        });

        if (categoryDoc?.offer?.isOffer) {
          const start = categoryDoc.offer.startDate;
          const end = categoryDoc.offer.endDate;

          const valid =
            (!start || now >= new Date(start)) &&
            (!end || now <= new Date(end));

          if (valid) categoryDiscount = categoryDoc.offer.discountValue;
        }

        const bestDiscount = Math.max(productDiscount, categoryDiscount);

        if (bestDiscount > 0) {
          obj.offerPrice = Math.round(
            regularPrice - (regularPrice * bestDiscount) / 100
          );
        } else {
          obj.offerPrice = null;
        }

        return obj;
      })
    );

    let wishlistProducts = [];
    if (req.session.user?._id) {
      const wishlist = await Wishlist.findOne({
        userId: req.session.user._id,
      }).lean();

      wishlistProducts = wishlist
        ? wishlist.products.map((id) => id.toString())
        : [];
    }

    const isProductListed = product.isListed;
    const isCategoryListed = categoryDoc?.isListed ?? false;

    const user = await User.findById(userId);

    return res.render("productsDetails", {
      user,
      product,
      similarProducts,
      currentPage: page,
      baseQuery,
      wishlistProducts,
      isProductListed,
      isCategoryListed,
    });
  } catch (error) {
    console.log(error);
    return res.redirect("/notFound");
  }
};

export const searchLive = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim() === "") {
      return res.json([]);
    }
    const regex = new RegExp(query, "i");

    const products = await Product.find({
      $or: [{ productName: regex }, { author: regex }, { category: regex }],
    }).limit(8);
    res.json(products);
  } catch (error) {}
};
