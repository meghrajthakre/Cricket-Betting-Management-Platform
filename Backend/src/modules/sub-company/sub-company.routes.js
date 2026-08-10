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
router.get("/panel/users/next-username", subCompanyOnly, controller.getNextCompanyUserUsername);
router.get("/panel/limit-summary", subCompanyOnly, controller.getLimitSummary);
router.get("/panel/users", subCompanyOnly, controller.getCompanyUsers);
router.post("/panel/users", subCompanyOnly, controller.createCompanyUser);
router.patch("/panel/users/:id/status", subCompanyOnly, controller.toggleCompanyUserStatus);
router.patch("/panel/users/:id/password", subCompanyOnly, controller.changeCompanyUserPassword);
router.patch("/panel/users/:id/balance", subCompanyOnly, controller.setCompanyUserBalance);
router.patch("/panel/users/:id/fix-limit", subCompanyOnly, controller.setCompanyUserFixLimit);
router.delete("/panel/users/:id", subCompanyOnly, controller.deleteCompanyUser);
router.patch("/:id/status", superAdminOnly, controller.toggleSubCompanyStatus);
router.patch("/:id/fix-limit", superAdminOnly, controller.editSubCompanyFixLimit);
router.delete("/:id", superAdminOnly, controller.deleteSubCompany);
router.get("/:id/report", superAdminOnly, controller.getSubCompanyReport);

module.exports = router;
