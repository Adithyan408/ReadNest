import User from '../models/userSchema.js';

export const userAuth = (req, res, next) => {
    if(req.session.user){
        User.findById(req.session.user)
        .then(data => {
            if(data && !data.isBlocked){
                next();
            } else {
                res.redirect("/login");
            }
        })
        .catch(error => {
            console.log("Error in User Authentication");
            res.status(500).send("Internal Server Error");
        })
    } else {
        res.redirect("/login");
    }
}

export const adminAuth = async (req, res, next) => {
    try {
        if (!req.session.admin || !req.session.adminData) {
            return res.redirect("/admin/login");
        }

        const admin = await User.findOne({
            _id: req.session.adminData._id,
            isAdmin: true
        });

        if (!admin) {
            return res.redirect("/admin/login");
        }

        next();

    } catch (error) {
        console.error("Admin Auth Error:", error);
        res.redirect("/pageerror");
    }
};

