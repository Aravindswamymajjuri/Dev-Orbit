// models/MentorRequest.js
const mongoose = require('mongoose');

// Base fields (not as an object to spread, but to copy into each schema)
const baseFields = {
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mentor',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
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
    type: String
  },
  adminNotes: {
    type: String
  }
};

// Item Request Schema
const itemRequestSchema = new mongoose.Schema({
  ...baseFields,
  title: { type: String, required: true },
  hyperlink: { type: String, required: true },
  description: { type: String, required: true },
  requestType: {
    type: String,
    default: 'item',
    enum: ['item']
  }
});

// Folder Request Schema (only folderTitle, no description)
const folderRequestSchema = new mongoose.Schema({
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mentor',
    required: true
  },
  folderTitle: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: { type: Date },
  rejectionReason: { type: String },
  adminNotes: { type: String },
  requestType: {
    type: String,
    default: 'folder',
    enum: ['folder']
  }
});

// PDF Request Schema
const pdfRequestSchema = new mongoose.Schema({
  ...baseFields,
  title: { type: String }, // Not required, only folderId and pdf required
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: true
  },
  pdf: {
    data: Buffer,
    contentType: String
  },
  requestType: {
    type: String,
    default: 'pdf',
    enum: ['pdf']
  }
});

// Video Folder Request Schema
const videoFolderRequestSchema = new mongoose.Schema({
  ...baseFields,
  folderTitle: { type: String, required: true },
  folderThumbnail: { type: String, required: true },
  requestType: {
    type: String,
    default: 'videoFolder',
    enum: ['videoFolder']
  }
});

// Video Request Schema
const videoRequestSchema = new mongoose.Schema({
  ...baseFields,
  title: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, required: true },
  type: {
    type: String,
    enum: ['lecture', 'tutorial'],
    required: true
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoFolder',
    required: true
  },
  requestType: {
    type: String,
    default: 'video',
    enum: ['video']
  }
});

// Export all models
const ItemRequest = mongoose.model('ItemRequest', itemRequestSchema);
const FolderRequest = mongoose.model('FolderRequest', folderRequestSchema);
const PDFRequest = mongoose.model('PDFRequest', pdfRequestSchema);
const VideoFolderRequest = mongoose.model('VideoFolderRequest', videoFolderRequestSchema);
const VideoRequest = mongoose.model('VideoRequest', videoRequestSchema);

module.exports = {
  ItemRequest,
  FolderRequest,
  PDFRequest,
  VideoFolderRequest,
  VideoRequest
};
