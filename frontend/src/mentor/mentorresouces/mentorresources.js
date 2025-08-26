import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  Folder, 
  FileText, 
  Video, 
  Upload, 
  X, 
  Download,
  Play,
  Calendar,
  Filter,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

const MentorResourcesDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [availableVideoFolders, setAvailableVideoFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({ type: 'all', status: 'all' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [requestCounts, setRequestCounts] = useState({});
  const [pdfModalUrl, setPdfModalUrl] = useState(null);


  // Authentication - replace with your auth system
  const mentorId = localStorage.getItem('mentorId') || localStorage.getItem('mentor');
  const token = localStorage.getItem('token');
  const API_BASE = 'http://localhost:5000/mentorresources'; // Update with your backend URL

  const [formData, setFormData] = useState({
    requestType: 'item',
    title: '',
    description: '',
    hyperlink: '',
    folderId: '',
    folderTitle: '',
    folderThumbnail: '',
    link: '',
    type: '',
    sourceType: 'url'
  });

  // Clear messages after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch approved folders for PDFs
  const fetchAvailableFolders = async () => {
    if (!mentorId || mentorId.length !== 24) { 
      setAvailableFolders([]); 
      return; 
    }
    try {
      const response = await fetch(`${API_BASE}/approved-folders/${mentorId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAvailableFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      setAvailableFolders([]);
    }
  };

  // Fetch approved video folders for videos
  const fetchAvailableVideoFolders = async () => {
    if (!mentorId || mentorId.length !== 24) { 
      setAvailableVideoFolders([]); 
      return; 
    }
    try {
      const response = await fetch(`${API_BASE}/approved-video-folders/${mentorId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAvailableVideoFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching video folders:', error);
      setAvailableVideoFolders([]);
    }
  };

  // Fetch all mentor's requests
  const fetchRequests = async () => {
    if (!mentorId || mentorId.length !== 24) { 
      setRequests([]); 
      return; 
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/my-requests/${mentorId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests || []);
        setRequestCounts(data.counts || {});
        console.log(data)
          console.log("request",requestCounts)
      } else {
        throw new Error(data.message || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to fetch requests: ' + error.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type based on request type
      if (formData.requestType === 'pdf' && file.type !== 'application/pdf') {
        setError('Please select a PDF file only.');
        return;
      }
      if (formData.requestType === 'video' && formData.sourceType === 'upload' && !file.type.startsWith('video/')) {
        setError('Please select a video file only.');
        return;
      }
      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB.');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset form when request type changes
    if (name === 'requestType') {
      setFormData({
        requestType: value,
        title: '',
        description: '',
        hyperlink: '',
        folderId: '',
        folderTitle: '',
        folderThumbnail: '',
        link: '',
        type: '',
        sourceType: 'url'
      });
      setSelectedFile(null);
      setError('');
    }
    
    // Reset file when source type changes for video
    if (name === 'sourceType') {
      setSelectedFile(null);
    }
  };

  // Validate form data before submission
  const validateForm = () => {
    const { requestType } = formData;
    
    switch (requestType) {
      case 'item':
        if (!formData.title?.trim() || !formData.hyperlink?.trim() || !formData.description?.trim()) {
          setError('Title, hyperlink, and description are required for item requests.');
          return false;
        }
        break;
      case 'folder':
        if (!formData.folderTitle?.trim()) {
          setError('Folder title is required for folder requests.');
          return false;
        }
        break;
      case 'pdf':
        if (!formData.title?.trim() || !formData.folderId || !selectedFile) {
          setError('Title, folder selection, and PDF file are required for PDF requests.');
          return false;
        }
        break;
      case 'videoFolder':
        if (!formData.folderTitle?.trim() || !formData.folderThumbnail?.trim()) {
          setError('Folder title and thumbnail URL are required for video folder requests.');
          return false;
        }
        break;
      case 'video':
        if (!formData.title?.trim() || !formData.description?.trim() || !formData.type || !formData.folderId) {
          setError('Title, description, type, and folder are required for video requests.');
          return false;
        }
        if (formData.sourceType === 'url' && !formData.link?.trim()) {
          setError('Video link is required for URL-based video requests.');
          return false;
        }
        if (formData.sourceType === 'upload' && !selectedFile) {
          setError('Video file is required for upload-based video requests.');
          return false;
        }
        if (availableVideoFolders.length === 0) {
          setError('No approved video folders available. Please create a video folder first.');
          return false;
        }
        break;
      default:
        setError('Invalid request type.');
        return false;
    }
    
    return true;
  };

  // Create new request
  const createRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }

    if (!mentorId || !token) {
      setError('Authentication required. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Add all non-empty form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          formDataToSend.append(key, value);
        }
      });
      
      formDataToSend.append('mentorId', mentorId);
      
      // Add file if present
      if (selectedFile) {
        formDataToSend.append('file', selectedFile);
      }

      const response = await fetch(`${API_BASE}/request`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      
      if (result.success) {
        setSuccess('Request submitted successfully!');
        setShowCreateForm(false);
        setFormData({
          requestType: 'item',
          title: '',
          description: '',
          hyperlink: '',
          folderId: '',
          folderTitle: '',
          folderThumbnail: '',
          link: '',
          type: '',
          sourceType: 'url'
        });
        setSelectedFile(null);
        await fetchRequests();
      } else {
        throw new Error(result.message || 'Request failed');
      }
      
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'An error occurred while submitting the request');
    } finally {
      setLoading(false);
    }
  };

  // Download PDF file
  const downloadPDF = async (requestId, filename) => {
    try {
      const response = await fetch(`${API_BASE}/download/pdf/${requestId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Failed to download file: ' + error.message);
    }
  };

  // Helper functions for file URLs
  const getBackendUrl = () => 'http://localhost:5000'; // Or use config if available

  const getPDFDownloadUrl = (requestId, view = false) =>
    `${getBackendUrl()}/mentorresources/download/pdf/${requestId}${view ? '?view=1' : ''}`;

  const getVideoStreamUrl = (requestId) =>
    `${getBackendUrl()}/mentorresources/stream/video/${requestId}`;

  // Initialize data
  useEffect(() => { 
    fetchRequests(); 
  }, []);
  
  useEffect(() => {
    if (formData.requestType === 'pdf') {
      fetchAvailableFolders();
    }
    if (formData.requestType === 'video') {
      fetchAvailableVideoFolders();
    }
  }, [formData.requestType]);

  // Filter requests
  const filteredRequests = requests.filter(req => {
    return (filters.type === 'all' || req.requestType === filters.type) &&
           (filters.status === 'all' || req.status === filters.status);
  });

  // Get status icon and color
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'approved':
        return { icon: <CheckCircle size={16} />, color: 'text-green-600', bg: 'bg-green-50' };
      case 'rejected':
        return { icon: <XCircle size={16} />, color: 'text-red-600', bg: 'bg-red-50' };
      default:
        return { icon: <Clock size={16} />, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    }
  };

  // Get request type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'item': return <LinkIcon size={16} />;
      case 'folder': return <Folder size={16} />;
      case 'pdf': return <FileText size={16} />;
      case 'videoFolder': return <Video size={16} />;
      case 'video': return <Play size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  // Render form fields based on request type
  const renderFormFields = () => {
    switch (formData.requestType) {
      case 'item':
        return (
          <div className="space-y-4">
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Item Title*" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
            <input 
              name="hyperlink" 
              value={formData.hyperlink} 
              onChange={handleChange} 
              placeholder="Item URL*" 
              type="url"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Description*" 
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
          </div>
        );
      case 'folder':
        return (
          <input 
            name="folderTitle" 
            value={formData.folderTitle} 
            onChange={handleChange} 
            placeholder="Folder Title*" 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required 
          />
        );
      case 'pdf':
        return (
          <div className="space-y-4">
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="PDF Title*" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
            <select 
              name="folderId" 
              value={formData.folderId} 
              onChange={handleChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Folder*</option>
              {availableFolders.map(f => (
                <option key={f._id} value={f._id}>
                  {f.folderTitle} ({f.source === 'request' ? 'Requested' : 'Existing'})
                </option>
              ))}
            </select>
            {availableFolders.length === 0 && (
              <p className="text-orange-600 text-sm bg-orange-50 p-2 rounded">
                No folders available. Create a folder request first.
              </p>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-upload"
                required 
              />
              <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload PDF file*</span>
              </label>
            </div>
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button type="button" onClick={removeFile} className="text-red-500 hover:text-red-700">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        );
      case 'videoFolder':
        return (
          <div className="space-y-4">
            <input 
              name="folderTitle" 
              value={formData.folderTitle} 
              onChange={handleChange} 
              placeholder="Video Folder Title*" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
            <input 
              name="folderThumbnail" 
              value={formData.folderThumbnail} 
              onChange={handleChange} 
              placeholder="Thumbnail URL*" 
              type="url"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
          </div>
        );
      case 'video':
        return (
          <div className="space-y-4">
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Video Title*" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Video Description*" 
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
            <select 
              name="folderId" 
              value={formData.folderId} 
              onChange={handleChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Video Folder*</option>
              {availableVideoFolders.map(f => (
                <option key={f._id} value={f._id}>
                  {f.folderTitle} ({f.source === 'request' ? 'Requested' : 'Existing'})
                </option>
              ))}
            </select>
            {availableVideoFolders.length === 0 && (
              <p className="text-orange-600 text-sm bg-orange-50 p-2 rounded">
                No video folders available. Create a video folder request first and wait for approval.
              </p>
            )}
            <div className="flex gap-4">
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="sourceType" 
                  value="url" 
                  checked={formData.sourceType === 'url'}
                  onChange={handleChange}
                  className="mr-2"
                />
                URL Link
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" 
                  name="sourceType" 
                  value="upload" 
                  checked={formData.sourceType === 'upload'}
                  onChange={handleChange}
                  className="mr-2"
                />
                File Upload
              </label>
            </div>
            {formData.sourceType === 'url' ? (
              <input 
                name="link" 
                value={formData.link} 
                onChange={handleChange} 
                placeholder="Video URL*" 
                type="url"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required 
              />
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                  required 
                />
                <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click to upload video file*</span>
                  <span className="text-xs text-gray-500">Max size: 100MB</span>
                </label>
              </div>
            )}
            {selectedFile && formData.sourceType === 'upload' && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Video size={20} className="text-blue-600" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button type="button" onClick={removeFile} className="text-red-500 hover:text-red-700">
                  <X size={16} />
                </button>
              </div>
            )}
            <select 
              name="type" 
              value={formData.type} 
              onChange={handleChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Video Type*</option>
              <option value="lecture">Lecture</option>
              <option value="tutorial">Tutorial</option>
              <option value="workshop">Workshop</option>
              <option value="demo">Demo</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  // Helper: Get only approved uploaded PDFs/videos
  const myUploadedPDFs = requests.filter(
    req => req.requestType === 'pdf' && req.status === 'approved'
  );
  const myUploadedVideos = requests.filter(
    req => req.requestType === 'video' && req.status === 'approved' && req.sourceType === 'upload'
  );

  // Debug: Log all video requests
  // Remove or comment this out in production
  useEffect(() => {
    const videoReqs = requests.filter(req => req.requestType === 'video');
    console.log('Video requests:', videoReqs);
  }, [requests]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mentor Resource Requests</h1>
          <button 
            onClick={() => setShowCreateForm(true)} 
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus size={20} />
            New Request
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{requestCounts.total || 0}</div>
            <div className="text-sm text-blue-600">Total</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{requestCounts.items || 0}</div>
            <div className="text-sm text-green-600">Items</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{requestCounts.folders || 0}</div>
            <div className="text-sm text-purple-600">Folders</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{requestCounts.pdfs || 0}</div>
            <div className="text-sm text-red-600">PDFs</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{requestCounts.videoFolders || 0}</div>
            <div className="text-sm text-yellow-600">Video Folders</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{requestCounts.videos || requests.filter(r => r.requestType === 'video').length}</div>
            <div className="text-sm text-indigo-600">Videos</div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Create Request Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Request</h2>
          <form onSubmit={createRequest} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
              <select 
                name="requestType" 
                value={formData.requestType} 
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="item">📄 Item Request</option>
                <option value="folder">📁 Folder Request</option>
                <option value="pdf">📑 PDF Upload</option>
                <option value="videoFolder">🎬 Video Folder Request</option>
                <option value="video">🎥 Video Request</option>
              </select>
            </div>
            
            {renderFormFields()}
            
            <div className="flex gap-3 pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowCreateForm(false);
                  setError('');
                  setSuccess('');
                  setSelectedFile(null);
                }}
                disabled={loading}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">My Requests</h2>
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-gray-400" />
            <select 
              value={filters.type} 
              onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Types</option>
              <option value="item">Items</option>
              <option value="folder">Folders</option>
              <option value="pdf">PDFs</option>
              <option value="videoFolder">Video Folders</option>
              <option value="video">Videos</option>
            </select>
            
            <select 
              value={filters.status} 
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Requests Table/List */}
        {!loading && filteredRequests.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No requests found.
          </div>
        )}

        {!loading && filteredRequests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredRequests.map(req => {
                  const status = getStatusDisplay(req.status);
                  return (
                    <tr key={req._id}>
                      <td className="px-4 py-2">{getTypeIcon(req.requestType)}</td>
                      <td className="px-4 py-2">{req.title || req.folderTitle || '-'}</td>
                      <td className={`px-4 py-2 ${status.bg} ${status.color} rounded-lg flex items-center gap-1`}>
                        {status.icon}
                        <span className="capitalize">{req.status}</span>
                      </td>
                      <td className="px-4 py-2">
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-2">
                        {/* Download and View buttons for approved PDFs */}
                        {req.requestType === 'pdf' && req.status === 'approved' && (
                          <div className="flex gap-2">
                            <button
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                              onClick={() => downloadPDF(req._id, req.title)}
                            >
                              <Download size={16} /> Download
                            </button>
                            <button
                              className="flex items-center gap-1 text-green-600 hover:underline"
                              onClick={() => setPdfModalUrl(getPDFDownloadUrl(req._id, true))}
                            >
                              <FileText size={16} /> View
                            </button>
                          </div>
                        )}
                        {/* View button for approved uploaded videos */}
                        {req.requestType === 'video' && req.status === 'approved' && req.sourceType === 'upload' && (
                          <a
                            className="flex items-center gap-1 text-green-600 hover:underline"
                            href={getVideoStreamUrl(req._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Play size={16} /> View Video
                          </a>
                        )}
                        {/* View button for approved video links */}
                        {req.requestType === 'video' && req.status === 'approved' && req.sourceType === 'url' && req.link && (
                          <a
                            className="flex items-center gap-1 text-green-600 hover:underline"
                            href={req.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Play size={16} /> View Video
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* PDF Modal */}
        {pdfModalUrl && (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setPdfModalUrl(null)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 16,
                maxWidth: '90vw',
                maxHeight: '90vh',
                boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
                position: 'relative'
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer'
                }}
                onClick={() => setPdfModalUrl(null)}
                aria-label="Close"
              >
                <X size={24} />
              </button>
              <iframe
                src={pdfModalUrl}
                title="View PDF"
                width="800px"
                height="600px"
                style={{ border: '1px solid #ddd', borderRadius: 8 }}
              />
            </div>
          </div>
        )}

        {/* My Uploaded PDFs */}
        {myUploadedPDFs.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold mb-2">My Uploaded PDFs</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {myUploadedPDFs.map(pdf => (
                    <tr key={pdf._id}>
                      <td className="px-4 py-2">{pdf.title}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                          onClick={() => downloadPDF(pdf._id, pdf.title)}
                        >
                          <Download size={16} /> Download
                        </button>
                        <button
                          className="flex items-center gap-1 text-green-600 hover:underline"
                          onClick={() => setPdfModalUrl(getPDFDownloadUrl(pdf._id, true))}
                        >
                          <FileText size={16} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* My Uploaded Videos */}
        {myUploadedVideos.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold mb-2">My Uploaded Videos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {myUploadedVideos.map(video => (
                    <tr key={video._id}>
                      <td className="px-4 py-2">{video.title}</td>
                      <td className="px-4 py-2">
                        <a
                          className="flex items-center gap-1 text-green-600 hover:underline"
                          href={getVideoStreamUrl(video._id)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Play size={16} /> View Video
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorResourcesDashboard;