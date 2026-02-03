const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth");
const checkAuth = require("../middlewares/checkAuth");

router.get("/verify", checkAuth, authController.verify);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/logout", authController.logout);

module.exports = router;
