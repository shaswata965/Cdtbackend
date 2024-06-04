const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const courseSchema = Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  number: { type: String, required: true },
  featureArray: [
    {
      type: String,
      required: true,
    },
  ],
  duration: { type: String, required: true },
});

module.exports = mongoose.model("Course", courseSchema);
