import Product from "../../models/productsSchema.js"


export const liveSearch = async(req, res) => {
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
        console.log("live search error", error);
        res.json([]);
    }
}