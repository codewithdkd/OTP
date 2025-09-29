import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// In-memory OTP storage
let otpStore = {}; // { email: { otp, expires } }

// SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { email, customMessage } = req.body;
  if (!email) return res.status(400).send("Email required");

  const otp = crypto.randomInt(100000, 999999).toString();
  otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 }; // 5 minutes

  const mailBody = customMessage
    ? `${customMessage}\nYour OTP is ${otp}. It expires in 5 minutes.`
    : `Your OTP is ${otp}. It expires in 5 minutes.`;

  try {
    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: mailBody
    });
    res.send({ message: "OTP sent successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error sending OTP" });
  }
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).send({ message: "No OTP found" });
  if (Date.now() > record.expires) return res.status(400).send({ message: "OTP expired" });
  if (record.otp !== otp) return res.status(400).send({ message: "Invalid OTP" });

  delete otpStore[email];
  res.send({ message: "OTP verified successfully!" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
