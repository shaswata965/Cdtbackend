const { v4: uuidv4 } = require("uuid");
const HttpError = require("../../models/htttp-error");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../../models/admin");
const User = require("../../models/user");
const Appointment = require("../../models/appointment");

const createAdmin = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError(error.message, 422));
  }

  const { name, number, email, role, password } = req.body;

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(err.message, 500);

    return next(error);
  }

  const newAdmin = new Admin({
    name,
    number,
    email,
    role,
    password: hashedPassword,
    image: req.file.path,
  });

  try {
    await newAdmin.save();
  } catch (err) {
    const error = new HttpError(err, 500);

    return next(error);
  }

  res.status(201).json({ admin: newAdmin.toObject({ getters: true }) });
};

const logIn = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { email, password } = req.body;

  let existAdmin;

  try {
    existAdmin = await Admin.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user",
      500
    );
  }

  if (!existAdmin) {
    return next(new HttpError("Wrong Credentials", 401));
  }

  let isValid = false;

  try {
    isValid = await bcrypt.compare(password, existAdmin.password);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user",
      500
    );
  }

  if (!isValid) {
    return next(new HttpError("Wrong Credentials", 401));
  }
  let token;

  try {
    token = jwt.sign(
      { adminId: existAdmin.id, email: existAdmin.email },
      process.env.ADMIN_SECRET_KEY,
      { expiresIn: "10h" }
    );
  } catch (err) {
    return next(new HttpError("Wrong Credentials", 401));
  }

  res.json({
    adminId: existAdmin.id,
    adminEmail: existAdmin.email,
    token: token,
  });
};

const getAdminInfo = async (req, res, next) => {
  const adminId = req.params.aId;

  let admin;

  try {
    admin = await Admin.findById(adminId);
  } catch (err) {
    const error = new HttpError("Something went wrong, couldn't find user");

    return next(error);
  }

  if (!admin) {
    return next(new HttpError("Could not Find User Info", 404));
  }

  res.json({ admin: admin.toObject({ getters: true }) });
};

const getAllUser = async (req, res, next) => {
  let user;

  try {
    user = await User.find();
  } catch (err) {
    const error = new HttpError("Something went wrong, couldn't find user");

    return next(error);
  }

  if (!user) {
    return next(new HttpError("Could not Find User Info", 404));
  }

  res.json({ user: user.map((elem) => elem.toObject({ getters: true })) });
};

const getAllAdmin = async (req, res, next) => {
  let admin;

  try {
    admin = await Admin.find();
  } catch (err) {
    const error = new HttpError("Something went wrong, couldn't find user");

    return next(error);
  }

  if (!admin) {
    return next(new HttpError("Could not Find User Info", 404));
  }

  res.json({ admin: admin.map((elem) => elem.toObject({ getters: true })) });
};

const updateUser = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const {
    fname,
    lname,
    email,
    number,
    address,
    gender,
    status,
    city,
    zipcode,
    country,
    about,
    image,
  } = req.body;

  const userId = req.params.uid;

  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find user",
      500
    );

    return next(error);
  }
  user.fname = fname;
  user.lname = lname;
  user.email = email;
  user.number = number;
  user.address = address;
  user.gender = gender;
  user.status = status;
  user.city = city;
  user.about = about;
  user.zipcode = zipcode;
  user.country = country;
  user.image = image;

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(err.message, 500);

    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

const updateAppointment = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { status } = req.body;

  const appId = req.params.aid;

  let app;

  try {
    app = await Appointment.findById(appId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find user",
      500
    );

    return next(error);
  }

  app.status = status;

  try {
    await app.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't update user",
      500
    );

    return next(error);
  }

  res.status(200).json({ appointment: app.toObject({ getters: true }) });
};

const updateAdmin = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { name, email, role, password, image } = req.body;

  const adminId = req.params.aid;

  let admin;

  try {
    admin = await Admin.findById(adminId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find user",
      500
    );

    return next(error);
  }

  admin.name = name;
  admin.role = role;
  admin.email = email;
  admin.image = image;
  admin.password = password;

  try {
    await admin.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't update Admin",
      500
    );

    return next(error);
  }

  res.status(200).json({ admin: admin.toObject({ getters: true }) });
};

const deleteUser = async (req, res, next) => {
  const uId = req.params.uid;

  try {
    await User.deleteOne({ _id: uId });
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.status(200).json({ message: "Successfully deleted User" });
};

const deleteAdmin = async (req, res, next) => {
  const aId = req.params.aid;

  try {
    await Admin.deleteOne({ _id: aId });
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.status(200).json({ message: "Successfully deleted Admin" });
};

const deleteAppointment = async (req, res, next) => {
  const aId = req.params.aid;

  try {
    await Appointment.deleteOne({ _id: aId });
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.status(200).json({ message: "Successfully deleted Appointment" });
};

const getAllAppointment = async (req, res, next) => {
  let appointment;

  try {
    appointment = await Appointment.find();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find appointment"
    );

    return next(error);
  }

  if (!appointment) {
    return next(new HttpError("Could not Find Appointment Info", 404));
  }

  res.json({
    appointment: appointment.map((elem) => elem.toObject({ getters: true })),
  });
};

exports.createAdmin = createAdmin;

exports.getAdminInfo = getAdminInfo;
exports.getAllUser = getAllUser;
exports.getAllAdmin = getAllAdmin;
exports.getAllAppointment = getAllAppointment;

exports.logIn = logIn;

exports.updateUser = updateUser;
exports.updateAdmin = updateAdmin;
exports.updateAppointment = updateAppointment;

exports.deleteUser = deleteUser;
exports.deleteAdmin = deleteAdmin;
exports.deleteAppointment = deleteAppointment;
