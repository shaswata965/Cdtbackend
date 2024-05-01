const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const adminSchema = Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  image: { type: String, required: true },
  email: { type: String, required: true },
  number: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Admin", adminSchema);
