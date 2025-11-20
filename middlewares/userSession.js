import User from '../models/userSchema.js';

export default async function userSessionMiddleware(req, res, next) {
  try {
    const sessionUser = req.session && req.session.user;
    const userId = sessionUser && sessionUser._id ? sessionUser._id : sessionUser;

    if (userId) {
      const user = await User.findById(userId).lean();
      res.locals.user = user || null;
    } else {
      res.locals.user = null;
    }
    next();
  } catch (err) {
    console.error('Error in userSessionMiddleware:', err);
    res.locals.user = null;
    next();
  }
}
