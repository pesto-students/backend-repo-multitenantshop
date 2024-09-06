const express = require("express");
const multer = require("multer");
const Store = require("../models/Store");
const {
  uploadStoreLogoToS3,
  getPresignedLogoUrl,
} = require("../utils/s3Upload");
const Tenant = require("../models/Tenant");
const {
  getServerErrorResponse,
  getBadRequestResponse,
  getSuccessResponse,
} = require("../utils/response");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
      subdomain,
      description,
      logoUrl: key,
      theme: { primaryColor, secondaryColor },
      address,
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
  upload.single("logo"),
  async (req, res) => {
    try {
      const tenant = await Tenant.findById(req.params.tenantId);
      if (!tenant)
        return res.status(404).json(getBadRequestResponse("Tenant not found"));

      const { storeId } = req.params;
      const storeData = req.body;

      if (req.file) {
        const { location, error } = await uploadStoreLogoToS3(
          req.file,
          storeId
        );
        if (error)
          return res.status(500).json(getServerErrorResponse(error.message));

        storeData.logoUrl = location;
      }

      const updatedStore = await Store.findByIdAndUpdate(storeId, storeData, {
        new: true,
      });

      res.json(getSuccessResponse(updatedStore));
    } catch (error) {
      res.status(500).json(getServerErrorResponse(error.message));
    }
  }
);

// Delete a store
router.delete("/:tenantId/store/:storeId", async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.tenantId);
    if (!tenant)
      return res.status(404).json(getBadRequestResponse("Tenant not found"));
    const { storeId } = req.params;

    if (tenant.store) {
      await Store.findByIdAndDelete(storeId);
      res.json(getSuccessResponse({ storeId }));
    } else {
      return res
        .status(400)
        .json(getBadRequestResponse(`Cannot find store by id: ${storeId}`));
    }
  } catch (error) {
    res.status(500).json(getServerErrorResponse(error.message));
  }
});

module.exports = router;
