const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    storeId: { type: String, required: true },
    name: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true },
    description: String,
    logoUrl: String,
    theme: {
      primaryColor: { type: String, required: true },
      secondaryColor: { type: String, required: true },
    },
    address: String,
    contact: String,
    mail: { type: String, required: true },
    returnPolicy: String,
    shippingPolicy: String,
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Store", storeSchema);
