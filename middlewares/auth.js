import User from '../models/userSchema.js';

export const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.user);

    if (!user || user.isBlocked) {
      req.session.destroy(() => {
        res.redirect('/login');
      });
      return;
    }
    next();
  } catch (err) {
    console.log('Auth error:', err);
    res.redirect('/login');
  }
};


export const adminAuth = async (req, res, next) => {
    try {
        if (!req.session.admin || !req.session.adminData) {
            return res.redirect('/admin/login');
        }

        const admin = await User.findOne({
            _id: req.session.adminData._id,
            isAdmin: true,
        });

        if (!admin) {
            return res.redirect('/admin/login');
        }

        next();

    } catch (error) {
        console.error('Admin Auth Error:', error);
        res.redirect('/pageerror');
    }
};

