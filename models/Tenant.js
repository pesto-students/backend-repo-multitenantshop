const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const tenantSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  mail: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  storeId: { type: String },
  role: { type: String },
  store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", unique: true },
});

// Pre-save hook to hash password
tenantSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const Tenant = mongoose.model("Tenant", tenantSchema);

module.exports = Tenant;
