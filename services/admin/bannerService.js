import { ERROR_MESSAGES } from '../../helpers/errorMessages.js';
import { HttpStatus } from '../../helpers/statusCodes.js';
import Banner from '../../models/bannerSchema.js';

export const loadBanner = async (req, res) => {
  try {
    const limit = 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();

    let filter = {};

    // 🔍 SEARCH BY TITLE
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const banners = await Banner.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Banner.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.render('banner', {
      data: banners,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (error) {
    console.error('Banner Load Error:', error);
    res.status(HttpStatus.BAD_REQUEST).redirect('/pageerror');
  }
};


export const loadBannerAdd = async (req, res) => {
  try {
    res.render('addBanner', { errors: {}, oldInput: {} });
  } catch (error) {
    res.status(HttpStatus.NOT_FOUND).render('admin-error');
  }
};

export const postBannerAdd = async (req, res) => {
  try {
    const { title, startDate, endDate, status } = req.body;
    let errors = {};

    if (!title || title.trim() === '') {
      errors.title = 'Banner title is required.';
    }

    if (!startDate) {
      errors.startDate = 'Start Date is required.';
    }

    if (!endDate) {
      errors.endDate = 'End Date is required.';
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      errors.dateRange = 'Start Date cannot be after End Date.';
    }

    if (!status) {
      errors.status = 'Please select a banner status.';
    }

    if (!req.file) {
      errors.bannerImage = 'Banner image is required.';
    }

    if (Object.keys(errors).length > 0) {
      return res.render('addBanner', {
        errors,
        oldInput: req.body,
      });
    }

    const imageUrl = req.file ? req.file.path : null;
    const newBanner = new Banner({
      title,
      bannerImage: imageUrl,
      startDate,
      endDate,
      status,
    });
    await newBanner.save();
    res.redirect('/admin/banner?status=added');
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/pageerror');
  }
};

export const loadEditBanner = async (req, res) => {
  try {
    const id = req.query.id;
    const banner = await Banner.findOne({ _id: id });
    res.render('editBanner', { data: banner });
  } catch (error) {
    res.redirect('/pageerror');
  }
};

export const postEditBanner = async (req, res) => {
  try {
    const id = req.query.id;
    const { title, startDate, endDate, status, existingImage } = req.body;

    let newImageUrl = existingImage; 

    if (req.file && req.file.path) {
      newImageUrl = req.file.path;
    }

    const updatedData = {
      title,
      startDate,
      endDate,
      status,
      bannerImage: newImageUrl,
    };

    const updateBanner = await Banner.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (updateBanner) {
      res.redirect('/admin/banner?status=updated');
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR });
    }
  } catch (error) {
    res.redirect('/pageerror');
  }
};

export const bannerDelete = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(HttpStatus.BAD_REQUEST).send('Category ID not provided');
    }

    const deletedBanner = await Banner.findByIdAndDelete(id);

    if (!deletedBanner) {
      return res.status(HttpStatus.NOT_FOUND).send('Banner not found');
    }
    res.redirect('/admin/banner?deleted=true&status=deleted');
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/pageerror');
  }
};
