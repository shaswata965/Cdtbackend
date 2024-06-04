const { v4: uuidv4 } = require("uuid");
const HttpError = require("../../models/htttp-error");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const postmark = require("postmark");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const sharp = require("sharp");
let client = new postmark.ServerClient("" + process.env.POSTMARK_SECRET_KEY);

const Admin = require("../../models/admin");
const User = require("../../models/user");
const Appointment = require("../../models/appointment");
const Course = require("../../models/course");
const Assessment = require("../../models/assessment");

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});

const getIntValue = (timeVal) => {
  let timeArr = [];

  if (timeVal.length === 6) {
    timeArr.push(timeVal.slice(0, 4));
    timeArr.push(timeVal.slice(4, 6));
  } else {
    timeArr.push(timeVal.slice(0, 5));
    timeArr.push(timeVal.slice(5, 7));
  }

  let setHour;

  const timeIndi = timeArr[0].split(":");

  if (timeArr[1] === "AM" || timeArr[0] === "12:00" || timeArr[0] === "12:30") {
    if (timeIndi[1] === "30") {
      setHour = parseFloat(timeIndi[0]) + 0.5;
    } else {
      setHour = parseFloat(timeIndi[0]);
    }
  } else {
    if (timeIndi[1] === "30") {
      setHour = parseFloat(timeIndi[0]) + 12.5;
    } else {
      setHour = parseFloat(timeIndi[0]) + 12;
    }
  }

  return setHour;
};

const getTimeValue = (timeInt) => {
  let timeStr;
  if (timeInt < 12) {
    timeStr =
      timeInt % 1 === 0
        ? timeInt.toString() + ":00AM"
        : Math.floor(timeInt).toString() + ":30AM";
  } else if ((timeInt === 12 || timeInt === 12.5) && timeInt < 13) {
    timeStr =
      timeInt % 1 === 0
        ? timeInt.toString() + ":00PM"
        : Math.floor(timeInt).toString() + ":30PM";
  } else {
    timeStr =
      timeInt % 1 === 0
        ? (timeInt - 12).toString() + ":00PM"
        : Math.floor(timeInt - 12).toString() + ":30PM";
  }

  return timeStr;
};

const createCourse = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError(error.message, 422));
  }

  const { name, price, number, featureArray, duration } = req.body;
  let existCourse;
  try {
    existCourse = await Course.findOne({ name });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  if (existCourse) {
    return next(
      new HttpError("Course name already exists, choose an unique one")
    );
  }

  const newCourse = new Course({
    name,
    price,
    number,
    featureArray: JSON.parse(featureArray),
    duration,
  });

  try {
    await newCourse.save();
  } catch (err) {
    const error = new HttpError(err, 500);

    return next(error);
  }

  res.status(201).json({
    course: newCourse.toObject({ getters: true }),
  });
};

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

  const imageName = uuidv4() + req.file.originalname;

  const buffer = await sharp(req.file.buffer)
    .resize({ height: 500, width: 500, fit: "contain" })
    .toBuffer();

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: imageName,
    Body: buffer,
    ContentType: req.file.mimetype,
  };

  const command = new PutObjectCommand(params);

  await s3.send(command);

  const newAdmin = new Admin({
    name,
    number,
    email,
    role,
    password: hashedPassword,
    image: imageName,
  });

  try {
    await newAdmin.save();
  } catch (err) {
    const error = new HttpError(err, 500);

    return next(error);
  }

  res.status(201).json({
    admin: newAdmin.toObject({ getters: true }),
  });
};

const createAssessment = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError(error.message, 422));
  }

  const {
    name,
    email,
    userId,
    appointmentId,
    infractionsStr,
    total,
    firstLesson,
  } = req.body;

  const curDate = new Date();

  const dateOfMonth = curDate.getDate().toString();
  let hourNow = curDate.getHours();
  let minuteNow = curDate.getMinutes();
  let extraMoney = 0;

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
  let alert = {
    time: timeNow,
    date: dateOfMonth,
    alertText: "Assessment Score Updated",
  };

  let app;

  try {
    app = await Appointment.findById(appointmentId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find user",
      500
    );

    return next(error);
  }
  app.status = "COMPLETED";

  const curD = new Date();

  const hour = curD.getHours();
  const min = curD.getMinutes();
  let newMin = 0;
  if (min > 15) {
    newMin = 0.5;
  }

  //12.5 = hour+newMin
  const orgEnd = getIntValue(app.endTime);
  const duraArr = app.duration.split(" ");
  if (hour + newMin > orgEnd) {
    const newEnd = getTimeValue(hour + newMin);
    app.endTime = newEnd;
    const extraDura = hour + newMin - getIntValue(app.startTime);

    extraMoney = parseFloat(duraArr[0] - extraDura) * 70;
    app.duration = extraDura.toString() + " hours";
  }

  app.alerts.push(alert);

  try {
    await app.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't update user",
      500
    );
    return next(error);
  }

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
  user.scoreIndicator = total;

  prevHourArr = user.totalHours?.split(" ");

  prevHour = prevHourArr ? parseFloat(prevHourArr[0]) : 0;

  curHourArr = app.duration.split(" ");

  curHour = parseFloat(curHourArr[0]);

  user.hourIndicator =
    ((prevHour > 0 ? prevHour - curHour : curHour) / (prevHour > 0 || 1)) * 100;
  user.scoreIndicator =
    ((user.latestScore ? user.latestScore - total : total) /
      (user.latestScore || 1)) *
    100;

  user.totalHours = (prevHour + curHour).toString() + " hours";
  user.latestScore = total;

  if (extraMoney < 0) {
    user.extraPay += extraMoney;
  }
  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't update user",
      500
    );
    return next(error);
  }

  const infractions = JSON.parse(infractionsStr);

  const newAssessment = new Assessment({
    name,
    email,
    userId,
    appointmentId,
    infractions,
    total,
    firstLesson,
  });

  try {
    await newAssessment.save();
  } catch (err) {
    const error = new HttpError(err, 500);

    return next(error);
  }

  res.status(201).json({
    assessment: newAssessment.toObject({ getters: true }),
  });
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
      {
        adminId: existAdmin.id,
        email: existAdmin.email,
      },
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

  const getObjectParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: admin.image,
  };

  const command = new GetObjectCommand(getObjectParams);
  const url = await getSignedUrl(s3, command, {
    expiresIn: 5 * 3600,
  });
  admin.imageURL = url;

  try {
    await admin.save();
  } catch (err) {
    const error = new HttpError(err, 500);

    return next(error);
  }

  res.json({
    admin: admin.toObject({ getters: true }),
  });
};

const getCourseInfo = async (req, res, next) => {
  const courseId = req.params.cid;

  let course;

  try {
    course = await Course.findById(courseId);
  } catch (err) {
    const error = new HttpError("Something went wrong, couldn't find Course");

    return next(error);
  }

  if (!course) {
    return next(new HttpError("Could not Find User Info", 404));
  }

  res.json({
    course: course.toObject({ getters: true }),
  });
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

  for (const us of user) {
    const getObjectParams1 = {
      Bucket: process.env.BUCKET_NAME,
      Key: us.image,
    };

    const command1 = new GetObjectCommand(getObjectParams1);
    const url1 = await getSignedUrl(s3, command1, {
      expiresIn: 5 * 3600,
    });
    us.imageURL = url1;

    if (us.coverImage) {
      const getObjectParams2 = {
        Bucket: process.env.BUCKET_NAME,
        Key: us.coverImage,
      };

      const command2 = new GetObjectCommand(getObjectParams2);
      const url2 = await getSignedUrl(s3, command2, {
        expiresIn: 5 * 3600,
      });
      us.coverImageURL = url2;
    }

    try {
      await us.save();
    } catch (err) {
      const error = new HttpError(err, 500);
    }
  }

  res.json({
    user: user.map((elem) => elem.toObject({ getters: true })),
  });
};

const getAllCourse = async (req, res, next) => {
  let course;

  try {
    course = await Course.find();
  } catch (err) {
    const error = new HttpError("Something went wrong, couldn't find user");

    return next(error);
  }

  if (!course) {
    return next(new HttpError("Could not Find User Info", 404));
  }

  res.json({
    course: course.map((elem) => elem.toObject({ getters: true })),
  });
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

  for (const ad of admin) {
    const getObjectParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: ad.image,
    };

    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, {
      expiresIn: 5 * 3600,
    });
    ad.imageURL = url;

    try {
      await ad.save();
    } catch (err) {
      const error = new HttpError(err, 500);
    }
  }

  res.json({
    admin: admin.map((elem) => elem.toObject({ getters: true })),
  });
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

  res.status(200).json({
    user: user.toObject({ getters: true }),
  });
};

const updateAppointment = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { status, alertText } = req.body;

  const appId = req.params.aid;

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
  let alert = {
    time: timeNow,
    date: dateOfMonth,
    alertText,
  };

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

  if (app.due === "0" && app.status != "EXPIRED") {
    alert = {
      ...alert,
      alertText: "Payment Received",
    };
    app.status = "PAID AND CONFIRMED";
  }

  app.alerts.push(alert);

  try {
    await app.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't update user",
      500
    );

    return next(error);
  }

  res.status(200).json({
    appointment: app.toObject({ getters: true }),
  });
};

const updateAdmin = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { name, email, role, password, image, imageURL } = req.body;

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
  admin.imageURL = imageURL;
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

  res.status(200).json({
    admin: admin.toObject({ getters: true }),
  });
};

const deleteUser = async (req, res, next) => {
  const uId = req.params.uid;
  let user;
  try {
    user = await User.findById(uId);
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  if (!user) {
    return next(new HttpError("Admin Couldn't be Deleted", 500));
  }

  if (
    user.image !=
    "https://www.repol.copl.ulaval.ca/wp-content/uploads/2019/01/default-user-icon.jpg"
  ) {
    const params1 = {
      Bucket: process.env.BUCKET_NAME,
      Key: user.image,
    };

    const command1 = new DeleteObjectCommand(params1);
    await s3.send(command1);

    const params2 = {
      Bucket: process.env.BUCKET_NAME,
      Key: user.coverImage,
    };

    const command2 = new DeleteObjectCommand(params2);
    await s3.send(command2);
  }

  try {
    await User.deleteOne({ _id: uId });
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.status(200).json({ message: "Successfully deleted User" });
};

const deleteAdmin = async (req, res, next) => {
  const aId = req.params.aid;
  let admin;
  try {
    admin = await Admin.findById(aId);
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  if (!admin) {
    return next(new HttpError("Admin Couldn't be Deleted", 500));
  }

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: admin.image,
  };

  const command = new DeleteObjectCommand(params);
  await s3.send(command);

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

const deleteCourse = async (req, res, next) => {
  const cId = req.params.cid;

  try {
    await Course.deleteOne({ _id: cId });
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }

  res.status(200).json({ message: "Successfully deleted Course" });
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

const updateUserStatus = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { status } = req.body;

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

  user.status = status;

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't update Admin",
      500
    );

    return next(error);
  }

  try {
    await client.sendEmail({
      From: "thomas@cdtdrivingart.com",
      To: user.email,
      Subject: "Registration Approved",
      HtmlBody:
        "<p>Dear confident driver,</p><p>Your request for registration has been approved.</p><p>Please head onto our site and log into your dashboard to begin your journey towards driver's licence</p><p>Thank You</p>",
      TextBody:
        "Dear confident driver,Your request for registration has been approved.Please head onto our site and log into your dashboard to begin your journey towards driver's licence.Thank You",
      MessageStream: "signup",
    });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  res.status(200).json({
    user: user.toObject({ getters: true }),
  });
};

const delayAppointment = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  let startTime = req.params.sid;
  let today = req.params.tid;
  let { startInt } = req.body;
  let apps;
  try {
    apps = await Appointment.find({ date: today });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  for (const app of apps) {
    const appTime = getIntValue(app.startTime);
    if (appTime >= startInt) {
      let newStart = appTime + 0.5;
      let newEnd = getIntValue(app.endTime) + 0.5;

      app.startTime = getTimeValue(newStart);
      app.endTime = getTimeValue(newEnd);
      try {
        await app.save();
      } catch (err) {
        return next(new HttpError(err.message, 404));
      }
    }
  }

  res.json({
    appointment: apps.map((elem) => elem.toObject({ getters: true })),
  });
};

const payUserDue = async (req, res, next) => {
  const userId = req.params.uid;

  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }
  user.totalPaid += Math.abs(user.extraPay);
  user.extraPay = 0;

  try {
    await user.save();
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  res.status(200).json({
    user: user.toObject({ getters: true }),
  });
};

const addSuggestedCourse = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const userId = req.params.uid;
  const { courseName } = req.body;
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  user.suggestedCourse = courseName;
  try {
    await user.save();
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  res.json({ user: user.toObject({ getters: true }) });
};

const removeCourse = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const userID = req.params.uid;
  const { courseId } = req.body;

  let user;
  try {
    user = await User.findById(userID);
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  user.suggestedCourse = "";

  try {
    await user.save();
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  res.json({ user: user.toObject({ getters: true }) });
};

const searchUser = async (req, res, next) => {
  searchParams = req.params.info;
  let user;
  try {
    user = await User.findOne({ number: searchParams });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  if (user) {
    res.json({ user: user.toObject({ getters: true }) });
  }

  try {
    user = await User.findOne({ email: searchParams });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  if (user) {
    res.json({ user: user.toObject({ getters: true }) });
  } else {
    return next(new HttpError("No user found with the number or email", 404));
  }
};

const linkAppointment = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { userId } = req.body;
  const appId = req.params.aid;

  let appointment;
  let appointments;
  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }

  if (!user) {
    return next(new HttpError("no user found, please try again later", 404));
  }

  try {
    appointments = await Appointment.find({ userId: userId });
  } catch (err) {
    return next(new HttpError(err.message, 404));
  }
  count = 0;
  for (app of appointments) {
    if (app.status == "PENDING" || app.status == "ADMIN CONFIRMED") {
      count++;
    }
  }

  if (count <= 2) {
    try {
      appointment = await Appointment.findById(appId);
    } catch (err) {
      return next(new HttpError(err.message, 404));
    }

    if (appointment) {
      curD = new Date();
      appointment.userId = userId;
      appointment.name = user.fname + " " + user.lname;
      appointment.email = user.email;
      appointment.number = user.number;
      appointment.appName = "lesson" + curD.toLocaleDateString("en-CA");
      try {
        await appointment.save();
      } catch (err) {
        throw new HttpError(err.message, 404);
      }

      res.json({ appointment: appointment.toObject({ getters: true }) });
    } else {
      return next(
        new HttpError(" No Appointment found, please try again later", 404)
      );
    }
  } else {
    return next(new HttpError("Appointment Limit For the user exceeded", 404));
  }
};

exports.createAdmin = createAdmin;
exports.createCourse = createCourse;
exports.createAssessment = createAssessment;

exports.getAdminInfo = getAdminInfo;
exports.getCourseInfo = getCourseInfo;
exports.getAllUser = getAllUser;
exports.getAllAdmin = getAllAdmin;
exports.getAllAppointment = getAllAppointment;
exports.getAllCourse = getAllCourse;

exports.logIn = logIn;

exports.updateUser = updateUser;
exports.updateAdmin = updateAdmin;
exports.updateAppointment = updateAppointment;
exports.updateUserStatus = updateUserStatus;

exports.deleteUser = deleteUser;
exports.deleteAdmin = deleteAdmin;
exports.deleteAppointment = deleteAppointment;
exports.deleteCourse = deleteCourse;

exports.delayAppointment = delayAppointment;
exports.payUserDue = payUserDue;
exports.addSuggestedCourse = addSuggestedCourse;
exports.removeCourse = removeCourse;
exports.searchUser = searchUser;
exports.linkAppointment = linkAppointment;
