const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: String,
    price: { type: Number, required: true },
    sizeOptions: [String],
    colors: String,
    images: [String],
    description: String,
    quantityAvailable: { type: Number, required: true },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
