const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const dashboardRoutes = require("./routes/dashboard-routes");
const homeRoutes = require("./routes/home-routes");
const adminRoutes = require("./routes/admin-routes");

const app = express();
app.use("/upload/images/", express.static(path.join("upload", "images")));
app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Access, Authorization"
  );
  res.setHeader("Acess-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/home", homeRoutes);

app.use("/api/admin", adminRoutes);

app.use((error, req, res, next) => {
  if (req.files?.profileImage) {
    fs.unlink(req.files.profileImage[0].path, (err) => {
      console.log(err);
    });
  } else if (req.files?.coverImage) {
    fs.unlink(req.files.coverImage[0].path, (err) => {
      console.log(err);
    });
  } else if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headersSent) {
    return next(error);
  }

  res.status(error.code || 500).json(error.message || "Unknown Error Occured");
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qqhb3.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    console.log("Connected to Database");
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });
