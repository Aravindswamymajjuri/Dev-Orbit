const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Import Models
const { Student, Mentor, Coordinator, Admin } = require('../models/roles');

// Fix: use createTransport, not createTransporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_USER,
    pass: process.env.ADMIN_PASS
  }
});

// ==================== SIGNUP ROUTES ====================

// Student Signup Route
router.post('/student/signup', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phoneNumber, 
      password, 
      rollNo, 
      branch, 
      year, 
      currentYear,
      college, 
      github, 
      linkedin 
    } = req.body;
    
    console.log("Student Signup Request Body:", req.body);
    
    // Validation for required fields
    if (!name || !email || !phoneNumber || !password || !rollNo || !branch || !year || !currentYear || !college) {
      return res.status(400).json({ 
        error: 'All required fields must be provided' 
      });
    }

    // Validate currentYear enum
    const validCurrentYears = ['first year', 'second year', 'third year', 'fourth year', 'alumni'];
    if (!validCurrentYears.includes(currentYear)) {
      return res.status(400).json({ 
        error: 'Invalid current year selection' 
      });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [
        { email: email },
        { phoneNumber: phoneNumber },
        { rollNo: rollNo }
      ]
    });

    if (existingStudent) {
      let errorMessage = 'Student already exists with this ';
      if (existingStudent.email === email) {
        errorMessage += 'email address';
      } else if (existingStudent.phoneNumber === phoneNumber) {
        errorMessage += 'phone number';
      } else if (existingStudent.rollNo === rollNo) {
        errorMessage += 'roll number';
      }
      return res.status(409).json({ error: errorMessage });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new student object
    const student = new Student({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      rollNo,
      branch,
      year,
      currentYear,
      college,
      github: github || null,
      linkedin: linkedin || null
    });
    
    // Save student to database
    await student.save();
    
    console.log("Student registered successfully:", {
      id: student._id,
      name: student.name,
      email: student.email,
      currentYear: student.currentYear
    });
    
    res.status(201).json({ 
      message: 'Student registered successfully',
      studentId: student._id
    });
    
  } catch (error) {
    console.error("Student Signup Error:", error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let errorMessage = '';
      
      switch (field) {
        case 'email':
          errorMessage = 'This email address is already registered';
          break;
        case 'phoneNumber':
          errorMessage = 'This phone number is already registered';
          break;
        case 'rollNo':
          errorMessage = 'This roll number is already registered';
          break;
        default:
          errorMessage = 'A student with this information already exists';
      }
      
      return res.status(409).json({ error: errorMessage });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    // Generic server error
    res.status(500).json({ 
      error: 'Internal server error. Please try again later.' 
    });
  }
});

