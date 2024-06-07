const mongoose = require("mongoose");
const mongooseUniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  image: { type: String, required: true },
  imageURL: { type: String },
  email: { type: String, required: true },
  number: { type: String, required: true },
  gender: { type: String, required: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String, requird: true },
  about: { type: String },
  zipcode: { type: String },
  country: { type: String },
  city: { type: String },
  coverImage: { type: String },
  coverImageURL: { type: String },
  activeCourse: { type: String },
  suggestedCourse: { type: String },
  latestScore: { type: String },
  scoreIndicator: { type: String },
  totalHours: { type: String },
  hourIndicator: { type: String },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  totalPaid: { type: Number, default: 0 },
  lessons: { type: Number, default: 0 },
  extraPay: { type: Number, default: 0 },
  courseDuration: { type: String },
  curToken: { type: String },
});

userSchema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model("User", userSchema);
