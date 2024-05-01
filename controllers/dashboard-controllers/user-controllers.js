const HttpError = require("../../models/htttp-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");

const bcrypt = require("bcryptjs");

const User = require("../../models/user");

const Assessment = require("../../models/assessment");

const getUserInfo = async (req, res, next) => {
  const userId = req.params.uid;

  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError("Something went wrong, couldn't find user");

    return next(error);
  }

  if (!user) {
    return next(new HttpError("Could not Find User Info", 404));
  }

  res.json({ user: user.toObject({ getters: true }) });
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
  user.image = req.files.profileImage[0].path;
  user.coverImage = req.files.coverImage[0].path;

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(err.message, 500);

    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

const updatePassword = async (req, res, next) => {
  console.log(req.body);
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { password, oldPassword } = req.body;
  const userId = req.params.uid;

  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong, couldn't find user to update password",
        500
      )
    );
  }

  let isValid = false;

  try {
    isValid = await bcrypt.compare(oldPassword, user.password);
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong, couldn't find user to update password",
        500
      )
    );
  }

  if (!isValid) {
    return next(new HttpError("wrong credentials", 500));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(err.message, 500);

    return next(error);
  }

  user.password = hashedPassword;

  try {
    await user.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, couldn't update password", 500)
    );
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

const getAssessmentInfo = async (req, res, next) => {
  const appointmentId = req.params.aid;

  let assessment;

  try {
    assessment = await Assessment.findOne({
      appointmentId: appointmentId,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went Wrong, Couldn't find assessment",
      500
    );

    return next(error);
  }

  if (!assessment) {
    return next(new HttpError("Could not find Assessment Info", 404));
  }

  res.json({ assessment: assessment.toObject({ getters: true }) });
};

exports.getUserInfo = getUserInfo;
exports.getAssessmentInfo = getAssessmentInfo;

exports.updateUser = updateUser;
exports.updatePassword = updatePassword;
