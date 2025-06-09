import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Eye, Filter, Search, FileText, Folder, Video, Link, AlertCircle, RefreshCw, X, ExternalLink } from 'lucide-react';

const AdminApprovalDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: 'all', status: 'pending' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // API Base URL
  const API_BASE = 'http://127.0.0.1:5000/admin-approvals';

  // Determine request type based on available fields
  const determineRequestType = (request) => {
    if (request.requestType) return request.requestType;
    
    if (request.hyperlink !== undefined) return 'item';
    if (request.folderTitle !== undefined && request.folderThumbnail !== undefined) return 'videoFolder';
    if (request.folderTitle !== undefined) return 'folder';
    if (request.link !== undefined) return 'video';
    if (request.pdf !== undefined) return 'pdf';
    
    return 'unknown';
  };

  // Fetch requests from API
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filter.type !== 'all') params.append('type', filter.type);
      if (filter.status !== 'all') params.append('status', filter.status);

      const endpoint = filter.status === 'pending' ? `${API_BASE}/pending` : `${API_BASE}/all`;
      const url = `${endpoint}${params.toString() ? `?${params}` : ''}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      
      const requestsWithType = Array.isArray(data) ? data.map(request => {
        const requestType = determineRequestType(request);
        return { ...request, requestType };
      }) : [];

      setRequests(requestsWithType);
      calculateStats(requestsWithType);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError(`Failed to fetch requests: ${error.message}`);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (requestsData) => {
    const newStats = requestsData.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { pending: 0, approved: 0, rejected: 0, total: 0 });
    setStats(newStats);
  };

  // Handle approve/reject actions
  const handleAction = async (request, action) => {
    try {
      setProcessing(true);
      setError('');
      
      if (action === 'reject' && !rejectionReason.trim()) {
        setError('Rejection reason is required');
        return;
      }
      
      const requestType = determineRequestType(request);
      if (!requestType || requestType === 'unknown') {
        setError('Cannot determine request type');
        return;
      }
      
      const endpoint = `${API_BASE}/${action}/${requestType}/${request._id}`;
      const body = {
        ...(actionNotes.trim() && { adminNotes: actionNotes.trim() }),
        ...(action === 'reject' && rejectionReason.trim() && { rejectionReason: rejectionReason.trim() })
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      await fetchRequests();
      setShowModal(false);
      setActionNotes('');
      setRejectionReason('');
      setSelectedRequest(null);
      setActionType('');
      setError('');
      alert(`Request ${action}ed successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      setError(`Failed to ${action} request: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Get request details
  const getRequestDetails = async (request) => {
    try {
      setError('');
      const requestType = determineRequestType(request);
      if (!requestType || requestType === 'unknown') {
        setError('Cannot determine request type');
        return;
      }
      
      const response = await fetch(`${API_BASE}/${requestType}/${request._id}`);
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || 'Failed to fetch request details');
      }
      
      const details = await response.json();
      setSelectedRequest({ ...details, requestType });
      setActionType('');
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching request details:', error);
      setError(`Failed to fetch request details: ${error.message}`);
    }
  };

  // Filter requests based on search term
  const filteredRequests = requests.filter(request => {
    const searchLower = searchTerm.toLowerCase();
    const title = request.title || request.folderTitle || '';
    const mentorName = request.mentorId?.name || '';
    const mentorEmail = request.mentorId?.email || '';
    
    return (
      title.toLowerCase().includes(searchLower) ||
      mentorName.toLowerCase().includes(searchLower) ||
      mentorEmail.toLowerCase().includes(searchLower) ||
      request.requestType.toLowerCase().includes(searchLower)
    );
  });

  // Get icon for request type
  const getRequestIcon = (type) => {
    const icons = {
      item: <Link className="w-4 h-4" />,
      folder: <Folder className="w-4 h-4" />,
      pdf: <FileText className="w-4 h-4" />,
      video: <Video className="w-4 h-4" />,
      videoFolder: <Video className="w-4 h-4" />,
      unknown: <AlertCircle className="w-4 h-4" />
    };
    return icons[type] || <FileText className="w-4 h-4" />;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="w-3 h-3" /> },
      approved: { bg: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { bg: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3 h-3" /> }
    };
    
    const { bg, icon } = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${bg}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get display title for request
  const getDisplayTitle = (request) => {
    return request.title || request.folderTitle || 'Untitled';
  };

  // Render request details modal content
  const renderRequestDetails = () => {
    if (!selectedRequest) return null;

    const { requestType } = selectedRequest;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {getRequestIcon(requestType)}
          <h3 className="text-lg font-semibold">
            {requestType === 'videoFolder' ? 'Video Folder Request' : 
             requestType.charAt(0).toUpperCase() + requestType.slice(1) + ' Request'}
          </h3>
          {getStatusBadge(selectedRequest.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <p className="text-sm text-gray-900">{getDisplayTitle(selectedRequest)}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
            <p className="text-sm text-gray-900">{formatDate(selectedRequest.requestDate)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mentor Name</label>
            <p className="text-sm text-gray-900">{selectedRequest.mentorId?.name || 'Unknown'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mentor Email</label>
            <p className="text-sm text-gray-900">{selectedRequest.mentorId?.email || 'No email'}</p>
          </div>
        </div>

        {/* Request-specific fields */}
        {requestType === 'item' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-sm text-gray-900">{selectedRequest.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hyperlink</label>
              <a href={selectedRequest.hyperlink} target="_blank" rel="noopener noreferrer" 
                 className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                {selectedRequest.hyperlink}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {requestType === 'video' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <p className="text-sm text-gray-900">{selectedRequest.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Video Link</label>
              <a href={selectedRequest.link} target="_blank" rel="noopener noreferrer" 
                 className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                {selectedRequest.link}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <p className="text-sm text-gray-900 capitalize">{selectedRequest.type}</p>
            </div>
          </div>
        )}

        {requestType === 'videoFolder' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
            <p className="text-sm text-gray-900">{selectedRequest.folderThumbnail}</p>
          </div>
        )}

        {selectedRequest.rejectionReason && (
          <div>
            <label className="block text-sm font-medium text-red-700 mb-1">Rejection Reason</label>
            <p className="text-sm text-red-900 bg-red-50 p-2 rounded">{selectedRequest.rejectionReason}</p>
          </div>
        )}

        {selectedRequest.adminNotes && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedRequest.adminNotes}</p>
          </div>
        )}

        {selectedRequest.approvalDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
            <p className="text-sm text-gray-900">{formatDate(selectedRequest.approvalDate)}</p>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  useEffect(() => {
    if (filter.status === 'pending') {
      const interval = setInterval(fetchRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [filter.status]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Approval Dashboard</h1>
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[
            { label: 'Total Requests', value: stats.total, icon: FileText, color: 'text-blue-500' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-500' },
            { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-500' },
            { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-500' }
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color.replace('text-', 'text-').replace('-500', '-600')}`}>
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter.type}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="item">Items</option>
                <option value="folder">Folders</option>
                <option value="pdf">PDFs</option>
                <option value="video">Videos</option>
                <option value="videoFolder">Video Folders</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading requests...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {error ? 'Failed to load requests' : 'No requests found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Type', 'Title', 'Mentor', 'Status', 'Request Date', 'Actions'].map((header) => (
                      <th key={header} className="text-left py-3 px-4 font-medium text-gray-900">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getRequestIcon(request.requestType)}
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {request.requestType === 'videoFolder' ? 'Video Folder' : request.requestType}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 truncate">
                            {getDisplayTitle(request)}
                          </p>
                          {request.description && (
                            <p className="text-sm text-gray-500 truncate">{request.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{request.mentorId?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{request.mentorId?.email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(request.requestDate)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => getRequestDetails(request)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType('approve');
                                  setShowModal(true);
                                }}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType('reject');
                                  setShowModal(true);
                                }}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {actionType ? `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Request` : 'Request Details'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setActionType('');
                    setActionNotes('');
                    setRejectionReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {!actionType ? (
                  renderRequestDetails()
                ) : (
                  <div className="space-y-6">
                    {renderRequestDetails()}
                    
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium mb-4">
                        {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
                      </h3>
                      
                      {actionType === 'reject' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rejection Reason *
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Please provide a reason for rejection..."
                            required
                          />
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Admin Notes (Optional)
                        </label>
                        <textarea
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Add any additional notes..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setActionType('');
                    setActionNotes('');
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                {actionType && selectedRequest.status === 'pending' && (
                  <button
                    onClick={() => handleAction(selectedRequest, actionType)}
                    disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                    className={`px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${
                      actionType === 'approve' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {processing ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Request`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApprovalDashboard;