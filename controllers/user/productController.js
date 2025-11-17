import User from "../../models/userSchema.js";
import Product from "../../models/productsSchema.js";
import Category from "../../models/categorySchema.js";

export const loadHome = async (req, res) => {
  try {
    const user = req.session.user;

    // ----------------------------
    // GET FILTERS
    // ----------------------------
    const category = req.query.category || null;
    const min = req.query.min || null;
    const max = req.query.max || null;

    let selectedLanguages = [];

    if (req.query.languages) {
      if (Array.isArray(req.query.languages)) {
        selectedLanguages = req.query.languages; // languages=English&languages=Tamil
      } else {
        selectedLanguages = req.query.languages.split(","); // languages=English,Tamil
      }
    }

    let filter = { isListed: true };

    if (category) filter.category = category;

    if (min || max) {
      filter.regularPrice = {};
      if (min) filter.regularPrice.$gte = parseInt(min);
      if (max) filter.regularPrice.$lte = parseInt(max);
    }

    if (selectedLanguages.length > 0) {
      filter.language = { $in: selectedLanguages };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .sort({ productName: 1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    let userData = null;
    if (user) {
      userData = await User.findById(user._id);
    }

    const categories = await Category.find({ isListed: true });
    const languages = await Product.distinct("language", { isListed: true });

    const queryParams = new URLSearchParams();

    if (category) queryParams.set("category", category);
    if (min) queryParams.set("min", min);
    if (max) queryParams.set("max", max);

    selectedLanguages.forEach((lang) => queryParams.append("languages", lang));

    const baseQuery = queryParams.toString();
    res.render("home", {
      user: userData,
      products,
      totalPages,
      currentPage: page,

      categories,
      selectedCategory: category,

      selectedLanguages,
      languages,

      min,
      max,
      baseQuery,
    });
  } catch (error) {
    console.log("Home page not Found", error);
    res.status(500).send("Server Error");
  }
};

export const getProductsDetails = async (req, res) => {
  try {
    const productId = req.query.id;
    const page = req.query.page || 1;

    // Clone all query params except id
    const q = { ...req.query };
    delete q.id; // remove product ID

    // Build the query string for BACK button
    const baseQuery = new URLSearchParams(q).toString();

    const product = await Product.findById(productId);
    if (!product) return res.redirect("/notfound");

    const similarProducts = await Product.find({
      category: product.category,
      _id: { $ne: productId },
    }).limit(4);

    res.render("productsDetails", {
      product,
      similarProducts,
      currentPage: page,
      baseQuery,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/notfound");
  }
};
