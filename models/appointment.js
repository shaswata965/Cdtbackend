const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const appointmentSchema = Schema({
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: String, required: true },
  paymentStatus: { type: String, required: true },
  interacNum: { type: String, required: true },
  amountPaid: { type: String, required: true },
  due: { type: String, required: true },
  address: { type: String, required: true },
  name: { type: String, required: true },
  number: { type: String, required: true },
  email: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, required: true },
  courseName: { type: String, required: true },
  appName: { type: String },
  alerts: [
    {
      time: { type: String, required: true },
      date: { type: String, required: true },
      alertText: { type: String, required: true },
    },
  ],
  completed: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
