"use strict";
const asyncHandler = require("../../utils/asyncHandler");
const Banner = require("./banner.model");

// ── GET /api/superadmin/banner ────────────────────────────────────────────────
// Public — all authenticated users can fetch the active banner
const getBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findOne({ isActive: true }).sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    data: banner || { text: "hello" },
  });
});

// ── PUT /api/superadmin/banner ────────────────────────────────────────────────
// SuperAdmin only — create or update the active banner text
const upsertBanner = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    res.status(400);
    throw new Error("Banner text is required");
  }

  // Find existing active banner and update, or create a new one
  let banner = await Banner.findOne({ isActive: true }).sort({ updatedAt: -1 });

  if (banner) {
    banner.text = text.trim();
    banner.updatedBy = req.user._id; // set by your auth middleware
    await banner.save();
  } else {
    banner = await Banner.create({
      text: text.trim(),
      updatedBy: req.user._id,
    });
  }

  res.status(200).json({
    success: true,
    message: "Banner updated successfully",
    data: banner,
  });
});

module.exports = { getBanner, upsertBanner };
