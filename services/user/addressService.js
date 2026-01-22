import { HttpStatus } from '../../helpers/statusCodes.js';
import Address from '../../models/addressSchema.js';
import User from '../../models/userSchema.js';

export const loadAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) {
      req.session.status = 'error';
      req.session.message = 'No user logged in';
      return res.redirect('/login');
    }
    const userData = await User.findById(userId).lean();
    const addressDoc = await Address.findOne({ userId }).lean();
    const addresses = addressDoc ? addressDoc.addresses : [];

    return res.render('address', {
      addresses,
      user: userData,
      editAddress: null,
    });
  } catch (error) {
    console.error('Load address error:', error);

    req.session.status = 'error';
    req.session.message = 'Server error while loading addresses';

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/account');
  }
};

export const postAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'No user logged in',
      });
    }

    const {
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

    let existing = await Address.findOne({ userId });

    if (!existing) {
      existing = new Address({
        userId,
        addresses: [],
      });
    }

    existing.addresses.push({
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

    await existing.save();

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Address added successfully!',
      data: existing,
    });
  } catch (error) {
    console.error('Add address error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};

export const geteditAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const addressId = req.params.id;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Not logged in' });
    }

    const addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'No addresses found' });
    }

    const singleAddress = addressDoc.addresses.find(
      (addr) => addr._id.toString() === addressId,
    );

    if (!singleAddress) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Address not found' });
    }

    return res.json({
      success: true,
      address: singleAddress,
    });
  } catch (err) {
    console.error('Get single address error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const updateEditAddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const addressId = req.params.id;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Not logged in' });
    }

    const {
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

    const addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'No address found' });
    }

    const index = addressDoc.addresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (index === -1) {
      return res.json({ success: false, message: 'Address not found' });
    }

    addressDoc.addresses[index] = {
      ...addressDoc.addresses[index],
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
    };

    await addressDoc.save();

    return res.json({
      success: true,
      message: 'Address updated successfully',
    });
  } catch (err) {
    console.error('Update address error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const addressDelete = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const addressId = req.params.id;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Not logged in' });
    }

    const addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Address record not found' });
    }

    const updatedAddresses = addressDoc.addresses.filter(
      (addr) => addr._id.toString() !== addressId,
    );

    if (updatedAddresses.length === addressDoc.addresses.length) {
      return res.json({ success: false, message: 'Address not found' });
    }

    addressDoc.addresses = updatedAddresses;
    await addressDoc.save();

    return res.json({
      success: true,
      message: 'Address removed successfully',
    });
  } catch (err) {
    console.error('Delete address error:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error while deleting address',
    });
  }
};

export const saveSelectedAddress = async (req, res) => {
  try {
    req.session.selectedAddressId = req.body.addressId;
    res.json({ success: true });
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};
