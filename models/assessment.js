const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const assessmentSchema = Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  appointmentId: { type: String, required: true },
  infractions: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Assessment", assessmentSchema);
