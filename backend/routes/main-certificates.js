const { authenticateToken } = require("../middleware/auth");
const Certificate = require("../models/main-certificate");
const GradeCriteria = require("../models/grade-criteria");
const { Student, Admin } = require("../models/roles");
const Report = require("../models/reportModel");
const Submission = require("../models/submissionModel");
const { v4: uuidv4 } = require('uuid');
const router = require("express").Router();

// Create or update grade criteria
router.post("/grade-criteria", authenticateToken, async (req, res) => {
  try {
    // Ensure user is available from the middleware
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
        success: false,
      });
    }

    // Use the userId from the request body if provided, otherwise from the token
    const userId = req.body.userId || req.user?.userId || req.user?.id;
    
    // Find admin by ID
    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(403).send({
        message: "Admin not found",
        success: false,
      });
    }

    // Since we're querying the Admin collection directly, we don't need to check the role
    
    const { programName, passingMarks, totalMarks, grades } = req.body;

    // Validate input
    if (!programName || !passingMarks || !totalMarks || !grades || !Array.isArray(grades)) {
      return res.status(400).send({
        message: "Invalid input: Missing required fields",
        success: false,
      });
    }

    // Validate grades structure
    for (const grade of grades) {
      if (!grade.grade || grade.minMarks === undefined || grade.maxMarks === undefined) {
        return res.status(400).send({
          message: "Invalid grade criteria format",
          success: false,
        });
      }
    }

    // Check if criteria already exists
    let criteria = await GradeCriteria.findOne({ programName });
    
    if (criteria) {
      // Update existing criteria
      criteria.passingMarks = passingMarks;
      criteria.totalMarks = totalMarks;
      criteria.grades = grades;
      criteria.updatedAt = Date.now();
      await criteria.save();
    } else {
      // Create new criteria
      criteria = new GradeCriteria({
        programName,
        passingMarks,
        totalMarks,
        grades,
        createdBy: userId,
        certificatesGenerated: false // Initialize as false for new criteria
      });
      await criteria.save();
    }

    res.send({
      message: "Grade criteria saved successfully",
      data: criteria,
      success: true,
    });
  } catch (error) {
    console.error("Error in grade criteria:", error);
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Update a specific grade criteria by ID
router.put("/grade-criteria/:id", authenticateToken, async (req, res) => {
  try {
    // Ensure user is available from the middleware
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
        success: false,
      });
    }

    const criteriaId = req.params.id;
    const userId = req.body.userId || req.user?.userId || req.user?.id;
    
    // Find admin by ID
    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(403).send({
        message: "Admin not found",
        success: false,
      });
    }

    const { programName, passingMarks, totalMarks, grades } = req.body;

    // Validate input
    if (!programName || !passingMarks || !totalMarks || !grades || !Array.isArray(grades)) {
      return res.status(400).send({
        message: "Invalid input: Missing required fields",
        success: false,
      });
    }

    // Validate grades structure
    for (const grade of grades) {
      if (!grade.grade || grade.minMarks === undefined || grade.maxMarks === undefined) {
        return res.status(400).send({
          message: "Invalid grade criteria format",
          success: false,
        });
      }
    }

    // Find criteria by ID
    const criteria = await GradeCriteria.findById(criteriaId);
    
    if (!criteria) {
      return res.status(404).send({
        message: "Grade criteria not found",
        success: false,
      });
    }

    // Check if certificates have been generated - only allow updates to the grades
    if (criteria.certificatesGenerated) {
      // If certificates have been generated, only allow updating the grades
      criteria.grades = grades;
      criteria.updatedAt = Date.now();
    } else {
      // Otherwise allow full update
      criteria.programName = programName;
      criteria.passingMarks = passingMarks;
      criteria.totalMarks = totalMarks;
      criteria.grades = grades;
      criteria.updatedAt = Date.now();
    }
    
    await criteria.save();
    
    res.send({
      message: "Grade criteria updated successfully",
      data: criteria,
      success: true,
    });
  } catch (error) {
    console.error("Error updating grade criteria:", error);
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Delete a grade criteria by ID
router.delete("/grade-criteria/:id", authenticateToken, async (req, res) => {
  try {
    // Ensure user is available from the middleware
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
        success: false,
      });
    }

    const criteriaId = req.params.id;
    
    // Find criteria by ID
    const criteria = await GradeCriteria.findById(criteriaId);
    
    if (!criteria) {
      return res.status(404).send({
        message: "Grade criteria not found",
        success: false,
      });
    }

    // Check if certificates have been generated for this program
    if (criteria.certificatesGenerated) {
      return res.status(400).send({
        message: "Cannot delete criteria as certificates have been generated using this criteria",
        success: false,
      });
    }

    // Delete the criteria
    await GradeCriteria.findByIdAndDelete(criteriaId);
    
    res.send({
      message: "Grade criteria deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error deleting grade criteria:", error);
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Get all grade criteria
router.get("/grade-criteria", authenticateToken, async (req, res) => {
  try {
    const criteria = await GradeCriteria.find().populate("createdBy", "name email");
    
    res.send({
      message: "Grade criteria fetched successfully",
      data: criteria,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Get a specific grade criteria by ID
router.get("/grade-criteria/:id", authenticateToken, async (req, res) => {
  try {
    const criteriaId = req.params.id;
    
    const criteria = await GradeCriteria.findById(criteriaId).populate("createdBy", "name email");
    
    if (!criteria) {
      return res.status(404).send({
        message: "Grade criteria not found",
        success: false,
      });
    }
    
    res.send({
      message: "Grade criteria fetched successfully",
      data: criteria,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Get list of programs that have already had certificates generated
router.get("/generated-programs", authenticateToken, async (req, res) => {
  try {
    // Find all unique program names that have certificates
    const uniquePrograms = await Certificate.distinct('programName');
    
    res.send({
      message: "Generated programs fetched successfully",
      data: uniquePrograms,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Generate certificates for all students
router.post("/generate-certificates", authenticateToken, async (req, res) => {
  try {
    // Ensure user is available from the middleware
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
        success: false,
      });
    }

    // Use the userId from the request body if provided, otherwise from the token
    const userId = req.body.userId || req.user?.userId || req.user?.id;

    // Find admin by ID
    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(403).send({
        message: "Admin not found",
        success: false,
      });
    }

    // Since we're querying the Admin collection directly, we don't need to check the role

    const { programName } = req.body;
    
    if (!programName) {
      return res.status(400).send({
        message: "Program name is required",
        success: false,
      });
    }

    // Check if certificates were already generated for this program
    const existingCertificates = await Certificate.findOne({ programName });
    if (existingCertificates) {
      return res.status(400).send({
        message: "Certificates have already been generated for this program",
        success: false,
      });
    }

    // Get grade criteria
    const criteria = await GradeCriteria.findOne({ programName });
    if (!criteria) {
      return res.status(404).send({
        message: "Grade criteria not found for this program",
        success: false,
      });
    }

    // Get all students' marks
    const reports = await Report.find().populate("exam").populate("user");
    const submissions = await Submission.find().populate("student");

    const studentMarks = reports.reduce((acc, report) => {
      if (report.user && report.user._id) {
        const studentId = report.user._id.toString();
        if (!acc[studentId]) {
          acc[studentId] = {
            student: report.user,
            totalMarks: 0,
          };
        }
        acc[studentId].totalMarks += report.result.correctAnswers.length;
      }
      return acc;
    }, {});

    submissions.forEach(submission => {
      if (submission.student && submission.student._id) {
        const studentId = submission.student._id.toString();
        if (!studentMarks[studentId]) {
          studentMarks[studentId] = {
            student: submission.student,
            totalMarks: 0,
          };
        }
        studentMarks[studentId].totalMarks += submission.marks || 0;
      }
    });

    // Generate certificates
    const certificates = [];
    const failedStudents = [];

    for (const [studentId, data] of Object.entries(studentMarks)) {
      try {
        // Normalize marks to a percentage of total possible marks
        const normalizedMarks = (data.totalMarks / criteria.totalMarks) * 100;
        let grade = "";
        let certificateType = "participation";

        // Determine grade and certificate type
        if (normalizedMarks >= criteria.passingMarks) {
          certificateType = "completion";
          
          // Find applicable grade
          for (const gradeInfo of criteria.grades) {
            if (normalizedMarks >= gradeInfo.minMarks && normalizedMarks <= gradeInfo.maxMarks) {
              grade = gradeInfo.grade;
              break;
            }
          }
        } else {
          grade = "F"; // Failing grade
        }

        // Generate unique certificate ID
        const certificateId = uuidv4();

        // Create certificate
        const certificate = new Certificate({
          student: studentId,
          programName, // Store the program name in the certificate
          totalMarks: data.totalMarks,
          grade,
          certificateType,
          certificateId,
          issuedBy: userId
        });

        await certificate.save();
        certificates.push(certificate);
      } catch (error) {
        failedStudents.push({ studentId, error: error.message });
      }
    }

    // Update the grade criteria to mark that certificates have been generated
    criteria.certificatesGenerated = true;
    await criteria.save();

    res.send({
      message: "Certificates generated successfully",
      data: {
        certificates,
        failedStudents,
        totalGenerated: certificates.length,
        totalFailed: failedStudents.length
      },
      success: true,
    });
  } catch (error) {
    console.error("Error generating certificates:", error);
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Get all certificates
router.get("/certificates", authenticateToken, async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate("student", "name email rollNo branch year college")
      .populate("issuedBy", "name email")
      .sort({ issueDate: -1 });
    
    res.send({
      message: "Certificates fetched successfully",
      data: certificates,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Get certificates for a specific student
router.get("/student-certificates/:studentId", authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const certificates = await Certificate.find({ student: studentId })
      .populate("student", "name email rollNo branch year college") // Add student details to populate
      .populate("issuedBy", "name email")
      .sort({ issueDate: -1 });
    
    res.send({
      message: "Student certificates fetched successfully",
      data: certificates,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

// Get a single certificate by ID
router.get("/certificate/:certificateId", async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    const certificate = await Certificate.findOne({ certificateId })
      .populate("student", "name email rollNo branch year college")
      .populate("issuedBy", "name email");
    
    if (!certificate) {
      return res.status(404).send({
        message: "Certificate not found",
        success: false,
      });
    }
    
    res.send({
      message: "Certificate fetched successfully",
      data: certificate,
      success: true,
    });
  } catch (error) {
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

router.get("/download-certificates/:programName", authenticateToken, async (req, res) => {
  try {
    // Ensure user is available from the middleware
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
        success: false,
      });
    }

    const { programName } = req.params;
    
    if (!programName) {
      return res.status(400).send({
        message: "Program name is required",
        success: false,
      });
    }

    // Get all certificates for the specified program
    const certificates = await Certificate.find({ programName })
      .populate("student", "name email rollNo branch year college")
      .populate("issuedBy", "name email")
      .sort({ issueDate: -1 });
    
    if (certificates.length === 0) {
      return res.status(404).send({
        message: "No certificates found for this program",
        success: false,
      });
    }
    
    // Return the certificates data
    res.send({
      message: "Certificates fetched successfully",
      data: certificates,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).send({
      message: error.message,
      data: error,
      success: false,
    });
  }
});

module.exports = router;