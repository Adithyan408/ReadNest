import User from '../../models/userSchema.js';
import Product from '../../models/productsSchema.js';
import Category from '../../models/categorySchema.js';
import Banner from '../../models/bannerSchema.js';
import Wishlist from '../../models/wishlistSchema.js';
import { HttpStatus } from '../../helpers/statusCodes.js';

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
        : req.query.languages.split(',');
    }

    let filter = { isListed: true };

    if (category) filter.category = category;
    if (selectedLanguages.length > 0) {
      filter.language = { $in: selectedLanguages };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter).lean();

    const now = new Date();

    let processedProducts = await Promise.all(
      products.map(async (p) => {
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
        }).lean();

        if (categoryDoc?.offer?.isOffer) {
          const valid =
            (!categoryDoc.offer.startDate ||
              now >= new Date(categoryDoc.offer.startDate)) &&
            (!categoryDoc.offer.endDate ||
              now <= new Date(categoryDoc.offer.endDate));
          if (valid) categoryDiscount = categoryDoc.offer.discountValue;
        }

        const bestDiscount = Math.max(productDiscount, categoryDiscount);

        const offerPrice =
          bestDiscount > 0
            ? Math.round(p.regularPrice - (p.regularPrice * bestDiscount) / 100)
            : null;

        return {
          ...p,
          offerPrice,
          effectivePrice: offerPrice ?? p.regularPrice,
        };
      }),
    );

    let filteredProducts = processedProducts;

    if (min || max) {
      const minVal = min ? parseInt(min) : null;
      const maxVal = max ? parseInt(max) : null;

      filteredProducts = filteredProducts.filter((p) => {
        if (minVal !== null && p.effectivePrice < minVal) return false;
        if (maxVal !== null && p.effectivePrice > maxVal) return false;
        return true;
      });
    }

    switch (sort) {
      case 'priceAsc':
        filteredProducts.sort((a, b) => a.effectivePrice - b.effectivePrice);
        break;

      case 'priceDesc':
        filteredProducts.sort((a, b) => b.effectivePrice - a.effectivePrice);
        break;

      case 'nameAsc':
        filteredProducts.sort((a, b) =>
          a.productName.localeCompare(b.productName),
        );
        break;

      case 'nameDesc':
        filteredProducts.sort((a, b) =>
          b.productName.localeCompare(a.productName),
        );
        break;

      case 'newest':
        filteredProducts.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        break;

      case 'oldest':
        filteredProducts.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
        break;
    }

    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);

    const paginatedProducts = filteredProducts.slice(skip, skip + limit);

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
    let languages = await Product.distinct('language', { isListed: true });
    languages = languages.filter((l) => l && l.trim() !== '');

    const homeBanner = await Banner.findOne({ title: 'home-page' });

    // eslint-disable-next-line no-undef
    const queryParams = new URLSearchParams();
    if (category) queryParams.set('category', category);
    if (min) queryParams.set('min', min);
    if (max) queryParams.set('max', max);
    if (sort) queryParams.set('sort', sort);
    selectedLanguages.forEach((l) => queryParams.append('languages', l));

    res.render('home', {
      user: userData,
      products: paginatedProducts,
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
      isHome: req.originalUrl === '/',
      wishlistProducts,
    });
  } catch (error) {
    console.error('Home load error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/notfound');
  }
};

// GET /api/product/status/:id
export const getProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select(
      'isListed stock category',
    );

    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).json({ exists: false });
    }

    const category = await Category.findOne({
      categoryName: product.category,
    }).select('isListed');

    res.json({
      isProductListed: product.isListed,
      isCategoryListed: category?.isListed ?? false,
      isOutOfStock: product.stock <= 0,
    });
  } catch (err) {
    console.error(err);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Status check failed' });
  }
};

export const productDetails = async (req, res) => {
  try {
    const productId = req.query.id;
    const page = req.query.page || 1;
    const userId = req.session.user?._id;
    const q = { ...req.query };
    delete q.id;

    // eslint-disable-next-line no-undef
    const baseQuery = new URLSearchParams(q).toString();

    let product = await Product.findById(productId);
    if (!product) return res.redirect('/');

    const categoryDoc = await Category.findOne({
      categoryName: product.category,
    });

    if (!product.isListed || !categoryDoc?.isListed) {
      return res.redirect('/');
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
        regularPrice - (regularPrice * bestDiscount) / 100,
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
            regularPrice - (regularPrice * bestDiscount) / 100,
          );
        } else {
          obj.offerPrice = null;
        }

        return obj;
      }),
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

    return res.render('productsDetails', {
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
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/notFound');
  }
};

export const searchLive = async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query) return res.json([]);

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const products = await Product.find({
      isListed: true,
      stock: { $gt: 0 },
      $or: [{ productName: regex }, { author: regex }, { category: regex }],
    })
      .select('_id productName author productImage')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    res.json(products);
  } catch (error) {
    console.error('Live search error:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json([]);
  }
};
