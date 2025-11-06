
export const loadHome = async(req, res) => {
    try {
        return res.render("home");
    } catch (error) {
        console.log("Home page not Found");
        res.status(500).send("Server Error");
    }
};

export const loadNotFound = async(req, res) => {
    try {
        res.render("notFound");
    } catch (error) {
        res.redirect("/notfound");
    }
};