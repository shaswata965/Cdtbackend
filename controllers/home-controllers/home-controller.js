const { v4: uuidv4 } = require("uuid");
const HttpError = require("../../models/htttp-error");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const postmark = require("postmark");

let client = new postmark.ServerClient("" + process.env.POSTMARK_SECRET_KEY);

const Appointment = require("../../models/appointment");
const User = require("../../models/user");
const Contact = require("../../models/contact");

const createAppointment = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError(error.message, 422));
  }

  const uId = req.params.uid;

  const {
    date,
    startTime,
    endTime,
    duration,
    status,
    paymentStatus,
    interacNum,
    amountPaid,
    due,
    address,
    name,
    email,
    number,
    completed,
    courseName,
    appName,
    alertText,
  } = req.body;

  console.log(req.body);

  const curDate = new Date();

  const dateOfMonth = curDate.getDate().toString();
  let hourNow = curDate.getHours();
  let minuteNow = curDate.getMinutes();

  if (minuteNow <= 9) {
    minuteNow = "0" + minuteNow.toString();
  }

  let timeNow;

  if (hourNow >= 12) {
    hourNow = hourNow - 12;
    timeNow = hourNow.toString() + ":" + minuteNow + " PM";
  } else {
    timeNow = hourNow.toString() + ":" + minuteNow + " AM";
  }
  const alert = { time: timeNow, date: dateOfMonth, alertText };

  const newAppointment = new Appointment({
    date,
    startTime,
    endTime,
    duration,
    status,
    paymentStatus,
    interacNum,
    amountPaid,
    due,
    address,
    name,
    email,
    number,
    userId: uId,
    completed,
    courseName,
    appName,
  });

  newAppointment.alerts.push(alert);
  try {
    await newAppointment.save();
  } catch (err) {
    const error = new HttpError(err.message, 500);

    return next(error);
  }

  res.status(201).json({ newAppointment });
};

const signUp = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const {
    fname,
    lname,
    number,
    email,
    address,
    gender,
    password,
    status,
    image,
  } = req.body;

  let existUserEm;
  let existUserNum;

  let curToken = uuidv4();

  try {
    existUserEm = await User.findOne({ email: email });
    existUserNum = await User.findOne({ number: number });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user",
      500
    );

    return next(error);
  }

  if (existUserEm) {
    return next(new HttpError("Email exists for an Account", 401));
  }

  if (existUserNum) {
    return next(new HttpError("Phone Number exists for an Account", 401));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(err.message, 500);

    return next(error);
  }

  const newUser = new User({
    fname,
    lname,
    number,
    email,
    gender,
    address,
    password: hashedPassword,
    status,
    image,
    curToken,
  });

  try {
    await client.sendEmail({
      From: "thomas@cdtdrivingart.com",
      To: newUser.email,
      Subject: "Registration Request Received",
      HtmlBody:
        "<p>Dear confident driver,</p><p>Thank you for puttting your confidence into <strong> Confident Drivcers Training School.</strong></p><p>We have received your registration request.</p><p>One of our Admins will review and approve the request as soon as possible</p><p>Thank You</p>",
      TextBody:
        "Thank you for puttting your confidence into Confident Drivers Training School. We have received your registration request. One of our Admins will review and approve the request as soon as possible. Thank You.",
      MessageStream: "signup",
    });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  try {
    await newUser.save();
  } catch (err) {
    const error = new HttpError(err.message, 500);
    return next(error);
  }
  res.status(201).json({ user: newUser.toObject({ getters: true }) });
};

const logIn = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { email, password } = req.body;
  let curToken = uuidv4();

  let existUser;

  try {
    existUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user",
      500
    );
  }
  if (!existUser) {
    return next(new HttpError("Wrong Credentials", 401));
  }

  if (existUser.status === "PENDING") {
    return next(
      new HttpError(
        "Please wait while an admin reviews and approves your registration",
        401
      )
    );
  }

  let isValid = false;

  try {
    isValid = await bcrypt.compare(password, existUser.password);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user",
      500
    );
  }

  if (!isValid) {
    return next(new HttpError("Authorization Error", 401));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existUser.id, email: existUser.email },
      process.env.USER_SECRET_KEY,
      { expiresIn: "5h" }
    );
  } catch (err) {
    return next(new HttpError("Authorization Error", 401));
  }

  try {
    existUser.save();
  } catch (err) {
    return next(new HttpError(err.message, 401));
  }
  existUser.curToken = curToken;

  res.json({
    userId: existUser.id,
    email: existUser.email,
    token: token,
  });
};

const createContact = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { name, email, message, subject } = req.body;

  const newContact = new Contact({
    name,
    email,
    message,
    subject,
  });

  try {
    await newContact.save();
  } catch (err) {
    const error = new HttpError("Message Couldn't be Sent", 500);

    return next(error);
  }

  res.status(200).json({ newContact });
};

const forgetMailer = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  let user;
  try {
    user = await User.findOne({ email: req.body.input });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  if (!user) {
    try {
      user = await User.findOne({ number: req.body.input });
    } catch (err) {
      return next(new HttpError(err.message, 404));
    }
  }

  if (!user) {
    return next(new HttpError("No User found with the credential", 404));
  }

  if (user.status == "PENDING") {
    return next(
      new HttpError("Your Account is still pending admin approval", 404)
    );
  }

  try {
    await client.sendEmail({
      From: "thomas@cdtdrivingart.com",
      To: user.email,
      Subject: "Password Reset Request",
      HtmlBody: `<p>Dear confident driver,</p><p>We have received a request to reset your password.</p><p>If you did not make the request, 
      ignore this email and let one of our instructor/admin know.</p><p>Please follow the link below to reset your password.
      </p><h4>https://cdtdrivingart.com/reset/${user.curToken}</h4><p>Thank You</p>`,
      TextBody: `Dear confident driver,We have received a request to reset your password.If you did not make the request, 
      ignore this email and let one of our instructor/admin know.Please follow the link below to reset your password.
      https://cdtdrivingart.com/reset/${user.curToken}.Thank You`,
      MessageStream: "signup",
    });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }
  res.status(200).json({ user });
};

const resetPassword = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  let user;
  try {
    user = await User.findOne({ curToken: req.body.token });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  if (!user) {
    return next(
      new HttpError(
        "Check the link, and try again. If this persists contact an Admin.",
        404
      )
    );
  }

  try {
    hashedPassword = await bcrypt.hash(req.body.password, 12);
  } catch (err) {
    const error = new HttpError(err.message, 500);

    return next(error);
  }

  user.password = hashedPassword;
  user.curToken = uuidv4();
  try {
    user.save();
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }
  res.status(200).json({ user });
};

exports.createAppointment = createAppointment;
exports.signUp = signUp;
exports.login = logIn;
exports.createContact = createContact;
exports.forgetMailer = forgetMailer;
exports.resetPassword = resetPassword;
