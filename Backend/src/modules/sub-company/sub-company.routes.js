"use strict";

const { Router } = require("express");
const { protect } = require("../../middleware/authMiddleware");
const { superAdminOnly, subCompanyOnly } = require("../../middleware/roleMiddleware");
const controller = require("./sub-company.controller");

const router = Router();
router.use(protect);
router.get("/next-username", superAdminOnly, controller.getNextCompanyUsername);
router.get("/", superAdminOnly, controller.getSubCompanies);
router.post("/", superAdminOnly, controller.createSubCompany);
router.get("/panel/users", subCompanyOnly, controller.getCompanyUsers);
router.post("/panel/users", subCompanyOnly, controller.createCompanyUser);
router.patch("/:id/status", superAdminOnly, controller.toggleSubCompanyStatus);
router.get("/:id/report", superAdminOnly, controller.getSubCompanyReport);

module.exports = router;
