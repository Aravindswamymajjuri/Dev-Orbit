import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  User,
  AlertCircle,
  CheckCircle,
  Eye,
  FileText
} from 'lucide-react';
import config from '../../config'

const StudentEventsView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.backendUrl}/mentorevents/student/my-events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
        if (data.message) {
          showMessage('info', data.message);
        }
      } else {
        showMessage('error', data.message || 'Failed to fetch events');
      }
    } catch (error) {
      showMessage('error', 'Error fetching events');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'ongoing': return 'text-green-600 bg-green-100 border-green-200';
      case 'completed': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'cancelled': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'workshop': return 'text-purple-600 bg-purple-100';
      case 'meeting': return 'text-blue-600 bg-blue-100';
      case 'seminar': return 'text-green-600 bg-green-100';
      case 'competition': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isEventUpcoming = (eventDate) => {
    return new Date(eventDate) > new Date();
  };

  const isEventToday = (eventDate) => {
    const today = new Date();
    const event = new Date(eventDate);
    return today.toDateString() === event.toDateString();
  };

  const openEventModal = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Events</h1>
          <p className="text-gray-600">Events assigned to your teams</p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : message.type === 'info'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {message.text}
          </div>
        )}

        {/* Events Display */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">No Events Available</h3>
            <p className="text-gray-500">You don't have any events assigned to your teams yet.</p>
          </div>
        ) : (
          <>
            {/* Upcoming Events Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="text-indigo-600" size={24} />
                Upcoming Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events
                  .filter(event => isEventUpcoming(event.eventDate) && event.status !== 'cancelled')
                  .map(event => (
                    <div 
                      key={event._id} 
                      className={`bg-white rounded-xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                        isEventToday(event.eventDate) ? 'border-yellow-300 ring-2 ring-yellow-200' : 'border-gray-200'
                      }`}
                    >
                      <div className="p-6">
                        {isEventToday(event.eventDate) && (
                          <div className="mb-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full inline-block">
                            Today's Event!
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-semibold text-gray-800 line-clamp-2">{event.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-3">{event.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={16} className="text-indigo-500" />
                            {formatDate(event.eventDate)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock size={16} className="text-indigo-500" />
                            {formatTime(event.eventTime)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin size={16} className="text-indigo-500" />
                            {event.location}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User size={16} className="text-indigo-500" />
                            By {event.mentor?.name}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getEventTypeColor(event.eventType)}`}>
                            {event.eventType}
                          </span>
                          <button
                            onClick={() => openEventModal(event)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {events.filter(event => isEventUpcoming(event.eventDate) && event.status !== 'cancelled').length === 0 && (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                  <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No upcoming events</p>
                </div>
              )}
            </div>

            {/* Past Events Section */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Clock className="text-gray-600" size={24} />
                Past Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events
                  .filter(event => !isEventUpcoming(event.eventDate) || event.status === 'completed')
                  .map(event => (
                    <div key={event._id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold text-gray-700 line-clamp-2">{event.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{event.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar size={14} />
                            {formatDate(event.eventDate)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <User size={14} />
                            By {event.mentor?.name}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getEventTypeColor(event.eventType)}`}>
                            {event.eventType}
                          </span>
                          <button
                            onClick={() => openEventModal(event)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {events.filter(event => !isEventUpcoming(event.eventDate) || event.status === 'completed').length === 0 && (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                  <Clock size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No past events</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Event Details Modal */}
        {showEventModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedEvent.title}</h2>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedEvent.status)}`}>
                        {selectedEvent.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getEventTypeColor(selectedEvent.eventType)}`}>
                        {selectedEvent.eventType}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ml-4"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FileText size={18} />
                      Description
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{selectedEvent.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="text-indigo-600" size={20} />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Date</p>
                          <p className="text-gray-600">{formatDate(selectedEvent.eventDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="text-indigo-600" size={20} />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Time</p>
                          <p className="text-gray-600">{formatTime(selectedEvent.eventTime)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="text-indigo-600" size={20} />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Location</p>
                          <p className="text-gray-600">{selectedEvent.location}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <User className="text-indigo-600" size={20} />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Mentor</p>
                          <p className="text-gray-600">{selectedEvent.mentor?.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedEvent.maxParticipants && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Users className="text-blue-600" size={18} />
                        <span className="font-medium text-blue-800">Max Participants: {selectedEvent.maxParticipants}</span>
                      </div>
                    </div>
                  )}

                  {selectedEvent.requirements && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Requirements</h3>
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-gray-700">{selectedEvent.requirements}</p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.assignedTeams?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Assigned Teams</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedEvent.assignedTeams.map(team => (
                          <div key={team._id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="font-medium text-gray-800">{team.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentEventsView;