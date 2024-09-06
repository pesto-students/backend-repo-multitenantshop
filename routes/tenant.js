const express = require("express");
const Tenant = require("../models/Tenant");
const Store = require("../models/Store");
const bcrypt = require("bcrypt");

const {
  getSuccessResponse,
  getServerErrorResponse,
  getBadRequestResponse,
} = require("../utils/response");
const router = express.Router();

// Register Tenant
router.post("/registerTenant", async (req, res) => {
  try {
    const { username, mail, password } = req.body;

    // Check if tenant already exists
    const existingTenantWithMail = await Tenant.findOne({ mail });
    const existingTenantWithUsername = await Tenant.findOne({ username });
    if (existingTenantWithMail) {
      return res
        .status(400)
        .json(getBadRequestResponse(`Tenant with mail ${mail} already exists`));
    }
    if (existingTenantWithUsername) {
      return res
        .status(400)
        .json(
          getBadRequestResponse(
            `Tenant with username ${username} already exists`
          )
        );
    }

    const newTenant = new Tenant({ username, mail, password, role: "Tenant" });
    const savedTenant = await newTenant.save();

    res.status(201).json(
      getSuccessResponse({
        tenantId: savedTenant._id,
      })
    );
  } catch (error) {
    res.status(500).json(getServerErrorResponse(error.message));
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  console.log(username, password);
  try {
    const tenant = await Tenant.findOne({ username });

    if (!tenant) {
      return res
        .status(404)
        .json(
          getBadRequestResponse(
            `Unable to find Tenant with username: ${username}`
          )
        );
    }

    const isMatch = await bcrypt.compare(password, tenant?.password);
    if (!isMatch) {
      return res.status(400).json(getBadRequestResponse("Invalid credentials"));
    }

    const hasStore = tenant?.store ? true : false;

    res.json(
      getSuccessResponse({
        tenantId: tenant._id,
        hasStore: hasStore,
        username: tenant.username,
        mail: tenant.mail,
        role: tenant.role,
        store: tenant?.store,
        storeId: tenant?.store?.storeId,
      })
    );
  } catch (error) {
    res.status(500).json({
      message: "Could not connect to server. Please try after sometime!",
      error,
    });
  }
});

router.post("/logout", (req, res) => {
  // Just a simple response, since no session management is used
  res.json(getSuccessResponse({ isLoggedOut: true }));
});

module.exports = router;
