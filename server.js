require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Express
const app = express();
app.use(express.json());

app.use(cors());

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MONGO DB CONNECTION SUCCESSFUL");
  } catch (err) {
    console.log("MONGO DB CONNECTION FAILED: ", err);
  }
};

connectDB();

// Import Routes
const tenantRoutes = require("./routes/tenant");
const storeRoutes = require("./routes/store");
const productRoutes = require("./routes/productApi");

app.get("/", (req, res) => {
  res.status(200).json({
    message: "connection successful",
  });
});

// Use Routes
app.use("/api/tenants", tenantRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
