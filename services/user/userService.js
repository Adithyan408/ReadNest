import User from '../../models/userSchema.js';
import { securePassword } from '../../helpers/verify.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import passport from '../../config/passport.js';
import { generateOtp, sendVerificationEmail } from '../../helpers/verify.js';
import Coupon from '../../models/couponSchema.js';
import ReferralReward from '../../models/referalSchema.js';

dotenv.config();

export const notfound = async (req, res) => {
  try {
    res.render('notFound');
  } catch (error) {
    res.redirect('/notfound');
  }
};

export const getSignup = async (req, res) => {
  try {
    const message = req.session.message || null;
    req.session.message = null;
    return res.render('signup', { message });
  } catch (error) {
    res.status(500).render('notFound');
  }
};

export const getLogin = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect('/');
    }

    if (req.session.message) {
      const message = req.session.message;
      req.session.message = null;
      return res.render('login', { message });
    }

    res.render('login');
  } catch (error) {
    console.error(error);
    res.status(500).redirect('/notfound');
  }
};

export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: false, email: email });

    if (!findUser) {
      req.session.message = 'User not found';
      return res.redirect('/login');
    }
    if (findUser.isBlocked) {
      req.session.message = 'User is Blocked by Admin';
      return res.redirect('/login');
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      req.session.message = 'Invalide Credentials';
      return res.redirect('/login');
    }
    if (passwordMatch) {
      req.session.user = { _id: findUser._id };
      res.redirect('/');
    }
  } catch (error) {
    req.session.message = 'Please try again';
    res.redirect('/login');
  }
};

export const postSignup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, referralCode } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      req.session.message = 'All fields are required';
      return res.redirect('/signup');
    }

    if (password !== confirmPassword) {
      req.session.message = 'Passwords do not match';
      return res.redirect('/signup');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      req.session.message = 'User with this email already exists';
      return res.redirect('/signup');
    }

    let referredUser = null;

    if (referralCode && referralCode.trim() !== '') {
      const normalizedCode = referralCode.trim().toUpperCase();

      referredUser = await User.findOne({ referralCode: normalizedCode });

      if (!referredUser) {
        req.session.message = 'Invalid referral code';
        return res.redirect('/signup');
      }

      if (referredUser.email.toLowerCase() === email.toLowerCase()) {
        req.session.message = 'You cannot use your own referral code';
        return res.redirect('/signup');
      }
    }

    const otp = generateOtp();
    const emailSent = sendVerificationEmail(name, email, otp);

    if (!emailSent) {
      return res.json('Email-error');
    }

    req.session.userOtp = otp;

    req.session.userData = {
      name,
      email,
      password,
      referredBy: referredUser ? referredUser.referralCode : null,
    };

    res.redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
    console.log('OTP sent:', otp);
  } catch (error) {
    console.error('Signup error:', error);
    res.redirect('/notfound');
  }
};

export const otpVerify = async (req, res) => {
  try {
    const { otp } = req.body;

    if (otp !== req.session.userOtp) {
      return res.json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    const userData = req.session.userData;
    const passwordHash = await securePassword(userData.password);

    const newUser = await User.create({
      name: userData.name,
      email: userData.email,
      password: passwordHash,
      referredBy: userData.referredBy || null,
    });

    if (newUser.referredBy) {
      const inviter = await User.findOne({ referralCode: newUser.referredBy });

      if (inviter && inviter._id.toString() !== newUser._id.toString()) {
        let referralCoupon = await Coupon.findOne({
          code: 'SPECIAL10',
          userId: inviter._id,
          type: 'referral',
        });

        if (!referralCoupon) {
          referralCoupon = await Coupon.create({
            code: 'SPECIAL10',
            discount: 10,
            expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            minPurchase: 0,
            maxDiscount: null,
            userId: inviter._id,
            type: 'referral',
            maxUse: 1,
          });
        }

        const alreadyRewarded = await ReferralReward.findOne({
          referrerId: inviter._id,
          referredUserId: newUser._id,
          couponCode: 'SPECIAL10',
        });

        if (!alreadyRewarded) {
          await ReferralReward.create({
            referrerId: inviter._id,
            referredUserId: newUser._id,
            couponCode: 'SPECIAL10',
            discount: 10,
          });
        }
      }
    }

    req.session.user = { _id: newUser._id };

    req.session.userOtp = null;
    req.session.userData = null;

    return res.json({
      success: true,
      message: 'OTP verified successfully',
      redirect: '/',
    });
  } catch (error) {
    console.error('OTP Verify Error:', error);
    return res.json({ success: false, message: 'Internal server error' });
  }
};

export const verifyLoad = async (req, res) => {
  const { forgot, email } = req.query;
  res.render('verify-otp', {
    email,
    fromForgotPassword: forgot === 'true',
  });
};

export const otpResend = async (req, res) => {
  try {
    const { name, email } = req.session.userData || req.body;

    const otp = generateOtp();
    console.log('Resent OTP:', otp);

    req.session.userOtp = otp;

    sendVerificationEmail(name, email, otp)
      .then(() => console.log('OTP email sent'))
      .catch((err) => console.error('OTP email error:', err));

    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
};

export const authGoogle = (req, res) => {
  passport.authenticate('google', { failureRedirect: '/signup' })(
    req,
    res,
    () => {
      if (!req.user) {
        console.error(' Google OAuth failed: req.user is undefined');
        return res.redirect('/signup');
      }

      req.session.user = { _id: req.user._id };
      res.redirect('/');
    },
  );
};

export const profileLoad = async (req, res) => {
  try {
    const message = req.session.message;
    const status = req.session.status;
    const userId = req.session?.user?._id;
    if (!userId) {
      return res.redirect('/login');
    }
    const userData = await User.findById(userId).lean();
    req.session.message = null;
    req.session.status = null;
    res.render('profile', { user: userData, message, status });
  } catch (error) {
    res.render('notFound');
  }
};

export const logoutLoad = async (req, res) => {
  try {
    delete req.session.user;
    return res.redirect('/');
  } catch (error) {
    res.redirect('/notfound');
  }
};