// Mentor Signup Route
router.post('/mentor/signup', async (req, res) => {
  try {
    const {name, email, phoneNumber, password, github, linkedin} = req.body;

    console.log("Mentor Signup Request Body:", req.body);

    // Validation for required fields
    if (!name || !email || !phoneNumber || !password || !github || !linkedin) {
      return res.status(400).json({ 
        error: 'All required fields must be provided' 
      });
    }

    // Check if mentor already exists
    const existingMentor = await Mentor.findOne({
      $or: [
        { email: email },
        { phoneNumber: phoneNumber }
      ]
    });

    if (existingMentor) {
      let errorMessage = 'Mentor already exists with this ';
      if (existingMentor.email === email) {
        errorMessage += 'email address';
      } else if (existingMentor.phoneNumber === phoneNumber) {
        errorMessage += 'phone number';
      }
      return res.status(409).json({ error: errorMessage });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const mentor = new Mentor({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      github,
      linkedin,
      status: 'pending'
    });

    await mentor.save();
    
    res.status(201).json({
      message: 'Mentor registration submitted successfully. Your account is pending approval by an administrator.',
      mentorId: mentor._id
    });
  } catch(error) {
    console.error("Mentor Signup Error:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({error: error.message});
  }
});

// Coordinator Signup Route
router.post('/coordinator/signup', async (req, res) => {
  try {
    const { name, email, phoneNumber, college, year, github, linkedin, password } = req.body;

    console.log("Coordinator Signup Request Body:", req.body);

    // Validation for required fields
    if (!name || !email || !phoneNumber || !college || !github || !linkedin || !password) {
      return res.status(400).json({ 
        error: 'All required fields must be provided' 
      });
    }

    // No year validation, year can be null

    // Check if coordinator already exists
    const existingCoordinator = await Coordinator.findOne({
      $or: [
        { email: email },
        { phoneNumber: phoneNumber }
      ]
    });

    if (existingCoordinator) {
      let errorMessage = 'Coordinator already exists with this ';
      if (existingCoordinator.email === email) {
        errorMessage += 'email address';
      } else if (existingCoordinator.phoneNumber === phoneNumber) {
        errorMessage += 'phone number';
      }
      return res.status(409).json({ error: errorMessage });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const coordinator = new Coordinator({
      name,
      email,
      phoneNumber,
      college,
      year: null,
      github,
      linkedin,
      password: hashedPassword
    });

    await coordinator.save();
    
    console.log("Coordinator registered successfully:", {
      id: coordinator._id,
      name: coordinator.name,
      email: coordinator.email,
      year: coordinator.year
    });
    
    res.status(201).json({
      message: 'Coordinator registered successfully',
      coordinatorId: coordinator._id
    });
  } catch(error) {
    console.error("Coordinator Signup Error:", error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let errorMessage = '';
      
      switch (field) {
        case 'email':
          errorMessage = 'This email address is already registered';
          break;
        case 'phoneNumber':
          errorMessage = 'This phone number is already registered';
          break;
        default:
          errorMessage = 'A coordinator with this information already exists';
      }
      
      return res.status(409).json({ error: errorMessage });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({error: error.message});
  }
});

// Admin Signup Route
router.post('/admin/signup', async (req,res) => {
 try {
   const {name, email, phoneNumber, password} = req.body;

   // Validation for required fields
   if (!name || !email || !phoneNumber || !password) {
     return res.status(400).json({ 
       error: 'All required fields must be provided' 
     });
   }

   // Check if admin already exists
   const existingAdmin = await Admin.findOne({
     $or: [
       { email: email },
       { phoneNumber: phoneNumber }
     ]
   });

   if (existingAdmin) {
     let errorMessage = 'Admin already exists with this ';
     if (existingAdmin.email === email) {
       errorMessage += 'email address';
     } else if (existingAdmin.phoneNumber === phoneNumber) {
       errorMessage += 'phone number';
     }
     return res.status(409).json({ error: errorMessage });
   }

   const hashedPassword = await bcrypt.hash(password, 10);

   const admin = new Admin({
     name,
     email,
     phoneNumber,
     password: hashedPassword
   });

   await admin.save();
   res.status(201).json({message:'Admin registered successfully'});
 } catch(error){
   console.error("Admin Signup Error:", error);
   
   // Handle validation errors
   if (error.name === 'ValidationError') {
     const validationErrors = Object.values(error.errors).map(err => err.message);
     return res.status(400).json({ 
       error: 'Validation failed: ' + validationErrors.join(', ') 
     });
   }
   
   res.status(500).json({error:error.message});
 }
});

// ==================== LOGIN ROUTES ====================

// Student Login Route
router.post('/student/login', async (req,res) => {
 try {
   const {email, password} = req.body;

   if (!email || !password) {
     return res.status(400).json({message: 'Email and password are required'});
   }

   const student = await Student.findOne({email});
   if(!student){
     return res.status(401).json({message:'Invalid email or password'});
   }

   const isValidPassword = await bcrypt.compare(password, student.password);
   if(!isValidPassword){
     return res.status(401).json({message:'Invalid email or password'});
   }

   const token = jwt.sign({userId: student._id, role: 'student'}, 'your-secret-key', {expiresIn:'1h'});
   res.json({token, student: student._id, studentyear: student.currentYear, role: 'student'});
 } catch(error){
   console.error("Student Login Error:", error);
   res.status(500).json({error: error.message});
 }
});

// Mentor Login Route
router.post('/mentor/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({message: 'Email and password are required'});
    }

    const mentor = await Mentor.findOne({ email });

    if (!mentor) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (mentor.status !== 'approved') {
      return res.status(403).json({ message: 'Your account is not approved yet. Please wait for approval from the administrator.' });
    }

    const isValidPassword = await bcrypt.compare(password, mentor.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: mentor._id, role: 'mentor' },
      'your-secret-key',
      { expiresIn: '1h' }
    );

    res.json({ token, role: 'mentor', mentor: mentor._id });
  } catch (error) {
    console.error("Mentor Login Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Coordinator Login Route
router.post('/coordinator/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({message: 'Email and password are required'});
    }

    const coordinator = await Coordinator.findOne({ email });

    if (!coordinator) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, coordinator.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: coordinator._id, role: 'coordinator' },
      'your-secret-key',
      { expiresIn: '1h' }
    );

    res.json({ token, role: 'coordinator', coordinator: coordinator._id, coordinatorYear: coordinator.year });
  } catch (error) {
    console.error("Coordinator Login Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Login Route
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({message: 'Email and password are required'});
    }

    const admin = await Admin.findOne({ email });
    
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 300000); // 5 minutes from now
    
    // Save OTP in database
    admin.otp = otp;
    admin.otpExpiry = otpExpiry;
    await admin.save();

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Login OTP',
      text: `Your OTP for login is: ${otp}`
    });
    
    res.json({ message: 'OTP sent successfully', requireOTP: true });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin OTP Verification Route
router.post('/admin/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({message: 'Email and OTP are required'});
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if OTP is valid and not expired
    if (!admin.otp || admin.otp !== otp || !admin.otpExpiry || new Date() > admin.otpExpiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: admin._id, role: 'admin' },
      'your-secret-key',
      { expiresIn: '1h' }
    );
    
    // Clear OTP fields after successful verification
    admin.otp = null;
    admin.otpExpiry = null;
    await admin.save();

    res.json({ token, admin: admin._id.toString(), role: 'admin' });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PASSWORD RESET ROUTES ====================

// Student Password Reset Routes
router.post('/student/reset-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "Missing input fields" });
    }

    const user = await Student.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Student Password Reset Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/student/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await Student.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "Email not found!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 600000); // 10 minutes expiry
    
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`
    });
    res.json({ message: "OTP sent to your email!" });
  } catch (error) {
    console.error("Student Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/student/validate-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await Student.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP validated successfully!' });
  } catch (error) {
    console.error("Student OTP Validation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/student/reset-forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    const user = await Student.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry || Date.now() > user.otpExpiry) {
      return res.status(401).json({ message: "OTP validation required or expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    
    await user.save();

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error("Student Reset Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mentor Password Reset Routes
router.post('/mentor/reset-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "Missing input fields" });
    }

    const mentor = await Mentor.findOne({ email });
    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, mentor.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    mentor.password = hashedPassword;
    await mentor.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Mentor Password Reset Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/mentor/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const mentor = await Mentor.findOne({ email });
    
    if (!mentor) {
      return res.status(404).json({ message: "Email not found!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 600000);
    
    mentor.otp = otp;
    mentor.otpExpiry = otpExpiry;
    await mentor.save();
    
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`
    });
    res.json({ message: "OTP sent to your email!" });
  } catch (error) {
    console.error("Mentor Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/mentor/validate-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const mentor = await Mentor.findOne({ email });
    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    if (!mentor.otp || mentor.otp !== otp || Date.now() > mentor.otpExpiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP validated successfully!' });
  } catch (error) {
    console.error("Mentor OTP Validation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/mentor/reset-forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    const mentor = await Mentor.findOne({ email });

    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    if (!mentor.otp || !mentor.otpExpiry || Date.now() > mentor.otpExpiry) {
      return res.status(401).json({ message: "OTP validation required or expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    mentor.password = hashedPassword;
    mentor.otp = null;
    mentor.otpExpiry = null;
    
    await mentor.save();

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error("Mentor Reset Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Coordinator Password Reset Routes
router.post('/coordinator/reset-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "Missing input fields" });
    }

    const coordinator = await Coordinator.findOne({ email });
    if (!coordinator) {
      return res.status(404).json({ message: "Coordinator not found" });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, coordinator.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    coordinator.password = hashedPassword;
    await coordinator.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Coordinator Password Reset Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/coordinator/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const coordinator = await Coordinator.findOne({ email });
    
    if (!coordinator) {
      return res.status(404).json({ message: "Email not found!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 600000);
    
    coordinator.otp = otp;
    coordinator.otpExpiry = otpExpiry;
    await coordinator.save();
    
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`
    });
    res.json({ message: "OTP sent to your email!" });
  } catch (error) {
    console.error("Coordinator Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/coordinator/validate-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const coordinator = await Coordinator.findOne({ email });
    if (!coordinator) {
      return res.status(404).json({ message: "Coordinator not found" });
    }

    if (!coordinator.otp || coordinator.otp !== otp || Date.now() > coordinator.otpExpiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP validated successfully!' });
  } catch (error) {
    console.error("Coordinator OTP Validation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/coordinator/reset-forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    const coordinator = await Coordinator.findOne({ email });

    if (!coordinator) {
      return res.status(404).json({ message: "Coordinator not found" });
    }

    if (!coordinator.otp || !coordinator.otpExpiry || Date.now() > coordinator.otpExpiry) {
      return res.status(401).json({ message: "OTP validation required or expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    coordinator.password = hashedPassword;
    coordinator.otp = null;
    coordinator.otpExpiry = null;
    
    await coordinator.save();

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error("Coordinator Reset Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Password Reset Routes
router.post('/admin/reset-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "Missing input fields" });
    }

    const admin = await Admin.findOne({ email }); 
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Admin Password Reset Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    console.log(`Processing forgot password for admin email: ${email}`);
    
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      console.log(`Admin not found with email: ${email}`);
      return res.status(404).json({ message: "Email not found!" });
    }

    console.log(`Found admin: ${admin._id}`);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 600000); // 10 minutes from now
    
    console.log(`Generated OTP: ${otp} with expiry: ${otpExpiry}`);
    
    admin.otp = otp;
    admin.otpExpiry = otpExpiry;
    
    try {
      const savedAdmin = await admin.save();
      console.log(`Admin saved with OTP. Updated document:`, {
        id: savedAdmin._id,
        email: savedAdmin.email,
        hasOtp: !!savedAdmin.otp,
        otpValue: savedAdmin.otp,
        otpExpiry: savedAdmin.otpExpiry
      });
    } catch (saveError) {
      console.error("Error saving admin with OTP:", saveError);
      return res.status(500).json({ message: "Failed to save OTP. Database error." });
    }

    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}`
      });
      
      console.log(`Email sent successfully to ${email}`);
      res.json({ message: "OTP sent to your email!" });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      admin.otp = undefined;
      admin.otpExpiry = undefined;
      await admin.save();
      
      res.status(500).json({ message: "Failed to send OTP email. Please try again later." });
    }
  } catch (error) {
    console.error("Admin Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/validate-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (!admin.otp || admin.otp !== otp || !admin.otpExpiry || new Date() > admin.otpExpiry) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ message: 'OTP validated successfully!' });
  } catch (error) {
    console.error("Admin OTP Validation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/reset-forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    if (!admin.otp || !admin.otpExpiry) {
      return res.status(400).json({ message: "OTP validation required before password reset" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    
    await admin.save();

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    console.error("Admin Reset Forgot Password Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UTILITY ROUTES ====================

// Get user profile routes
router.get('/student/profile/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error("Get Student Profile Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/mentor/profile/:id', async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }
    res.json(mentor);
  } catch (error) {
    console.error("Get Mentor Profile Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/coordinator/profile/:id', async (req, res) => {
  try {
    const coordinator = await Coordinator.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!coordinator) {
      return res.status(404).json({ message: 'Coordinator not found' });
    }
    res.json(coordinator);
  } catch (error) {
    console.error("Get Coordinator Profile Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/admin/profile/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password -otp -otpExpiry');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json(admin);
  } catch (error) {
    console.error("Get Admin Profile Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update profile routes (excluding password)
router.put('/student/profile/:id', async (req, res) => {
  try {
    const { password, otp, otpExpiry, ...updateData } = req.body;
    
    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpiry');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json({ message: 'Profile updated successfully', student });
  } catch (error) {
    console.error("Update Student Profile Error:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.put('/mentor/profile/:id', async (req, res) => {
  try {
    const { password, otp, otpExpiry, status, requestDate, approvalDate, rejectionReason, ...updateData } = req.body;
    
    const mentor = await Mentor.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpiry');
    
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }
    
    res.json({ message: 'Profile updated successfully', mentor });
  } catch (error) {
    console.error("Update Mentor Profile Error:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.put('/coordinator/profile/:id', async (req, res) => {
  try {
    const { password, otp, otpExpiry, ...updateData } = req.body;
    
    const coordinator = await Coordinator.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpiry');
    
    if (!coordinator) {
      return res.status(404).json({ message: 'Coordinator not found' });
    }
    
    res.json({ message: 'Profile updated successfully', coordinator });
  } catch (error) {
    console.error("Update Coordinator Profile Error:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.put('/admin/profile/:id', async (req, res) => {
  try {
    const { password, otp, otpExpiry, ...updateData } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpiry');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ message: 'Profile updated successfully', admin });
  } catch (error) {
    console.error("Update Admin Profile Error:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed: ' + validationErrors.join(', ') 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;