const express = require("express");

const { check } = require("express-validator");

const fileUpload = require("../middleware/fileUpload");

const route = express.Router();

const adminController = require("../controllers/admin-controllers/admin-controller");
const checkAdminAuth = require("../middleware/chek-admin-auth");

route.post(
  "/login",
  fileUpload.fields([]),
  [
    check("email").normalizeEmail().isEmail(),
    check("password").not().isEmpty(),
  ],
  adminController.logIn
);
route.get("/admin/all", adminController.getAllAdmin);

route.get("/info/:aId", adminController.getAdminInfo);

route.get("/user/all", adminController.getAllUser);
route.get("/appointment/all", adminController.getAllAppointment);

route.use(checkAdminAuth);

route.patch(
  "/user/info/:uid",
  fileUpload.fields([]),
  [
    check("fname").not().isEmpty(),
    check("lname").not().isEmpty(),
    check("number").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("gender").not().isEmpty(),
    check("address").not().isEmpty(),
    check("password").not().isEmpty(),
    check("status").not().isEmpty(),
    check("image").not().isEmpty(),
  ],
  adminController.updateUser
);

route.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("number").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("role").not().isEmpty(),
    check("password").not().isEmpty(),
  ],
  adminController.createAdmin
);

route.patch(
  "/info/:aid",
  fileUpload.fields([]),
  [
    check("name").not().isEmpty(),
    check("number").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("role").not().isEmpty(),
    check("password").not().isEmpty(),
    check("image").not().isEmpty(),
  ],
  adminController.updateAdmin
);

route.patch(
  "/user/updateStatus/:uid",
  [check("status").not().isEmpty()],
  adminController.updateUser
);

route.patch(
  "/appointment/updateStatus/:aid",
  [check("status").not().isEmpty()],
  adminController.updateAppointment
);

route.delete("/user/delete/:uid", adminController.deleteUser);

route.delete("/admin/delete/:aid", adminController.deleteAdmin);

route.delete("/appointment/delete/:aid", adminController.deleteAppointment);

module.exports = route;
