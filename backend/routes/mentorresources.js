// routes/mentorResources.js - DEBUGGING VERSION
const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import models with error handling
let ItemRequest, FolderRequest, PDFRequest, VideoFolderRequest, VideoRequest;
let Folder, VideoFolder;

try {
  const mentorModels = require('../models/mentorresources');
  ItemRequest = mentorModels.ItemRequest;
  FolderRequest = mentorModels.FolderRequest;
  PDFRequest = mentorModels.PDFRequest;
  VideoFolderRequest = mentorModels.VideoFolderRequest;
  VideoRequest = mentorModels.VideoRequest;
  console.log('✅ Mentor resource models loaded successfully');
} catch (error) {
  console.error('❌ Error loading mentor resource models:', error);
}

try {
  const folderModels = require('../models/folder');
  Folder = folderModels.Folder || folderModels.default;
  console.log('✅ Folder model loaded successfully');
} catch (error) {
  console.error('❌ Error loading folder model:', error);
  // Create fallback
  Folder = {
    findOne: async () => null,
    find: async () => []
  };
}

try {
  const videoFolderModels = require('../models/VideoFolder');
  VideoFolder = videoFolderModels.VideoFolder || videoFolderModels.default;
  console.log('✅ VideoFolder model loaded successfully');
} catch (error) {
  console.error('❌ Error loading VideoFolder model:', error);
  // Create fallback
  VideoFolder = {
    findOne: async () => null,
    find: async () => []
  };
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// GET MENTOR'S REQUESTS - IMPROVED ERROR HANDLING
router.get('/my-requests/:mentorId', async (req, res) => {
  try {
    const { mentorId } = req.params;
    
    console.log('📋 Fetching requests for mentor:', mentorId);
    
    if (!mentorId) {
      console.log('❌ No mentor ID provided');
      return res.status(400).json({ error: 'Mentor ID is required' });
    }

    // Validate mentorId format (MongoDB ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(mentorId)) {
      console.log('❌ Invalid mentor ID format:', mentorId);
      return res.status(400).json({ error: 'Invalid mentor ID format' });
    }

    // Check if models are available
    if (!ItemRequest || !FolderRequest || !PDFRequest || !VideoFolderRequest || !VideoRequest) {
      console.log('❌ Models not properly loaded');
      return res.status(500).json({ error: 'Database models not available' });
    }

    console.log('🔍 Fetching all request types...');

    // Fetch all request types for this mentor with individual error handling
    const results = await Promise.allSettled([
      ItemRequest.find({ mentorId }).sort({ requestDate: -1 }).lean(),
      FolderRequest.find({ mentorId }).sort({ requestDate: -1 }).lean(),
      PDFRequest.find({ mentorId }).populate('folderId', 'title').sort({ requestDate: -1 }).lean(),
      VideoFolderRequest.find({ mentorId }).sort({ requestDate: -1 }).lean(),
      VideoRequest.find({ mentorId }).populate('folderId', 'folderTitle').sort({ requestDate: -1 }).lean()
    ]);

    console.log('📊 Promise results:', results.map((r, i) => ({
      index: i,
      status: r.status,
      count: r.status === 'fulfilled' ? r.value?.length : 0,
      error: r.status === 'rejected' ? r.reason?.message : null
    })));

    // Extract successful results and log failed ones
    const [itemsResult, foldersResult, pdfsResult, videoFoldersResult, videosResult] = results;
    
    const items = itemsResult.status === 'fulfilled' ? itemsResult.value : [];
    const folders = foldersResult.status === 'fulfilled' ? foldersResult.value : [];
    const pdfs = pdfsResult.status === 'fulfilled' ? pdfsResult.value : [];
    const videoFolders = videoFoldersResult.status === 'fulfilled' ? videoFoldersResult.value : [];
    const videos = videosResult.status === 'fulfilled' ? videosResult.value : [];

    // Log any failed queries
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const types = ['ItemRequest', 'FolderRequest', 'PDFRequest', 'VideoFolderRequest', 'VideoRequest'];
        console.error(`❌ Failed to fetch ${types[index]}:`, result.reason);
      }
    });

    console.log('📈 Retrieved counts:', {
      items: items.length,
      folders: folders.length,
      pdfs: pdfs.length,
      videoFolders: videoFolders.length,
      videos: videos.length
    });

    // Add requestType to each request for frontend identification
    const allRequests = [
      ...items.map(item => ({ ...item, requestType: 'item' })),
      ...folders.map(folder => ({ ...folder, requestType: 'folder' })),
      ...pdfs.map(pdf => ({ ...pdf, requestType: 'pdf' })),
      ...videoFolders.map(vf => ({ ...vf, requestType: 'videoFolder' })),
      ...videos.map(video => ({ ...video, requestType: 'video' }))
    ];

    // Sort by request date (newest first)
    allRequests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    console.log('✅ Successfully fetched', allRequests.length, 'total requests');
    
    res.json(allRequests);
    
  } catch (error) {
    console.error('❌ Error fetching mentor requests:', error);
    
    // More detailed error response
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// CREATE NEW REQUEST - IMPROVED ERROR HANDLING 
router.post('/request', upload.single('pdf'), async (req, res) => {
  try {
    console.log('📝 Creating new request...');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? { name: req.file.originalname, size: req.file.size } : null);
    
    const { requestType, mentorId } = req.body;
    
    // Validate required fields
    if (!requestType || !mentorId) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Request type and mentor ID are required' 
      });
    }

    // Validate mentorId format
    if (!/^[0-9a-fA-F]{24}$/.test(mentorId)) {
      console.log('❌ Invalid mentor ID format:', mentorId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid mentor ID format' 
      });
    }

    // Check if models are available
    if (!ItemRequest || !FolderRequest || !PDFRequest || !VideoFolderRequest || !VideoRequest) {
      console.log('❌ Models not properly loaded');
      return res.status(500).json({ 
        success: false, 
        message: 'Database models not available' 
      });
    }

    let newRequest;

    switch (requestType) {
      case 'item':
        const { title, hyperlink, description } = req.body;
        if (!title || !hyperlink || !description) {
          return res.status(400).json({ 
            success: false, 
            message: 'Title, hyperlink, and description are required for item requests' 
          });
        }
        
        newRequest = new ItemRequest({
          mentorId,
          title,
          hyperlink,
          description,
          status: 'pending',
          requestDate: new Date()
        });
        break;

      case 'folder':
        const { folderTitle } = req.body;
        if (!folderTitle) {
          return res.status(400).json({ 
            success: false, 
            message: 'Folder title is required for folder requests' 
          });
        }
        
        newRequest = new FolderRequest({
          mentorId,
          folderTitle,
          status: 'pending',
          requestDate: new Date()
        });
        break;

      case 'pdf':
        const { title: pdfTitle, folderId } = req.body;
        if (!folderId || !req.file) {
          return res.status(400).json({ 
            success: false, 
            message: 'Folder ID and PDF file are required for PDF requests' 
          });
        }
        
        // Check if folderId corresponds to an approved folder request by this mentor
        let validFolder = null;
        
        try {
          const approvedFolderRequest = await FolderRequest.findOne({
            _id: folderId,
            mentorId: mentorId,
            status: 'approved'
          });
          validFolder = approvedFolderRequest;
        } catch (error) {
          console.log('Error checking folder request:', error.message);
        }
        
        // Also check existing folders (if available)
        if (!validFolder && Folder.findOne) {
          try {
            const existingFolder = await Folder.findOne({
              _id: folderId,
              createdBy: mentorId // Adjust this field name as needed
            });
            validFolder = existingFolder;
          } catch (error) {
            console.log('Error checking existing folder:', error.message);
          }
        }
        
        if (!validFolder) {
          return res.status(400).json({ 
            success: false, 
            message: 'Selected folder does not exist or is not approved' 
          });
        }
        
        newRequest = new PDFRequest({
          mentorId,
          title: pdfTitle || req.file.originalname.replace('.pdf', ''),
          folderId,
          pdf: {
            data: req.file.buffer,
            contentType: req.file.mimetype
          },
          status: 'pending',
          requestDate: new Date()
        });
        break;

      case 'videoFolder':
        const { folderTitle: videoFolderTitle, folderThumbnail } = req.body;
        if (!videoFolderTitle || !folderThumbnail) {
          return res.status(400).json({ 
            success: false, 
            message: 'Folder title and thumbnail URL are required for video folder requests' 
          });
        }
        
        newRequest = new VideoFolderRequest({
          mentorId,
          folderTitle: videoFolderTitle,
          folderThumbnail,
          status: 'pending',
          requestDate: new Date()
        });
        break;

      case 'video':
        const { title: videoTitle, description: videoDescription, link, type, folderId: videoFolderId } = req.body;
        if (!videoTitle || !videoDescription || !link || !type || !videoFolderId) {
          return res.status(400).json({ 
            success: false, 
            message: 'All fields are required for video requests' 
          });
        }
        
        // Check if the video folder ID corresponds to an approved video folder request
        let validVideoFolder = null;
        
        try {
          const approvedVideoFolderRequest = await VideoFolderRequest.findOne({
            _id: videoFolderId,
            mentorId: mentorId,
            status: 'approved'
          });
          validVideoFolder = approvedVideoFolderRequest;
        } catch (error) {
          console.log('Error checking video folder request:', error.message);
        }
        
        if (!validVideoFolder && VideoFolder.findOne) {
          try {
            const existingVideoFolder = await VideoFolder.findOne({
              _id: videoFolderId,
              createdBy: mentorId
            });
            validVideoFolder = existingVideoFolder;
          } catch (error) {
            console.log('Error checking existing video folder:', error.message);
          }
        }
        
        if (!validVideoFolder) {
          return res.status(400).json({ 
            success: false, 
            message: 'Selected video folder does not exist or is not approved. Please create a video folder request first and wait for approval.' 
          });
        }
        
        newRequest = new VideoRequest({
          mentorId,
          title: videoTitle,
          description: videoDescription,
          link,
          type,
          folderId: videoFolderId,
          status: 'pending',
          requestDate: new Date()
        });
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid request type' 
        });
    }

    // Save the request
    console.log('💾 Saving request...');
    const savedRequest = await newRequest.save();
    
    console.log('✅ Request created successfully:', savedRequest._id);
    
    res.status(201).json({
      success: true,
      message: 'Request submitted successfully',
      request: {
        ...savedRequest.toObject(),
        requestType
      }
    });

  } catch (error) {
    console.error('❌ Error creating request:', error);
    
    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'File size too large. Maximum size is 10MB.' 
      });
    }
    
    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only PDF files are allowed for PDF requests.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred while creating the request',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET APPROVED FOLDERS FOR PDF REQUESTS
