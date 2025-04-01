// studentcsv.js - Router file
const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const processStudents = require('../middleware/processcsv');

const router = express.Router();

// Configure multer to use memory storage instead of disk storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/register-students', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const students = [];

  try {
    if (req.file.mimetype === 'text/csv') {
      // For CSV files, create a readable stream from the buffer
      const { Readable } = require('stream');
      const readableStream = new Readable();
      readableStream.push(req.file.buffer);
      readableStream.push(null);

      await new Promise((resolve, reject) => {
        readableStream
          .pipe(csv())
          .on('data', (row) => {
            students.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // For Excel files, read directly from the buffer
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
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
    res.status(500).json({ error: 'Error processing file', details: error.message });
  }
  // No need to unlink files since we're using memory storage
});

module.exports = router;