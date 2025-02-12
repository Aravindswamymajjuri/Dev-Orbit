const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const Task = require('../models/taskModel');
const Submission = require('../models/submissionModel');
const { Student } = require('../models/roles'); // Ensure Team model is imported
const Team = require('../models/teams');

// Create a new task (admin only)
router.post('/tasks', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { title, description } = req.body;
    const task = new Task({ title, description });
    await task.save();
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all tasks
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }

});

router.get('/mentor-tasks', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const mentorId = req.user.userId;
    console.log('Fetching tasks for mentor ID:', mentorId);

    // Find all teams for the mentor
    const teams = await Team.find({ mentor: mentorId }).populate('students');
    const mentorStudents = teams.reduce((acc, team) => acc.concat(team.students), []);
    const mentorStudentIds = mentorStudents.map(student => student._id.toString());
    console.log('Mentor student IDs:', mentorStudentIds);

    // Get all tasks of the students from the Submission model
    const submissions = await Submission.find({
      student: { $in: mentorStudentIds }
    }).populate('task');

    // Extract tasks from submissions
    const allStudentTasks = {};
    submissions.forEach(submission => {
      const studentId = submission.student.toString();
      if (!allStudentTasks[studentId]) {
        allStudentTasks[studentId] = [];
      }
      allStudentTasks[studentId].push(submission.task);
    });

    res.json(allStudentTasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit a task
router.post('/submissions', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const { taskId, githubLink } = req.body;
    const studentId = req.user.userId;
    const submission = new Submission({ task: taskId, student: studentId, githubLink });
    await submission.save();
    res.status(201).json({ message: 'Submission created successfully', submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get submissions for a task (mentor only)
router.get('/submissions/:taskId', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const { taskId } = req.params;
    const mentorId = req.user.userId;

    // Find all teams for the mentor
    const teams = await Team.find({ mentor: mentorId }).populate('students');
    const mentorStudents = teams.reduce((acc, team) => acc.concat(team.students), []);

    // Get submissions for the task from mentor's students only
    const submissions = await Submission.find({
      task: taskId,
      student: { $in: mentorStudents.map(student => student._id) }
    }).populate('student', 'name');

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all submissions for a specific student
router.get('/submissions', authenticateToken, requireRole(['student', 'mentor']), async (req, res) => {
  try {
    const { studentId } = req.query;
    const submissions = await Submission.find({ student: studentId })
      .populate('task', 'title description createdAt')
      .populate('student', 'name email'); // Include student details
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get completed tasks for a specific student
router.get('/submissions/completed/:studentId', authenticateToken, requireRole(['student', 'mentor']), async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log("backend studentId",studentId)
    const submissions = await Submission.find({ student: studentId }).populate({
      path: 'task',
      model: 'Task',
      select: 'title description'
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Grade a submission (mentor only)
router.put('/submissions/:submissionId', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { marks } = req.body;
    const mentorId = req.user.userId;
    const submission = await Submission.findByIdAndUpdate(submissionId, { marks, mentor: mentorId }, { new: true });
    res.json({ message: 'Submission graded successfully', submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get submission statistics
router.get('/submissions/stats', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    console.log('Fetching total students count...');
    const totalStudents = await Student.countDocuments();
    console.log('Total students:', totalStudents);

    console.log('Fetching total submissions count...');
    const totalSubmissions = await Submission.countDocuments();
    console.log('Total submissions:', totalSubmissions);
    
    res.json({
      totalStudents,
      totalSubmissions
    });
  } catch (error) {
    console.error('Error fetching submission stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get team submission statistics
router.get('/submissions/team/:teamId', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamStudents = await Student.find({ team: teamId });
    const teamSubmissions = await Submission.countDocuments({
      student: { $in: teamStudents.map(student => student._id) }
    });
    
    res.json({
      totalStudents: teamStudents.length,
      submissions: teamSubmissions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get teams for mentor
router.get('/teams/mentor', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const mentorId = req.user.userId;
    const teams = await Team.find({ mentor: mentorId });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get team members by team ID
router.get('/teams/:teamId/members', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const { teamId } = req.params;
    console.log(`Fetching team members for team ID: ${teamId}`);
    const team = await Team.findById(teamId).populate('students', 'name');
    if (!team) {
      console.log('Team not found');
      return res.status(404).json({ message: 'Team not found' });
    }
    console.log('Team found:', team);
    res.json(team.students);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get overall task completion for mentor's students
router.get('/submissions/mentor/completion', authenticateToken, requireRole(['mentor']), async (req, res) => {
  try {
    const mentorId = req.user.userId;
    const teams = await Team.find({ mentor: mentorId }).populate('students');
    const allStudents = teams.reduce((acc, team) => acc.concat(team.students), []);
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Submission.countDocuments({
      student: { $in: allStudents.map(student => student._id) }
    });

    const completionPercentage = (completedTasks / (allStudents.length * totalTasks)) * 100;

    res.json({
      totalStudents: allStudents.length,
      totalTasks,
      completedTasks,
      completionPercentage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
