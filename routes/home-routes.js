const express = require("express");
const { check } = require("express-validator");

const routes = express.Router();

const homeController = require("../controllers/home-controllers/home-controller");

const storage = multer.memoryStorage();
const fileUpload = multer({ storage: storage });

routes.post(
  "/appointment/:uid",
  fileUpload.fields([]),
  [
    check("date").not().isEmpty(),
    check("startTime").not().isEmpty(),
    check("endTime").not().isEmpty(),
    check("duration").not().isEmpty(),
    check("status").not().isEmpty(),
    check("paymentStatus").not().isEmpty(),
    check("interacNum").not().isEmpty(),
    check("amountPaid").not().isEmpty(),
    check("due").not().isEmpty(),
    check("address").not().isEmpty(),
    check("name").not().isEmpty(),
    check("number").not().isEmpty(),
    check("completed").not().isEmpty(),
    check("courseName").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
  ],
  homeController.createAppointment
);

routes.post(
  "/signup",
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
  homeController.signUp
);

routes.post(
  "/login",
  [
    check("email").normalizeEmail().isEmail(),
    check("password").not().isEmpty(),
  ],
  homeController.login
);

routes.post(
  "/contact",
  fileUpload.fields([]),
  [
    check("name").not().isEmpty(),
    check("email").not().isEmpty(),
    check("message").not().isEmpty(),
  ],
  homeController.createContact
);

module.exports = routes;
