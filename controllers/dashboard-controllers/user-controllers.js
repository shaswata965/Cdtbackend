const HttpError = require("../../models/htttp-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");

const bcrypt = require("bcryptjs");

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const sharp = require("sharp");

const User = require("../../models/user");

const Assessment = require("../../models/assessment");

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});

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

  const getObjectParams1 = {
    Bucket: process.env.BUCKET_NAME,
    Key: user.image,
  };

  const command1 = new GetObjectCommand(getObjectParams1);
  const url1 = await getSignedUrl(s3, command1, { expiresIn: 5 * 3600 });
  user.imageURL = url1;

  if (user.coverImage) {
    const getObjectParams2 = {
      Bucket: process.env.BUCKET_NAME,
      Key: user.coverImage,
    };

    const command2 = new GetObjectCommand(getObjectParams2);
    const url2 = await getSignedUrl(s3, command2, { expiresIn: 5 * 3600 });
    user.coverImageURL = url2;
  }

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(err, 500);

    return next(error);
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

  const imageName = uuidv4() + req.files.profileImage[0].originalname;
  const coverImageName = uuidv4() + req.files.coverImage[0].originalname;

  const imageBuffer = await sharp(req.files.profileImage[0].buffer)
    .resize({ height: 500, width: 500, fit: "contain" })
    .toBuffer();

  const coverImageBuffer = await sharp(req.files.coverImage[0].buffer)
    .resize({ height: 841, width: 2000, fit: "contain" })
    .toBuffer();

  const params1 = {
    Bucket: process.env.BUCKET_NAME,
    Key: imageName,
    Body: imageBuffer,
    ContentType: req.file.mimetype,
  };

  const params2 = {
    Bucket: process.env.BUCKET_NAME,
    Key: coverImageName,
    Body: coverImageBuffer,
    ContentType: req.file.mimetype,
  };

  const command1 = new PutObjectCommand(params1);
  const command2 = new PutObjectCommand(params2);

  await s3.send(command1);
  await s3.send(command2);

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
  user.image = imageName;
  user.coverImage = coverImageName;

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
