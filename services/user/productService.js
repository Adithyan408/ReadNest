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
    let sort = req.query.sort || null;
    let selectedLanguages = [];

    if (req.query.languages) {
      if (Array.isArray(req.query.languages)) {
        selectedLanguages = req.query.languages;
      } else {
        selectedLanguages = req.query.languages.split(",");
      }
    }

    let filter = {
      isListed: true,
    };

    if (category) filter.category = category;

    if (min || max) {
      filter.regularPrice = {};
      if (min) filter.regularPrice.$gte = parseInt(min);
      if (max) filter.regularPrice.$lte = parseInt(max);
    }

    if (selectedLanguages.length > 0) {
      filter.language = { $in: selectedLanguages };
    }

    let sortQuery = {};

    switch (sort) {
      case "priceAsc":
        sortQuery = { regularPrice: 1 };
        break;

      case "priceDesc":
        sortQuery = { regularPrice: -1 };
        break;

      case "nameAsc":
        sortQuery = { productName: 1 };
        break;

      case "nameDesc":
        sortQuery = { productName: -1 };
        break;

      case "newest":
        sortQuery = { createdAt: -1 };
        break;

      case "oldest":
        sortQuery = { createdAt: 1 };
        break;

      default:
        sortQuery = {};
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .populate("category")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const processedProducts = await Promise.all(
      products.map(async (p) => {
        const productObj = p.toObject();
        const regularPrice = p.regularPrice;
        const now = new Date();

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
          productObj.offerPrice = Math.round(
            regularPrice - (regularPrice * bestDiscount) / 100
          );
        } else {
          productObj.offerPrice = null;
        }

        return productObj;
      })
    );

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    let wishlistProducts = [];
    let userData = null;
    if (user) {
      userData = await User.findById(user._id);

      const wishlist = await Wishlist.findOne({
        userId: user._id,
      }).lean();

      wishlistProducts = wishlist
        ? wishlist.products.map((id) => id.toString())
        : [];
    }

    const categories = await Category.find({ isListed: true });
    let languages = await Product.distinct("language", { isListed: true });

    languages = languages.filter((lang) => lang && lang.trim() !== "");

    const homeBanner = await Banner.findOne({ title: "home-page" });

    const queryParams = new URLSearchParams();

    if (category) queryParams.set("category", category);
    if (min) queryParams.set("min", min);
    if (max) queryParams.set("max", max);
    if (sort) queryParams.set("sort", sort);

    selectedLanguages.forEach((lang) => queryParams.append("languages", lang));

    const isHome = req.originalUrl === "/";

    const baseQuery = queryParams.toString();
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
      baseQuery,
      sort,
      homeBanner: homeBanner ? homeBanner.bannerImage : null,
      isHome: isHome,
      wishlistProducts,
    });
  } catch (error) {
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

    return res.render("productsDetails", {
      product,
      similarProducts,
      currentPage: page,
      baseQuery,
      wishlistProducts,
      user: req.session.user,
      isProductListed, 
      isCategoryListed
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
