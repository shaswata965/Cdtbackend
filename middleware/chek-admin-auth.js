const HttpError = require("../models/htttp-error");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      throw new err("Authorization Failed", 401);
    }

    const decodedToken = jwt.verify(token, process.env.ADMIN_SECRET_KEY);

    req.adminData = { adminId: decodedToken.adminId };
    next();
  } catch (err) {
    return next(new HttpError("Authorization Failed", 401));
  }
};
