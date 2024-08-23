import express from "express";
import user from "../Models/user.js";
import { body, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const authRouter = express.Router();

const validateCradentials = [
  body("name")
    .isLength({ min: 3 })
    .withMessage("Name should be at least 3 characters"),
  body("email").isEmail().withMessage("Please enter a valid Email"),
  body("password")
    .isLength({ min: 5 })
    .withMessage("Password length should be at least 5 characters"),
];

authRouter.post("/register", validateCradentials, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, email, password } = req.body;
    const isUserFound = await user.findOne({ email });
    if (isUserFound) {
      return res
        .status(401)
        .json({ message: "User with this email already exists" });
    }
    const saltRound = Number(process.env.SALT_ROUND);
    const salt = await bcrypt.genSalt(saltRound);
    const hashPassword = await bcrypt.hash(password, salt);

    const newUser = await user.create({
      name,
      email,
      password: hashPassword,
    });
    return res.status(200).json(newUser);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "internal server error " + error.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await user.findOne({ email });
    if (!userFound) {
      return res.status(404).json(userFound);
    }
    const confirmPass = await bcrypt.compare(password, userFound.password);
    if (!confirmPass) {
      return res.status(400).json({ message: "wrong password", userFound });
    }
    const payLoad = {
      id: userFound._id,
      email: userFound.email,
      name: userFound.name,
    };
    const token = jwt.sign(payLoad, process.env.SECRET, { expiresIn: "7d" });
    res.cookie("recpieToken", token, {
      httpOnly: true,
      maxAge: 6.048e+8,
    });

    return res.status(200).json({
      id: userFound._id,
      name: userFound.name,
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

authRouter.post("/forgotPassword", async (req, res) => {
  try {
    const { email } = req.body;
    const foundUser = await user.findOne({ email });

    if (!foundUser) {
      return res.status(404).json({ message: "Incorrect email" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_EMAIL,
        pass: process.env.APP_PASSWORD,
      },
    });

    const payload = {
      id: foundUser._id,
      email: foundUser.email,
      name: foundUser.name,
    };

    const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "1h" });

    const mailOptions = {
      from: process.env.MY_EMAIL,
      to: email,
      subject: "Reset Password Request",
      text: `Please use the following link to reset your password: ${process.env.RESET_PASSWORD_MAIL}/${foundUser._id}/${token}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: "Error sending email" });
      } else {
        console.log("Email sent:", info.response);
        return res
          .status(200)
          .json({ message: "Password reset email sent successfully" });
      }
    });
  } catch (error) {
    console.error("Error in forgotPassword route:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
});

authRouter.post("/resetPassword/:id/:token", async (req, res) => {
  try {
    const { id, token } = req.params;
    const { password } = req.body;

    const verifyToken = jwt.verify(token, process.env.SECRET);
    if (!verifyToken) {
      return res.status(400).json({ message: "Tokem expires" });
    }
    const saltRound = Number(process.env.SALT_ROUND);
    const salt = await bcrypt.genSalt(saltRound);
    const hashPassword = await bcrypt.hash(password, salt);

    const updatedUser = await user.findByIdAndUpdate(id, {
      password: hashPassword,
    });
    if (updatedUser) {
      return res.status(200).json({ message: "Password successfully updated" });
    } else {
      return res.status(500).json({ message: "Password not updated" });
    }
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token expired" });
    } else {
      return res
        .status(500)
        .json({ message: "Internal server error: " + error.message });
    }
  }
});

authRouter.get("/profile", (req, res) => {
  try {
    const token = req.cookies.recpieToken;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    jwt.verify(token, process.env.SECRET, (err, info) => {
      if (err) {
        return res.status(400).json({ message: "Token has been expired" });
      } else {
        return res.status(200).json(info);
      }
    });
  } catch (error) {
    return res.status(500).json({ error, message: "INternal server error" });
  }
});

authRouter.post("/logout", (req, res) => {
  try {
    const response = res.clearCookie("recpieToken");
    if (response) {
      return res.status(200).json({ message: "User logout successfully" });
    } else {
      return res
        .status(400)
        .json({ message: "Error while loging out server error" });
    }
  } catch (error) {
    return res.status(500).json({ message: error });
  }
});
export default authRouter;
