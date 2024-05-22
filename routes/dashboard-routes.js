const express = require("express");

const { check } = require("express-validator");

const route = express.Router();

const multer = require("multer");

const userController = require("../controllers/dashboard-controllers/user-controllers");
const appointmentController = require("../controllers/dashboard-controllers/appointment-controller");

const storage = multer.memoryStorage();
const fileUpload = multer({ storage: storage });

const checkUserAuth = require("../middleware/chek-user-auth");

route.get("/user/info/:uid", userController.getUserInfo);
route.get("/course/info/all", userController.getAllCourse);
route.get("/appointment/:day", appointmentController.getAppointmentDay);
route.get("/appointment/info/:aid", appointmentController.getAppointmentInfo);

route.get("/appointment/all/:uid", appointmentController.getAllAppointmentInfo);

route.get("/assessment/info/:aid", userController.getAssessmentInfo);
route.get(
  "/appointment/times/:startTime",
  appointmentController.getAppointmenmtTime
);

route.use(checkUserAuth);

route.post(
  "/user-lesson/:uid",
  fileUpload.fields([]),
  [check("lessons").not().isEmpty()],
  userController.updateLessons
);

route.patch(
  "/user/info/:uid",
  fileUpload.fields([
    { name: "profileImage", count: 1 },
    { name: "coverImage", count: 1 },
  ]),
  [
    check("fname").not().isEmpty(),
    check("lname").not().isEmpty(),
    check("number").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("gender").not().isEmpty(),
    check("address").not().isEmpty(),
    check("password").not().isEmpty(),
    check("status").not().isEmpty(),
  ],
  userController.updateUser
);

route.patch(
  "/user/password/:uid",
  fileUpload.fields([]),
  [check("oldPassword").not().isEmpty(), check("password").not().isEmpty()],
  userController.updatePassword
);

route.patch(
  "/appointment/status/:aid",
  [check("status").not().isEmpty()],
  appointmentController.updateStatus
);

route.post(
  "/appointment/create-customer-intent",
  fileUpload.fields([]),
  [
    check("name").not().isEmpty(),
    check("amount").not().isEmpty(),
    check("email").not().isEmpty(),
  ],
  appointmentController.createIntent
);

route.patch(
  "/appointment/payment/:aid",
  fileUpload.fields([]),
  [check("amount").not().isEmpty()],
  appointmentController.updatePayment
);

route.delete(
  "/appointment/delete/:aid",
  appointmentController.deleteAppointment
);

route.delete("/appointment/:aid", appointmentController.deleteAppointment);

module.exports = route;
