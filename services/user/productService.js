import User from "../../models/userSchema.js";
import Product from "../../models/productsSchema.js";
import Category from "../../models/categorySchema.js";
import Banner from "../../models/bannerSchema.js";


export const homeLoad = async(req, res) => {
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
          specialOfferType: { $in: ["none", null, undefined] },
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
          .sort(sortQuery)
          .skip(skip)
          .limit(limit);
    
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);
    
        let userData = null;
        if (user) {
          userData = await User.findById(user._id);
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
    
        const isHome = req.originalUrl === "/" ;
       
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
          sort,
          homeBanner: homeBanner ? homeBanner.bannerImage : null,
          isHome : isHome
        });
      } catch (error) {
        res.redirect("/notfound");
      }
}

export const productDetails = async(req, res) => {
    try {
        const productId = req.query.id;
        const page = req.query.page || 1;
    
        const q = { ...req.query };
        delete q.id;
    
        const baseQuery = new URLSearchParams(q).toString();
    
        const product = await Product.findById(productId).populate("category");
        if (!product) return res.redirect("/");
    
        const categoryDoc = await Category.findOne({
          categoryName: product.category,
        });
    
        if (!categoryDoc || !categoryDoc.isListed) {
          return res.redirect("/");
        }
    
        let similarProducts = [];
    
        if (product.category && product.category.isListed) {
          similarProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId },
            isListed: true,
          }).limit(4);
        }
    
        return res.render("productsDetails", {
          product,
          similarProducts,
          currentPage: page,
          baseQuery,
         
        });
      } catch (error) {
        console.log(error);
        return res.redirect("/notFound");
      }
}

export const comboOffers = async(req, res) => {
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
    
        const comboBanner = await Banner.findOne({ title: "combo" });
    
        if (totalProducts < 0) {
          res.render("noOffers");
        } else {
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
            categories,
            comboBanner: comboBanner ? comboBanner.bannerImage : null,
          });
        }
      } catch (error) {
        res.redirect("/notfound");
      }
}

export const rushHour = async(req, res) => {
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

    const rushHourBanner = await Banner.findOne({ title: "rushHour" });

    if (totalProducts <= 0) {
      res.render("noOffers");
    } else {
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
        rushHourBanner: rushHourBanner ? rushHourBanner.bannerImage : null,
      });
    }
  } catch (error) {
    console.log(error);
    res.redirect("/notfound");
  }
}

export const searchLive = async(req, res) => {
    try {
        const query = req.query.q;
        if(!query || query.trim() === "") {
            return res.json([]);
        }
        const regex = new RegExp(query, "i");

        const products = await Product.find({
            $or: [
                {productName: regex},
                {author: regex},
                {category:regex}
            ]
        }).limit(8);
        res.json(products);
    } catch (error) {
    }
}