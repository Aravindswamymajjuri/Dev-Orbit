import React, { useState, useEffect } from 'react';
import config from '../../config';

// Icons (use your own or remove)
import { Link as LinkIcon, Folder, FileText, Video, Upload, X } from 'lucide-react';

const MentorDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [availableVideoFolders, setAvailableVideoFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({ type: 'all', status: 'all' });
  const [selectedFile, setSelectedFile] = useState(null);

  // Replace with actual authentication
  const mentorId = localStorage.getItem('mentor');
  const token = localStorage.getItem('token');
  const API_BASE = `${config.backendUrl}/mentorresources`;

  const [formData, setFormData] = useState({
    requestType: 'item',
    title: '',
    description: '',
    hyperlink: '',
    folderId: '',
    folderTitle: '',
    folderThumbnail: '',
    link: '',
    type: ''
  });

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
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection (PDF)
  const handleFileSelect = (e) => setSelectedFile(e.target.files[0] || null);
  const removeFile = () => setSelectedFile(null);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
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
        type: ''
      });
      setSelectedFile(null);
    }
  };

  // Validate form data before submission
  const validateForm = () => {
    const { requestType } = formData;
    
    switch (requestType) {
      case 'item':
        if (!formData.title || !formData.hyperlink || !formData.description) {
          setError('Title, hyperlink, and description are required for item requests.');
          return false;
        }
        break;
      case 'folder':
        if (!formData.folderTitle) {
          setError('Folder title is required for folder requests.');
          return false;
        }
        break;
      case 'pdf':
        if (!formData.title || !formData.folderId || !selectedFile) {
          setError('Title, folder selection, and PDF file are required for PDF requests.');
          return false;
        }
        break;
      case 'videoFolder':
        if (!formData.folderTitle || !formData.folderThumbnail) {
          setError('Folder title and thumbnail URL are required for video folder requests.');
          return false;
        }
        break;
      case 'video':
        if (!formData.title || !formData.description || !formData.link || !formData.type || !formData.folderId) {
          setError('All fields are required for video requests.');
          return false;
        }
        // Additional validation for video folder selection
        if (availableVideoFolders.length === 0) {
          setError('No approved video folders available. Please create a video folder first.');
          return false;
        }
        const selectedFolder = availableVideoFolders.find(f => f._id === formData.folderId);
        if (!selectedFolder) {
          setError('Please select a valid video folder from the list.');
          return false;
        }
        break;
      default:
        setError('Invalid request type.');
        return false;
    }
    
    return true;
  };

  // Create new request with better error handling
  const createRequest = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    // Check authentication
    if (!mentorId || !token) {
      setError('Authentication required. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      // Build FormData for file upload (PDF)
      const formDataToSend = new FormData();
      
      // Add all form fields that have values
      Object.entries(formData).forEach(([key, val]) => {
        if (val) formDataToSend.append(key, val);
      });
      
      formDataToSend.append('mentorId', mentorId);
      formDataToSend.append('status', 'pending');
      formDataToSend.append('requestDate', new Date().toISOString());
      
      if (formData.requestType === 'pdf' && selectedFile) {
        formDataToSend.append('pdf', selectedFile);
      }

      // Debug: Log what we're sending
      console.log('Sending request:', {
        requestType: formData.requestType,
        mentorId,
        formData: Object.fromEntries(formDataToSend.entries())
      });

      const response = await fetch(`${API_BASE}/request`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type when using FormData - browser will set it automatically with boundary
        },
        body: formDataToSend
      });

      // Better error handling for non-JSON responses
      let result;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // Handle HTML error pages
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        // Better error message handling
        if (result && result.message) {
          throw new Error(result.message);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      if (result.success) {
        // Reset form on success
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
          type: ''
        });
        setSelectedFile(null);
        
        // Show success message
        alert('Request submitted successfully!');
        
        // Refresh requests list
        await fetchRequests();
      } else {
        throw new Error(result.message || 'Request failed');
      }
      
    } catch (err) {
      console.error('Submit error:', err);
      
      // More specific error messages
      if (err.message.includes('video folder')) {
        setError('The selected video folder is not available. Please create a video folder request first and wait for approval, or select a different folder.');
      } else if (err.message.includes('folder')) {
        setError('The selected folder is not available. Please create a folder request first and wait for approval, or select a different folder.');
      } else {
        setError(err.message || 'An error occurred while submitting the request');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when form type changes
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

  // Filtering
  const filteredRequests = requests.filter(req => {
    return (filters.type === 'all' || req.requestType === filters.type) &&
           (filters.status === 'all' || req.status === filters.status);
  });

  // Render dynamic form fields
  const renderFormFields = () => {
    switch (formData.requestType) {
      case 'item':
        return (
          <>
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Title" 
              required 
            />
            <input 
              name="hyperlink" 
              value={formData.hyperlink} 
              onChange={handleChange} 
              placeholder="Hyperlink" 
              type="url"
              required 
            />
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Description" 
              required 
            />
          </>
        );
      case 'folder':
        return (
          <input 
            name="folderTitle" 
            value={formData.folderTitle} 
            onChange={handleChange} 
            placeholder="Folder Title" 
            required 
          />
        );
      case 'pdf':
        return (
          <>
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="PDF Title" 
              required 
            />
            <select name="folderId" value={formData.folderId} onChange={handleChange} required>
              <option value="">Select Folder</option>
              {availableFolders.map(f => (
                <option key={f._id} value={f._id}>{f.folderTitle}</option>
              ))}
            </select>
            {availableFolders.length === 0 && (
              <p style={{ color: 'orange', fontSize: '14px' }}>
                No folders available. Create a folder request first.
              </p>
            )}
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handleFileSelect} 
              required 
            />
            {selectedFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{selectedFile.name}</span>
                <button type="button" onClick={removeFile}>
                  <X size={16} />
                </button>
              </div>
            )}
          </>
        );
      case 'videoFolder':
        return (
          <>
            <input 
              name="folderTitle" 
              value={formData.folderTitle} 
              onChange={handleChange} 
              placeholder="Video Folder Title" 
              required 
            />
            <input 
              name="folderThumbnail" 
              value={formData.folderThumbnail} 
              onChange={handleChange} 
              placeholder="Thumbnail URL" 
              type="url"
              required 
            />
          </>
        );
      case 'video':
        return (
          <>
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Video Title" 
              required 
            />
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Description" 
              required 
            />
            <select name="folderId" value={formData.folderId} onChange={handleChange} required>
              <option value="">Select Video Folder</option>
              {availableVideoFolders.map(f => (
                <option key={f._id} value={f._id}>{f.folderTitle}</option>
              ))}
            </select>
            {availableVideoFolders.length === 0 && (
              <p style={{ color: 'orange', fontSize: '14px' }}>
                No video folders available. Create a video folder request first and wait for approval.
              </p>
            )}
            <input 
              name="link" 
              value={formData.link} 
              onChange={handleChange} 
              placeholder="Video Link" 
              type="url"
              required 
            />
            <select name="type" value={formData.type} onChange={handleChange} required>
              <option value="">Select Type</option>
              <option value="lecture">Lecture</option>
              <option value="tutorial">Tutorial</option>
            </select>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h2>Mentor Resource Requests</h2>
      
      <button onClick={() => setShowCreateForm(true)} disabled={loading}>
        + New Request
      </button>
      
      {showCreateForm && (
        <form onSubmit={createRequest} encType="multipart/form-data">
          <select name="requestType" value={formData.requestType} onChange={handleChange}>
            <option value="item">Item</option>
            <option value="folder">Folder</option>
            <option value="pdf">PDF</option>
            <option value="videoFolder">Video Folder</option>
            <option value="video">Video</option>
          </select>
          
          {renderFormFields()}
          
          {error && (
            <div style={{ color: 'red', margin: '10px 0', padding: '10px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '4px' }}>
              {error}
            </div>
          )}
          
          <div style={{ marginTop: '15px' }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setShowCreateForm(false);
                setError('');
                setSelectedFile(null);
              }}
              disabled={loading}
              style={{ marginLeft: '10px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div>
        <h3>Requests</h3>
        <div style={{ marginBottom: '15px' }}>
          <select 
            value={filters.type} 
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            style={{ marginRight: '10px' }}
          >
            <option value="all">All Types</option>
            <option value="item">Item</option>
            <option value="folder">Folder</option>
            <option value="pdf">PDF</option>
            <option value="videoFolder">Video Folder</option>
            <option value="video">Video</option>
          </select>
          
          <select 
            value={filters.status} 
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        
        {loading && <div>Loading...</div>}
        
        <ul>
          {filteredRequests.map(req => (
            <li key={req._id}>
              <strong>{req.requestType.toUpperCase()}</strong> - {req.title || req.folderTitle} ({req.status})
              <br />
              <small>Requested: {new Date(req.requestDate).toLocaleDateString()}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MentorDashboard;