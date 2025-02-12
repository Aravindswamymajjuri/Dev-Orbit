const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });
const processStudents = require('../middleware/processcsv'); // Import the processStudents middleware

const router = express.Router();

router.post('/register-students', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const students = [];
  const errors = [];
  const existingStudents = [];

  try {
    if (req.file.mimetype === 'text/csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => {
            students.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      students.push(...xlsx.utils.sheet_to_json(sheet));
    } else {
      return res.status(400).json({ error: 'Invalid file format' });
    }

    // Use the imported processStudents function
    const results = await processStudents(students);
    
    res.json({
      message: 'File processed',
      registered: results.registered,
      errors: results.errors,
      existingStudents: results.existingStudents
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file' });
  } finally {
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
  }
});

module.exports = router;