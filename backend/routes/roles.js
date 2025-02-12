const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Import Models
const { Student, Mentor, Admin } = require('../models/roles');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_USER,
    pass: process.env.ADMIN_PASS
  }
});

const otpStore = new Map();

// Signup Routes
router.post('/student/signup', async (req, res) => {
  try {
    const { name, email, phoneNumber, password, rollNo, branch, year, college, github, linkedin } = req.body;
    
    // Log the incoming request body
    console.log("Student Signup Request Body:", req.body);
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const student = new Student({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      rollNo,
      branch,
      year,
      college,
      github,
      linkedin
    });
    
    await student.save();
    res.status(201).json({ message:'Student registered successfully' });
  } catch (error) {
    console.error("Student Signup Error:", error);
    res.status(500).json({ error:error.message });
  }
});

// Mentor Signup Route
router.post('/mentor/signup', async (req,res) => {
 try {
   const {name,email,phoneNumber,password,github,linkedin} = req.body;

   // Log the incoming request body
   console.log("Mentor Signup Request Body:", req.body);

   const hashedPassword=await bcrypt.hash(password ,10);

   const mentor=new Mentor({
     name,
     email,
     phoneNumber,
     password : hashedPassword,
     github,
     linkedin
   });

   await mentor.save();
   res.status(201).json({message:'Mentor registered successfully'});
 } catch(error){
   console.error("Mentor Signup Error:", error);
   res.status(500).json({error:error.message});
 }
});

// Admin Signup Route
router.post('/admin/signup', async (req,res) => {
 try {
   const {name,email,phoneNumber,password} = req.body;

   const hashedPassword=await bcrypt.hash(password ,10);

   const admin=new Admin({
     name,
     email,
     phoneNumber,
     password : hashedPassword
   });

   await admin.save();
   res.status(201).json({message:'Admin registered successfully'});
 } catch(error){
   res.status(500).json({error:error.message});
 }
});

// Login Routes
router.post('/student/login', async (req,res) => {
 try {
   const {email,password} = req.body;

   const student=await Student.findOne({email});
   if(!student){
     return res.status(401).json({message:'Invalid email or password'});
   }

   const isValidPassword=await bcrypt.compare(password ,student.password);
   if(!isValidPassword){
     return res.status(401).json({message:'Invalid email or password'});
   }

   const token=jwt.sign({userId : student._id , role : 'student'}, 'your-secret-key',{expiresIn:'1h'});
   res.json({token,student:student.id});
 } catch(error){
   res.status(500).json({error:error.message});
 }
});

// Mentor Login Route
router.post('/mentor/login', async (req,res) => {
 try {
   const {email,password} = req.body;

   const mentor=await Mentor.findOne({email});
   if(!mentor){
     return res.status(401).json({message:'Invalid email or password'});
   }

   const isValidPassword=await bcrypt.compare(password ,mentor.password);
   if(!isValidPassword){
     return res.status(401).json({message:'Invalid email or password'});
   }

   const token=jwt.sign({userId : mentor._id , role : 'mentor'}, 'your-secret-key',{expiresIn:'1h'});
   res.json({token});
 } catch(error){
   res.status(500).json({error:error.message});
 }
});

// Admin Login Route
// Step 1: Verify credentials and send OTP
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore.set(email, {
      otp,
      expiry: Date.now() + 300000, // 5 minutes
      adminId: admin._id
    });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Login OTP',
      text: `Your OTP for login is: ${otp}`
    });

    res.json({ message: 'OTP sent successfully', requireOTP: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Step 2: Verify OTP and complete login
router.post('/admin/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const storedData = otpStore.get(email);

    if (!storedData || storedData.otp !== parseInt(otp) || Date.now() > storedData.expiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    const token = jwt.sign(
      { userId: storedData.adminId, role: 'admin' },
      'your-secret-key',
      { expiresIn: '1h' }
    );

    otpStore.delete(email);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password with old password
router.post('/admin/reset-password', async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      console.log("Missing input fields");
      return res.status(400).json({ message: "Missing input fields" });
    }

    // Find the user by email
    const admin = await Admin.findOne({ email }); // Searching by email
    if (!admin) {
      console.log("Admin not found");
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if old password is correct
    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);
    if (!isValidPassword) {
      console.log("Invalid old password");
      return res.status(401).json({ message: "Invalid old password" });
    }

    // Hash and save the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    console.log("Password updated successfully");
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reset password with OTP
router.post('/admin/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(404).json({ message: "Email not found!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate OTP
    const expiry = Date.now() + 600000; // OTP expires in 10 minutes

    otpStore.set(email, { otp, expiry }); // Store OTP with email and expiry time
    // Send OTP via email logic here...
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`
    });
    res.json({ message: "OTP sent to your email!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/validate-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const storedOTP = otpStore.get(email);
    if (!storedOTP || storedOTP.otp !== otp || Date.now() > storedOTP.expiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP validated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/reset-forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Reset Password Routes
router.post('/student/reset-password', async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      console.log("Missing input fields");
      return res.status(400).json({ message: "Missing input fields" });
    }

    const user = await Student.findOne({ email });
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      console.log("Invalid old password");
      return res.status(401).json({ message: "Invalid old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    console.log("Password updated successfully");
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/student/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Student.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "Email not found!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 600000;

    otpStore.set(email, { otp, expiry });
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`
    });
    res.json({ message: "OTP sent to your email!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/student/validate-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const storedOTP = otpStore.get(email);
    if (!storedOTP || storedOTP.otp !== otp || Date.now() > storedOTP.expiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP validated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/student/reset-forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await Student.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mentor Reset Password Routes
router.post('/mentor/reset-password', async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      console.log("Missing input fields");
      return res.status(400).json({ message: "Missing input fields" });
    }

    const mentor = await Mentor.findOne({ email });
    if (!mentor) {
      console.log("Mentor not found");
      return res.status(404).json({ message: "Mentor not found" });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, mentor.password);
    if (!isValidPassword) {
      console.log("Invalid old password");
      return res.status(401).json({ message: "Invalid old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    mentor.password = hashedPassword;
    await mentor.save();

    console.log("Password updated successfully");
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/mentor/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const mentor = await Mentor.findOne({ email });
    
    if (!mentor) {
      return res.status(404).json({ message: "Email not found!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 600000;

    otpStore.set(email, { otp, expiry });
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`
    });
    res.json({ message: "OTP sent to your email!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mentor/validate-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const storedOTP = otpStore.get(email);
    if (!storedOTP || storedOTP.otp !== otp || Date.now() > storedOTP.expiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP validated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mentor/reset-forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const mentor = await Mentor.findOne({ email });

    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    mentor.password = hashedPassword;
    await mentor.save();

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;