const HttpError = require("../../models/htttp-error");
const { validationResult } = require("express-validator");

const Appointment = require("../../models/appointment");

const Stripe = require("stripe");

const updateStatus = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }
  const { status } = req.body;
  const aId = req.params.aid;

  let appointment;

  try {
    appointment = await Appointment.findById(aId);
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong, couldn't find appointment to update status",
        500
      )
    );
  }

  appointment.status = status;

  try {
    await appointment.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, couldn't update status", 500)
    );
  }

  res
    .status(200)
    .json({ appointment: appointment.toObject({ getters: true }) });
};

const getAppointmentInfo = async (req, res, next) => {
  const aId = req.params.aid;

  let appointment;

  try {
    appointment = await Appointment.findById(aId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find the appoointment",
      500
    );

    return next(error);
  }

  if (!appointment) {
    return next(new HttpError("Could not find Appointment Info", 404));
  }

  res.json({ appointment: appointment.toObject({ getters: true }) });
};

const getAllAppointmentInfo = async (req, res, next) => {
  const userId = req.params.uid;

  let appointment;

  try {
    appointment = await Appointment.find({ userId: userId });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find appointmnet for the user",
      500
    );

    return next(error);
  }

  if (!appointment) {
    return next(new HttpError("Could not find Appointment Info", 404));
  }

  if (appointment.length === 0) {
    return res.json({
      message: "No Appointment found",
    });
  }
  res.json({
    appointment: appointment.map((app) => {
      return app.toObject({ getters: true });
    }),
  });
};

const getAppointmenmtTime = async (req, res, next) => {
  const startTime = req.params.startTime;

  let appointment;

  try {
    appointment = await Appointment.find({ startTime: startTime });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, coudldn't find appointment",
      500
    );

    return next(error);
  }

  if (!appointment) {
    const error = new HttpError("No appointments on that time");

    return next(error);
  }

  res.json({
    appointment: appointment.map((app) => {
      return app.toObject({ getters: true });
    }),
  });
};

const getAppointmentDay = async (req, res, next) => {
  const appDate = req.params.day;

  let appointments;

  try {
    appointments = await Appointment.find({ date: appDate });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, coudldn't find appointment on that day",
      500
    );
  }

  if (!appointments) {
    const error = new HttpError("No appointments on that day");

    return next(error);
  }

  if (appointments.length === 0) {
    return res.json({
      message: "No Appointment found",
    });
  }

  res.json({
    appointment: appointments.map((app) => {
      return app.toObject({ getters: true });
    }),
  });
};

const createIntent = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }
  console.log(req.body);
  const { name, email, amount } = req.body;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
  try {
    const customer = await stripe.customers.create({
      email: email,
      name: name,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      customer: customer.id,
      currency: "cad",
      amount: amount,
    });
    res.status(200).send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    return next(new HttpError(err.message, 500));
  }
};

const updatePayment = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Invalid data", 422));
  }

  const { amount } = req.body;
  const aId = req.params.aid;

  let appointment;

  try {
    appointment = await Appointment.findById(aId);
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong, couldn't find appointment to update payment",
        500
      )
    );
  }

  (appointment.paymentStatus = "PAID"),
    (appointment.due = parseInt(appointment.due) - amount);
  appointment.amountPaid = amount;

  await appointment.save();

  res
    .status(200)
    .send({ appointment: appointment.toObject({ getters: true }) });
};

const deleteAppointment = async (req, res, next) => {
  const aId = req.params.aid;

  let appointment;

  try {
    appointment = await Appointment.findById(aId);
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong, couldn't find appointment to delete",
        500
      )
    );
  }

  try {
    await appointment.remove();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, couldn't delete Appointement", 500)
    );
  }

  res.status(200).json({ message: "Successfully deleted appointment" });
};

exports.getAllAppointmentInfo = getAllAppointmentInfo;

exports.updateStatus = updateStatus;
exports.updatePayment = updatePayment;
exports.getAppointmentInfo = getAppointmentInfo;
exports.getAppointmenmtTime = getAppointmenmtTime;
exports.getAppointmentDay = getAppointmentDay;

exports.deleteAppointment = deleteAppointment;

exports.createIntent = createIntent;
