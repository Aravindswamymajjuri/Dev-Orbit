const mongoose = require('mongoose');

// Common validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/; // Indian phone number format
  return phoneRegex.test(phone);
};

const validateGithubUrl = (url) => {
  if (!url) return true; // Optional field
  const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
  return githubRegex.test(url);
};

const validateLinkedinUrl = (url) => {
  if (!url) return true; // Optional field for some schemas
  const linkedinRegex = /^https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
  return linkedinRegex.test(url);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const validateRollNumber = (rollNo) => {
  // Format: 2 digits (year) + 3 characters (branch code) + 3 digits (student number)
  const rollNoRegex = /^[0-9]{2}[A-Z]{3}[0-9]{3}$/;
  return rollNoRegex.test(rollNo);
};

// Student Schema
const studentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validateEmail,
      message: 'Please provide a valid email address'
    }
  },
  phoneNumber: { 
    type: String, 
    required: [true, 'Phone number is required'], 
    unique: true,
    validate: {
      validator: validatePhoneNumber,
      message: 'Please provide a valid 10-digit Indian phone number'
    }
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    validate: {
      validator: validatePassword,
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  },
  rollNo: { 
    type: String, 
    required: [true, 'Roll number is required'], 
    unique: true,
    uppercase: true,
    validate: {
      validator: validateRollNumber,
      message: 'Roll number must be in format: YYBBBSSS (YY-year, BBB-branch code, SSS-student number)'
    }
  },
  branch: { 
    type: String, 
    required: [true, 'Branch is required'],
    trim: true,
    enum: {
      values: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'CHEM', 'BIOTECH', 'AERO', 'OTHER'],
      message: 'Please select a valid branch'
    }
  },
  year: { 
    type: String, 
    required: [true, 'Year is required'],
    enum: {
      values: ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028'],
      message: 'Please provide a valid year'
    }
  },
  currentYear: { 
    type: String, 
    required: [true, 'Current year is required'],
    enum: {
      values: ['first year', 'second year', 'third year', 'fourth year', 'alumni'],
      message: 'Current year must be one of: first year, second year, third year, fourth year, alumni'
    },
    default: 'first year'
  },
  college: { 
    type: String, 
    required: [true, 'College name is required'],
    trim: true,
    minlength: [3, 'College name must be at least 3 characters long'],
    maxlength: [100, 'College name cannot exceed 100 characters']
  },
  github: { 
    type: String,
    trim: true,
    validate: {
      validator: validateGithubUrl,
      message: 'Please provide a valid GitHub URL (https://github.com/username)'
    }
  },
  linkedin: { 
    type: String,
    trim: true,
    validate: {
      validator: validateLinkedinUrl,
      message: 'Please provide a valid LinkedIn URL (https://www.linkedin.com/in/username/)'
    }
  },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null }
}, {
  timestamps: true
});

// Mentor Schema
const mentorSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validateEmail,
      message: 'Please provide a valid email address'
    }
  },
  phoneNumber: { 
    type: String, 
    required: [true, 'Phone number is required'],
    validate: {
      validator: validatePhoneNumber,
      message: 'Please provide a valid 10-digit Indian phone number'
    }
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    validate: {
      validator: validatePassword,
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  },
  github: { 
    type: String, 
    required: [true, 'GitHub URL is required'],
    trim: true,
    validate: {
      validator: validateGithubUrl,
      message: 'Please provide a valid GitHub URL (https://github.com/username)'
    }
  },
  linkedin: { 
    type: String, 
    required: [true, 'LinkedIn URL is required'],
    trim: true,
    validate: {
      validator: validateLinkedinUrl,
      message: 'Please provide a valid LinkedIn URL (https://www.linkedin.com/in/username/)'
    }
  },
  status: { 
    type: String, 
    enum: {
      values: ['pending', 'approved', 'rejected'],
      message: 'Status must be pending, approved, or rejected'
    }, 
    default: 'pending' 
  },
  requestDate: { 
    type: Date, 
    default: Date.now 
  },
  approvalDate: { 
    type: Date 
  },
  rejectionReason: { 
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null }
}, {
  timestamps: true
});

// Coordinator Schema
const coordinatorSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validateEmail,
      message: 'Please provide a valid email address'
    }
  },
  phoneNumber: { 
    type: String, 
    required: [true, 'Phone number is required'],
    validate: {
      validator: validatePhoneNumber,
      message: 'Please provide a valid 10-digit Indian phone number'
    }
  },
  college: { 
    type: String, 
    required: [true, 'College name is required'],
    trim: true,
    minlength: [3, 'College name must be at least 3 characters long'],
    maxlength: [100, 'College name cannot exceed 100 characters']
  },
  year: { 
    type: String, 
    required: false,
    default: null
  },
  github: { 
    type: String, 
    required: [true, 'GitHub URL is required'],
    trim: true,
    validate: {
      validator: validateGithubUrl,
      message: 'Please provide a valid GitHub URL (https://github.com/username)'
    }
  },
  linkedin: { 
    type: String, 
    required: [true, 'LinkedIn URL is required'],
    trim: true,
    validate: {
      validator: validateLinkedinUrl,
      message: 'Please provide a valid LinkedIn URL (https://www.linkedin.com/in/username/)'
    }
  },
  password: { 
    type: String, 
    required: [true, 'Password is required']
    // validate: {
    //   validator: validatePassword,
    //   message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    // }
  },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null }
}, {
  timestamps: true
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validateEmail,
      message: 'Please provide a valid email address'
    }
  },
  phoneNumber: { 
    type: String, 
    required: [true, 'Phone number is required'],
    validate: {
      validator: validatePhoneNumber,
      message: 'Please provide a valid 10-digit Indian phone number'
    }
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    validate: {
      validator: validatePassword,
      message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }
  },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null }
}, {
  timestamps: true
});

// Add indexes for better performance
studentSchema.index({ email: 1, phoneNumber: 1, rollNo: 1 });
mentorSchema.index({ email: 1, phoneNumber: 1 });
coordinatorSchema.index({ email: 1, phoneNumber: 1 });
adminSchema.index({ email: 1, phoneNumber: 1 });

// Pre-save middleware to hash passwords (you'll need bcrypt)
// Uncomment and modify as needed
/*
const bcrypt = require('bcrypt');

studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

mentorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

coordinatorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
*/

// Export Models
const Student = mongoose.model('Student', studentSchema);
const Mentor = mongoose.model('Mentor', mentorSchema);
const Coordinator = mongoose.model('Coordinator', coordinatorSchema);
const Admin = mongoose.model('Admin', adminSchema);

module.exports = {
  Student,
  Mentor,
  Coordinator,
  Admin
};