router.get('/approved-folders/:mentorId', async (req, res) => {
  try {
    const { mentorId } = req.params;
    
    console.log('📁 Fetching approved folders for mentor:', mentorId);
    
    if (!mentorId || !/^[0-9a-fA-F]{24}$/.test(mentorId)) {
      return res.status(400).json({ error: 'Valid mentor ID is required' });
    }
    
    // Find approved folder requests by this mentor
    const approvedFolderRequests = await FolderRequest.find({ 
      mentorId, 
      status: 'approved' 
    }).select('folderTitle _id');
    
    console.log('✅ Found', approvedFolderRequests.length, 'approved folder requests');
    
    // Also get existing folders created by this mentor (if any)
    let existingFolders = [];
    if (Folder && Folder.find) {
      try {
        existingFolders = await Folder.find({ 
          createdBy: mentorId // Adjust field name as needed
        }).select('title _id');
        console.log('✅ Found', existingFolders.length, 'existing folders');
      } catch (error) {
        console.log('❌ Error fetching existing folders:', error.message);
      }
    }
    
    // Combine both sources
    const folders = [
      ...approvedFolderRequests.map(req => ({ 
        _id: req._id, 
        folderTitle: req.folderTitle,
        source: 'request'
      })),
      ...existingFolders.map(folder => ({ 
        _id: folder._id, 
        folderTitle: folder.title,
        source: 'existing'
      }))
    ];
    
    console.log('📋 Returning', folders.length, 'total folders');
    res.json({ folders });
    
  } catch (error) {
    console.error('❌ Error fetching approved folders:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// GET APPROVED VIDEO FOLDERS FOR VIDEO REQUESTS
router.get('/approved-video-folders/:mentorId', async (req, res) => {
  try {
    const { mentorId } = req.params;
    
    console.log('🎥 Fetching approved video folders for mentor:', mentorId);
    
    if (!mentorId || !/^[0-9a-fA-F]{24}$/.test(mentorId)) {
      return res.status(400).json({ error: 'Valid mentor ID is required' });
    }
    
    // Find approved video folder requests by this mentor
    const approvedVideoFolderRequests = await VideoFolderRequest.find({ 
      mentorId, 
      status: 'approved' 
    }).select('folderTitle _id');
    
    console.log('✅ Found', approvedVideoFolderRequests.length, 'approved video folder requests');
    
    // Also get existing video folders created by this mentor (if any)
    let existingVideoFolders = [];
    if (VideoFolder && VideoFolder.find) {
      try {
        existingVideoFolders = await VideoFolder.find({ 
          createdBy: mentorId // Adjust field name as needed
        }).select('folderTitle _id');
        console.log('✅ Found', existingVideoFolders.length, 'existing video folders');
      } catch (error) {
        console.log('❌ Error fetching existing video folders:', error.message);
      }
    }
    
    // Combine both sources
    const folders = [
      ...approvedVideoFolderRequests.map(req => ({ 
        _id: req._id, 
        folderTitle: req.folderTitle,
        source: 'request'
      })),
      ...existingVideoFolders.map(folder => ({ 
        _id: folder._id, 
        folderTitle: folder.folderTitle,
        source: 'existing'
      }))
    ];
    
    console.log('📋 Returning', folders.length, 'total video folders');
    res.json({ folders });
    
  } catch (error) {
    console.error('❌ Error fetching approved video folders:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router;