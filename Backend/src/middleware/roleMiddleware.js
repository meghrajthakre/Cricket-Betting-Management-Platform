"use strict";

const { ROLES } = require("../modules/user/user.model");
const AppError = require("../utils/AppError");

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) throw new AppError("Authentication required.", 401);
  if (!roles.includes(req.user.role)) {
    throw new AppError(
      `Forbidden. Required role(s): [${roles.join(", ")}]. Your role: ${req.user.role}`,
      403
    );
  }
  next();
};

const superAdminOnly = authorize(ROLES.SUPERADMIN);
const subCompanyOnly = authorize(ROLES.SUB_COMPANY);
const masterAndAbove = authorize(ROLES.SUPERADMIN, ROLES.MASTER);
const adminAndAbove  = authorize(ROLES.SUPERADMIN, ROLES.MASTER, ROLES.ADMIN);
const userOnly       = authorize(ROLES.USER);

module.exports = { authorize, superAdminOnly, subCompanyOnly, masterAndAbove, adminAndAbove, userOnly };
