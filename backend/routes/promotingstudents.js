const express = require('express');
const router = express.Router();
const { Student } = require('../models/roles'); // <-- Fix: destructure Student

router.get('/students', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      currentYear,
      branch,
      college,
      year,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (currentYear) {
      filter.currentYear = currentYear;
    }
    
    if (branch) {
      filter.branch = new RegExp(branch, 'i'); // Case insensitive
    }
    
    if (college) {
      filter.college = new RegExp(college, 'i'); // Case insensitive
    }
    
    if (year) {
      filter.year = year;
    }
    
    // Search functionality (name, email, rollNo)
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { rollNo: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const students = await Student.find(filter)
      .select('-password') // Exclude password field
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Convert to plain objects for better performance

    // Get total count for pagination
    const totalCount = await Student.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Get statistics
    const stats = await Student.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$currentYear',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum
        },
        statistics: stats,
        filters: {
          currentYear,
          branch,
          college,
          year,
          search,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Route to get unique values for filters (branches, colleges, etc.)
router.get('/students/filters/options', async (req, res) => {
  try {
    // Get unique branches
    const branches = await Student.distinct('branch');
    
    // Get unique colleges
    const colleges = await Student.distinct('college');
    
    // Get unique years
    const years = await Student.distinct('year');
    
    // Current year options
    const currentYears = ['first year', 'second year', 'third year', 'fourth year', 'alumni'];

    res.json({
      success: true,
      data: {
        branches: branches.sort(),
        colleges: colleges.sort(),
        years: years.sort(),
        currentYears
      }
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Route to get students count by various groupings
router.get('/students/analytics/summary', async (req, res) => {
  try {
    // Students by current year
    const byCurrentYear = await Student.aggregate([
      {
        $group: {
          _id: '$currentYear',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Students by branch
    const byBranch = await Student.aggregate([
      {
        $group: {
          _id: '$branch',
          count: { $sum: 1 }
        }
      },
      { $sort: { 'count': -1 } }
    ]);

    // Students by college
    const byCollege = await Student.aggregate([
      {
        $group: {
          _id: '$college',
          count: { $sum: 1 }
        }
      },
      { $sort: { 'count': -1 } }
    ]);

    // Students by admission year
    const byYear = await Student.aggregate([
      {
        $group: {
          _id: '$year',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': -1 } }
    ]);

    // Total count
    const totalStudents = await Student.countDocuments();

    res.json({
      success: true,
      data: {
        totalStudents,
        byCurrentYear,
        byBranch,
        byCollege,
        byYear
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Route to get statistics for all years (useful for frontend dashboard)
router.get('/students/year-statistics', async (req, res) => {
  try {
    const { year, search, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (year && year !== 'all') {
      filter.year = year;
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { rollNo: new RegExp(search, 'i') }
      ];
    }

    // If search or year filter is present, return filtered students grouped by currentYear
    if (Object.keys(filter).length > 0) {
      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Get filtered students
      const students = await Student.find(filter)
        .select('-password')
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Group students by currentYear
      const yearOrder = ['first year', 'second year', 'third year', 'fourth year', 'alumni'];
      const grouped = yearOrder.map(currentYear => {
        const groupStudents = students.filter(s => s.currentYear === currentYear);
        return {
          currentYear,
          count: groupStudents.length,
          students: groupStudents.map(s => ({
            id: s._id,
            name: s.name,
            year: s.year
          })),
          canPromote: currentYear !== 'alumni',
          canDemote: currentYear !== 'first year'
        };
      });

      return res.json({
        success: true,
        data: {
          statistics: grouped,
          totalStudents: students.length
        }
      });
    }

    // Default: return statistics for all students grouped by currentYear
    const stats = await Student.aggregate([
      {
        $group: {
          _id: '$currentYear',
          count: { $sum: 1 },
          students: { 
            $push: { 
              id: '$_id', 
              name: '$name', 
              year: '$year' 
            } 
          }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);
    
    const yearOrder = ['first year', 'second year', 'third year', 'fourth year', 'alumni'];
    const orderedStats = yearOrder.map(year => {
      const found = stats.find(stat => stat._id === year);
      return {
        currentYear: year,
        count: found ? found.count : 0,
        students: found ? found.students : [],
        canPromote: year !== 'alumni',
        canDemote: year !== 'first year'
      };
    });
    
    res.json({
      success: true,
      data: {
        statistics: orderedStats,
        totalStudents: stats.reduce((sum, stat) => sum + stat.count, 0)
      }
    });
    
  } catch (error) {
    console.error('Error getting year statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Route to get a single student by ID
router.get('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const student = await Student.findById(id).select('-password');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: {
        student
      }
    });

  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to get next year progression
const getNextProgression = (currentYear, year) => {
  const currentYearNum = parseInt(year);
  
  switch (currentYear) {
    case 'first year':
      return {
        newYear: (currentYearNum + 1).toString(),
        newCurrentYear: 'second year'
      };
    case 'second year':
      return {
        newYear: (currentYearNum + 1).toString(),
        newCurrentYear: 'third year'
      };
    case 'third year':
      return {
        newYear: (currentYearNum + 1).toString(),
        newCurrentYear: 'fourth year'
      };
    case 'fourth year':
      return {
        newYear: (currentYearNum + 1).toString(), // Year stays same when moving to alumni
        newCurrentYear: 'alumni'
      };
    default:
      return null; // Alumni - no progression possible
  }
};

// Helper function to get previous year progression
const getPreviousProgression = (currentYear, year) => {
  const currentYearNum = parseInt(year);
  
  switch (currentYear) {
    case 'second year':
      return {
        newYear: (currentYearNum - 1).toString(),
        newCurrentYear: 'first year'
      };
    case 'third year':
      return {
        newYear: (currentYearNum - 1).toString(),
        newCurrentYear: 'second year'
      };
    case 'fourth year':
      return {
        newYear: (currentYearNum - 1).toString(),
        newCurrentYear: 'third year'
      };
    case 'alumni':
      return {
        newYear: year, // Year stays same when moving from alumni
        newCurrentYear: 'fourth year'
      };
    default:
      return null; // First year - no demotion possible
  }
};

// Route to promote ALL students of a specific current year
router.patch('/students/promote-by-year/:currentYear', async (req, res) => {
  try {
    const { currentYear } = req.params;
    
    // Validate currentYear parameter
    const validYears = ['first year', 'second year', 'third year', 'fourth year'];
    if (!validYears.includes(currentYear)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid current year. Must be one of: first year, second year, third year, fourth year' 
      });
    }
    
    // Check if trying to promote alumni
    if (currentYear === 'alumni') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot promote alumni students. They have already completed all years.' 
      });
    }
    
    // Find all students with the specified current year
    const students = await Student.find({ currentYear: currentYear });
    
    if (students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No students found in ${currentYear}` 
      });
    }
    
    const results = [];
    const errors = [];
    
    // Process each student
    for (const student of students) {
      try {
        const progression = getNextProgression(student.currentYear, student.year);
        if (!progression) {
          errors.push({ 
            studentId: student._id, 
            name: student.name,
            error: 'Invalid progression logic' 
          });
          continue;
        }
        
        const updatedStudent = await Student.findByIdAndUpdate(
          student._id,
          {
            year: progression.newYear,
            currentYear: progression.newCurrentYear
          },
          { new: true, runValidators: true }
        );
        
        results.push({
          studentId: student._id,
          name: student.name,
          from: student.currentYear,
          to: progression.newCurrentYear,
          newYear: progression.newYear
        });
        
      } catch (err) {
        errors.push({ 
          studentId: student._id, 
          name: student.name,
          error: err.message 
        });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk promotion completed for ${currentYear}. ${results.length} students promoted, ${errors.length} errors.`,
      data: {
        originalYear: currentYear,
        totalStudents: students.length,
        promoted: results,
        errors: errors
      }
    });
    
  } catch (error) {
    console.error('Error in bulk year promotion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Route to demote ALL students of a specific current year
router.patch('/students/demote-by-year/:currentYear', async (req, res) => {
  try {
    const { currentYear } = req.params;
    
    // Validate currentYear parameter
    const validYears = ['second year', 'third year', 'fourth year', 'alumni'];
    if (!validYears.includes(currentYear)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid current year. Must be one of: second year, third year, fourth year, alumni' 
      });
    }
    
    // Check if trying to demote first year
    if (currentYear === 'first year') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot demote first year students. They are already in the lowest year.' 
      });
    }
    
    // Find all students with the specified current year
    const students = await Student.find({ currentYear: currentYear });
    
    if (students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No students found in ${currentYear}` 
      });
    }
    
    const results = [];
    const errors = [];
    
    // Process each student
    for (const student of students) {
      try {
        const progression = getPreviousProgression(student.currentYear, student.year);
        if (!progression) {
          errors.push({ 
            studentId: student._id, 
            name: student.name,
            error: 'Invalid progression logic' 
          });
          continue;
        }
        
        const updatedStudent = await Student.findByIdAndUpdate(
          student._id,
          {
            year: progression.newYear,
            currentYear: progression.newCurrentYear
          },
          { new: true, runValidators: true }
        );
        
        results.push({
          studentId: student._id,
          name: student.name,
          from: student.currentYear,
          to: progression.newCurrentYear,
          newYear: progression.newYear
        });
        
      } catch (err) {
        errors.push({ 
          studentId: student._id, 
          name: student.name,
          error: err.message 
        });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk demotion completed for ${currentYear}. ${results.length} students demoted, ${errors.length} errors.`,
      data: {
        originalYear: currentYear,
        totalStudents: students.length,
        demoted: results,
        errors: errors
      }
    });
    
  } catch (error) {
    console.error('Error in bulk year demotion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});




router.get('/admin/students/pending', async (req, res) => {
  try {
    const pendingStudents = await Student.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        students: pendingStudents,
        count: pendingStudents.length
      }
    });
  } catch (error) {
    console.error('Error fetching pending students:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Approve a student
router.patch('/admin/students/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body; // Pass admin ID from frontend

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Student is not in pending status'
      });
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date()
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Student approved successfully',
      data: { student: updatedStudent }
    });
  } catch (error) {
    console.error('Error approving student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reject a student
router.patch('/admin/students/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, adminId } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Student is not in pending status'
      });
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: adminId,
        approvedAt: new Date()
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Student rejected successfully',
      data: { student: updatedStudent }
    });
  } catch (error) {
    console.error('Error rejecting student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk approve students
router.patch('/admin/students/bulk-approve', async (req, res) => {
  try {
    const { studentIds, adminId } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    const result = await Student.updateMany(
      { 
        _id: { $in: studentIds },
        status: 'pending' 
      },
      {
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} students approved successfully`,
      data: { approvedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error bulk approving students:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get student approval statistics
router.get('/admin/students/approval-stats', async (req, res) => {
  try {
    const stats = await Student.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const pendingByYear = await Student.aggregate([
      {
        $match: { status: 'pending' }
      },
      {
        $group: {
          _id: '$currentYear',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        overallStats: stats,
        pendingByYear: pendingByYear
      }
    });
  } catch (error) {
    console.error('Error fetching approval stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
module.exports = router;