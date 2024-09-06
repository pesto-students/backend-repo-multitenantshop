const express = require("express");
const multer = require("multer");
const Store = require("../models/Store");
const {
  uploadStoreProductsToS3,
  getPresignedProductsUrl,
  deleteImagesFromS3,
} = require("../utils/s3Upload");
const Product = require("../models/Product");
const Tenant = require("../models/Tenant");
const {
  getBadRequestResponse,
  getSuccessResponse,
} = require("../utils/response");
const mongoose = require("mongoose");

const { ObjectId } = mongoose.Types;

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all products associated with a specific store
router.get("/:storeId/allProducts", async (req, res) => {
  try {
    const { storeId } = req.params;

    const id = ObjectId.isValid(storeId) ? new ObjectId(storeId) : storeId;
    // Find the store by storeId
    const store = await Store.findOne({ _id: id }).populate("products");

    if (!store) {
      return res.status(404).json(getBadRequestResponse("Store not found"));
    }

    // Get the list of products
    let products = store.products;

    products = await Promise.all(
      products.map(async (product) => {
        const { presignedProductsUrl, error } = await getPresignedProductsUrl(
          store.storeId,
          product.productId
        );
        return {
          ...product.toObject(),
          images: presignedProductsUrl || product.images,
        };
      })
    );
    res.json(getSuccessResponse(products));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new product
router.post(
  "/:tenantId/:storeId/add",
  upload.array("images[]", 10),
  async (req, res) => {
    try {
      const tenant = await Tenant.findById(req.params.tenantId);
      if (!tenant)
        return res.status(404).json(getBadRequestResponse("Tenant not found"));

      // Check if tenant already has a store
      if (!tenant.store) {
        return res
          .status(400)
          .json(
            getBadRequestResponse("Please add store before adding the Product")
          );
      }

      const { storeId } = req.params;
      const {
        productId,
        name,
        category,
        subcategory,
        price,
        sizeOptions,
        colors,
        description,
        quantityAvailable,
      } = req.body;

      const imageUploads = await Promise.all(
        req.files.map((file) =>
          uploadStoreProductsToS3(file, storeId, productId)
        )
      );

      const newProduct = new Product({
        productId,
        name,
        category,
        subcategory,
        price,
        sizeOptions: sizeOptions.split(","),
        images: imageUploads.map((upload) => upload.key),
        colors,
        description,
        quantityAvailable,
        store: tenant.store,
      });

      await newProduct.save();

      await Store.findByIdAndUpdate(tenant.store, {
        $push: { products: newProduct._id },
      });

      res.status(201).json(getSuccessResponse(newProduct.toObject()));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get a product by ID
router.get("/:storeId/:productId", async (req, res) => {
  try {
    const { productId, storeId } = req.params;
    const product = await Product.findById(productId).populate("store");

    const { presignedProductsUrl, error } = await getPresignedProductsUrl(
      storeId,
      product.productId
    );
    (product.images = presignedProductsUrl || product.images),
      res.json(getSuccessResponse(product.toObject()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a product by ID
router.put(
  "/:storeId/:productId",
  upload.array("images[]", 5),
  async (req, res) => {
    try {
      const { productId, storeId } = req.params;
      const {
        name,
        category,
        subcategory,
        quantityAvailable,
        price,
        description,
        sizeOptions,
        colors,
      } = req.body;
      const newImages = req.files || [];
      
      // Find the product to update
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (newImages && newImages.length > 0) {
        const imageUploads = await Promise.all(
          newImages.map((file) =>
            uploadStoreProductsToS3(file, storeId, productId)
          )
        );
        product.images = imageUploads.map((upload) => upload.key);
      }

      product.name = name || product.name;
      product.category = category || product.category;
      product.subcategory = subcategory || product.subcategory;
      product.price = price || product.price;
      product.quantityAvailable =
        quantityAvailable || product.quantityAvailable;
      product.description = description || product.description;
      product.sizeOptions = sizeOptions || product.sizeOptions;
      product.colors = colors || product.colors;

      await product.save();

      res.json(getSuccessResponse(product.toObject()));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete a product by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const productId = ObjectId.isValid(id) ? new ObjectId(id) : id;
    // Find the product to get the store ID and image URLs
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Create an array of image keys to delete from S3
    const imageKeys = product.images.map((imageUrl) => {
      // Extract the image key from the URL
      const key = imageUrl; // Extract the part after the S3 domain
      return key;
    });

    await deleteImagesFromS3(imageKeys);

    await Product.findByIdAndDelete(id);

    await Store.findByIdAndUpdate(product.store, {
      $pull: { products: product._id },
    });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
