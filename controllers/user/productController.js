import User from "../../models/userSchema.js";
import Product from "../../models/productsSchema.js";
import Category from "../../models/categorySchema.js";

export const loadHome = async (req, res) => {
  try {
    const user = req.session.user;
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

    let filter = {
      isListed: true,
      specialOfferType: { $in: ["none", null, undefined] }
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


export const getComboOffers = async (req, res) => {
  try {
    const user = req.session.user;

  
    const min = req.query.min || null;
    const max = req.query.max || null;

    let selectedLanguages = [];
    if (req.query.languages) {
      if (Array.isArray(req.query.languages)) {
        selectedLanguages = req.query.languages;
      } else {
        selectedLanguages = req.query.languages.split(",");
      }
    }

    if (req.query.category) {
      return res.redirect("/");
    }

 
    let filter = {
      isListed: true,
      specialOfferType: "combo",
    };
    const categories = await Category.find({ isListed: true });


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

    const comboProducts = await Product.find(filter)
      .sort({ productName: 1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const languages = await Product.distinct("language", {
      specialOfferType: "combo",
    });

    const queryParams = new URLSearchParams();

    if (min) queryParams.set("min", min);
    if (max) queryParams.set("max", max);
    selectedLanguages.forEach((lang) => queryParams.append("languages", lang));

    const baseQuery = queryParams.toString();

    res.render("combo", {
      products: comboProducts,
      totalPages,
      totalProducts,
      currentPage: page,
      languages,
      selectedLanguages,
      min,
      max,
      baseQuery,
      user,
      categories
    });
  } catch (error) {
    console.log(error);
    res.redirect("/notfound");
  }
};

export const getRushHourOffers = async (req, res) => {
  try {
    const user = req.session.user;

    const min = req.query.min || null;
    const max = req.query.max || null;

    let selectedLanguages = [];
    if (req.query.languages) {
      if (Array.isArray(req.query.languages)) {
        selectedLanguages = req.query.languages;
      } else {
        selectedLanguages = req.query.languages.split(",");
      }
    }

    if (req.query.category) {
      return res.redirect("/");
    }

    let filter = {
      isListed: true,
      specialOfferType: "rush-hour",
    };

    const categories = await Category.find({ isListed: true });

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

    const rushProducts = await Product.find(filter)
      .sort({ productName: 1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const languages = await Product.distinct("language", {
      specialOfferType: "rush-hour",
    });

    const queryParams = new URLSearchParams();

    if (min) queryParams.set("min", min);
    if (max) queryParams.set("max", max);
    selectedLanguages.forEach((lang) => queryParams.append("languages", lang));

    const baseQuery = queryParams.toString();


    res.render("rush-hour", {
      products: rushProducts,
      totalPages,
      totalProducts,
      currentPage: page,
      languages,
      selectedLanguages,
      min,
      max,
      baseQuery,
      user,
      categories,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/notfound");
  }
};

