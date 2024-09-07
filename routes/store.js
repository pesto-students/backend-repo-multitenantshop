const express = require("express");
const multer = require("multer");
const Store = require("../models/Store");
const {
  uploadStoreLogoToS3,
  getPresignedLogoUrl,
  deleteImagesFromS3,
} = require("../utils/s3Upload");
const Tenant = require("../models/Tenant");
const {
  getServerErrorResponse,
  getBadRequestResponse,
  getSuccessResponse,
} = require("../utils/response");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const DOMAIN_NAME = "--shophive.netlify.app";

router.get("/:tenantId/store/:storeId", async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId).populate("store");
    if (!tenant)
      return res.status(404).json(getBadRequestResponse("Tenant not found"));

    const { location } = await getPresignedLogoUrl(tenant?.store?.storeId);

    const response = tenant.store;
    response.logoUrl = location;

    res.json(getSuccessResponse(response.toObject()));
  } catch (error) {
    res.status(500).json(getServerErrorResponse(error.message));
  }
});

// Add a new store
router.post("/:tenantId/store/add", upload.single("file"), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant)
      return res.status(404).json(getBadRequestResponse("Tenant not found"));

    // Check if tenant already has a store
    if (tenant.store) {
      return res
        .status(400)
        .json(getBadRequestResponse("Tenant can only have one store"));
    }

    const {
      storeId,
      name,
      subdomain,
      description,
      theme: { primaryColor, secondaryColor },
      address,
      contact,
      mail,
      returnPolicy,
      shippingPolicy,
    } = req.body;

    const { key, error } = await uploadStoreLogoToS3(req.file, storeId);
    if (error)
      return res.status(500).json(getServerErrorResponse(error.message));

    const newStore = new Store({
      storeId,
      name,
      subdomain: subdomain.concat(DOMAIN_NAME),
      description,
      logoUrl: key,
      theme: { primaryColor, secondaryColor },
      address,
      contact,
      mail,
      returnPolicy,
      shippingPolicy,
    });

    await newStore.save();

    tenant.store = newStore;
    tenant.storeId = storeId;
    await tenant.save();

    const { location } = await getPresignedLogoUrl(storeId);

    res
      .status(201)
      .json(getSuccessResponse({ ...newStore.toObject(), logoUrl: location }));
  } catch (error) {
    res.status(500).json(getServerErrorResponse(error.message));
  }
});

// Edit a store
router.put(
  "/:tenantId/store/:storeId",
  upload.single("file"),
  async (req, res) => {
    try {
      const tenant = await Tenant.findById(req.params.tenantId);
      if (!tenant)
        return res.status(404).json(getBadRequestResponse("Tenant not found"));

      const { storeId } = req.params;
      const storeData = req.body;

      const store = await Store.findOne({ storeId: storeId });

      if (req.file) {
        const oldLogoUrl = store.logoUrl;
        if (oldLogoUrl) {
          await deleteImagesFromS3([oldLogoUrl]);
        }

        const { location, error } = await uploadStoreLogoToS3(
          req.file,
          storeId
        );
        if (error)
          return res.status(500).json(getServerErrorResponse(error.message));

        storeData.logoUrl = location;
      }

      const updatedStore = await Store.findOneAndUpdate(
        { storeId: storeId },
        { ...storeData, subdomain: storeData.subdomain.concat(DOMAIN_NAME) },
        {
          new: true,
        }
      );

      res.json(getSuccessResponse(updatedStore.toObject()));
    } catch (error) {
      res.status(500).json(getServerErrorResponse(error.message));
    }
  }
);

// Delete a store
router.delete("/:tenantId/store/:storeId", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction(); // Start transaction

  try {
    const { tenantId, storeId } = req.params;

    // Find the tenant and store within the transaction
    const tenant = await Tenant.findById(tenantId).session(session);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const store = await Store.findOne({ storeId }).session(session);
    if (!store) {
      throw new Error("Store not found");
    }

    let imageKeysToDelete = [];
    if (store.logoUrl) {
      imageKeysToDelete.push(store.logoUrl);
    }

    const products = await Product.find({ store: store._id }).session(session);
    // Collect all product image keys to delete from S3
    products.forEach((product) => {
      product.images.forEach((imageUrl) => {
        imageKeysToDelete.push(imageUrl);
      });
    });

    await Product.deleteMany({ store: store._id }).session(session);
    await Store.findByIdAndDelete(store._id).session(session);
    tenant.store = null;
    tenant.storeId = null;

    await tenant.save({ session });

    // If all DB operations succeed, proceed with S3 image deletions
    if (imageKeysToDelete.length > 0) {
      await deleteImagesFromS3(imageKeysToDelete);
    }

    // Commit the transaction only if everything succeeds
    await session.commitTransaction();
    session.endSession();

    res.status(200).json(
      getSuccessResponse({
        message: "Store and all associated data deleted successfully",
      })
    );
  } catch (error) {
    // Abort the transaction in case of any errors
    await session.abortTransaction();
    session.endSession();

    console.error("Error during store deletion:", error.message);
    res
      .status(500)
      .json(getServerErrorResponse(`Error deleting store ${error.message}`));
  }
});

module.exports = router;
