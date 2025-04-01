const mongoose = require('mongoose');

const gradeCriteriaSchema = new mongoose.Schema({
  programName: {
    type: String,
    required: true
  },
  passingMarks: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  grades: [{
    grade: {
      type: String,
      required: true
    },
    minMarks: {
      type: Number,
      required: true
    },
    maxMarks: {
      type: Number,
      required: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const GradeCriteria = mongoose.model('GradeCriteria', gradeCriteriaSchema);

module.exports = GradeCriteria;