import mongoose from "mongoose";
const { Schema } = mongoose;


const categorySchema = new Schema({
    categoryName: {
        type: String,
        required: true
    },
    categoryNumber : {
        type: String,
        required: true
    },
    isListed: {
        type: Boolean,
        default: true
    },
},
    {timestamps:true}
)

export default mongoose.model("Category", categorySchema);