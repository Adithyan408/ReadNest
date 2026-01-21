import mongoose from 'mongoose';
const { Schema } = mongoose;

const addressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  addresses: [
    {
      addressLabel: {
        type: String,
        enum: ['Home', 'Office', 'Other'],
        default: 'Home',
        required: true,
      },
      houseName: {
        type: String,
        required: true,
      },
      houseNumber: {
        type: Number,
      },
      street: {
        type: String,
      },
      post: {
        type: String,
        required: true,
      },
      district: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: Number,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      altPhone: {
        type: String,
        required: true,
      },
    },
  ],
});

const Address = mongoose.model('Address', addressSchema);

export default Address;
