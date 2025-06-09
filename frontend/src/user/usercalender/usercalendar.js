import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoIosArrowBack, IoIosArrowForward, IoIosClose } from 'react-icons/io';
import './usercalendar.css'; // Ensure you import your CSS
import config from '../../config';
import LeaderboardComponent from '../../components/leaderboard/leaderboard';

const CalendarUser = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [event, setEvent] = useState({ title: '', description: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 426);
  const [viewMode, setViewMode] = useState('month'); // 'month', 'year', or 'years'
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Get user role from localStorage
    const storedRole = localStorage.getItem('userRole');
    setUserRole(storedRole || 'all');

    const fetchEvents = async () => {
      try {
        // Create authorization header if needed
        const token = localStorage.getItem('token'); // Assuming you store auth token
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await axios.get(`${config.backendUrl}/api/events`, {
          headers
        });

        // Filter events based on user role on the frontend as well
        const filteredEvents = response.data.filter(event => {
          if (!storedRole) return event.recipients === 'all';
          
          if (storedRole === 'student') {
            return event.recipients === 'all' || event.recipients === 'student';
          } else if (storedRole === 'mentor') {
            return event.recipients === 'all' || event.recipients === 'mentor';
          } else if (storedRole === 'admin') {
            return event.recipients === 'all' || event.recipients === 'admin';
          } else {
            return event.recipients === 'all';
          }
        });

        const fetchedEvents = filteredEvents.reduce((acc, event) => {
          const eventDate = new Date(event.date).toLocaleDateString('en-GB');
          acc[eventDate] = {
            title: event.title,
            description: event.description,
            meeting: event.meeting || '',
            recipients: event.recipients
          };
          return acc;
        }, {});

        setEvents(fetchedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        setErrorMessage('Failed to fetch events. Please try again later.');
      }
    };

    fetchEvents();

    // Add resize listener to detect mobile view
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 426);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClose = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  const handleDateClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const formattedDate = date.toLocaleDateString('en-GB');

    if (events[formattedDate]) {
      setSelectedDate(date);
      setEvent(events[formattedDate]);
      setShowModal(true);
    } else {
      setSelectedDate(null); // Ensure selectedDate is cleared for non-event days
      setEvent({ title: '', description: '' });
      setShowModal(false); // Ensure modal is not shown for non-event days
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handlePrevYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
  };

  const handlePrevYears = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 20, currentDate.getMonth(), 1));
  };

  const handleNextYears = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 20, currentDate.getMonth(), 1));
  };

  // Navigate between views
  const handleHeaderClick = () => {
    if (viewMode === 'month') {
      setViewMode('years'); // Show years range directly when clicking on the header from month view
    } else if (viewMode === 'year') {
      setViewMode('years'); // From year view to years view
    } else {
      setViewMode('month'); // From years view back to month view
    }
  };

  // Handle year selection in years view
  const handleYearSelect = (year) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    setViewMode('year'); // Show months of the selected year
  };

  // Handle month selection in year view
  const handleMonthSelect = (month) => {
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
    setViewMode('month'); // Switch back to month view after selecting a month
  };

  const handleDelete = async () => {
    if (selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString('en-GB');

      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        await axios.delete(`${config.backendUrl}/api/events/${formattedDate}`, {
          headers
        });
        const updatedEvents = { ...events };
        delete updatedEvents[formattedDate];
        setEvents(updatedEvents);
        handleClose();
      } catch (error) {
        console.error('Error deleting event:', error);
        setErrorMessage('Failed to delete the event. Please try again later.');
      }
    }
  };

  const renderDays = () => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1).getDay() - 1; // Monday as the first day
    const totalDays = daysInMonth(year, month);

    for (let i = 0; i < (firstDayOfMonth < 0 ? 6 : firstDayOfMonth); i++) {
      days.push(<div key={`empty-${i}`} className="usercld-day empty"></div>);
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const formattedDate = date.toLocaleDateString('en-GB');
      const eventData = events[formattedDate];
      // If you support multiple events per day, eventData should be an array
      // For now, if it's an object, count as 1 if exists
      const notificationCount = eventData
        ? (Array.isArray(eventData) ? eventData.length : 1)
        : 0;
      const hasEvent = notificationCount > 0;
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

      days.push(
        <div
          key={day}
          className={`usercld-day ${hasEvent ? 'usercld-has-event' : ''} ${
            selectedDate && selectedDate.getDate() === day ? 'usercld-selected' : ''
          } ${isToday ? 'usercld-current-day' : ''}`}
          onClick={() => handleDateClick(day)}
          style={{ position: 'relative' }}
        >
          {day}
          {/* Notification badge at the top-right of the day */}
          {notificationCount > 1 && (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 6,
                background: '#e11d48',
                color: 'white',
                borderRadius: '50%',
                minWidth: 18,
                height: 18,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                border: '1.5px solid #fff',
                zIndex: 2,
                padding: '0 5px'
              }}
              className="usercld-notification-badge"
            >
              {notificationCount}
            </span>
          )}
        </div>
      );
    }

    return days;
  };

  const renderMonths = () => {
    const months = [];
    const monthNames = [
      'January', 'February', 'March', 'April',
      'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'
    ];
    
    // Check if any month has events
    const hasEventInMonth = (month) => {
      const year = currentDate.getFullYear();
      const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInCurrentMonth; day++) {
        const date = new Date(year, month, day);
        const formattedDate = date.toLocaleDateString('en-GB');
        if (events[formattedDate]) {
          return true;
        }
      }
      return false;
    };

    // Today's month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    for (let i = 0; i < 12; i++) {
      const hasEvent = hasEventInMonth(i);
      const isCurrentMonth = i === currentMonth && currentDate.getFullYear() === currentYear;
      
      months.push(
        <div
          key={i}
          className={`usercld-month ${hasEvent ? 'usercld-has-event' : ''} ${
            isCurrentMonth ? 'usercld-current-month' : ''
          }`}
          onClick={() => handleMonthSelect(i)}
        >
          {monthNames[i]}
        </div>
      );
    }

    return months;
  };

  const renderYears = () => {
    const years = [];
    const currentYear = currentDate.getFullYear();
    const startYear = currentYear - 15;
    const endYear = currentYear + 15;
    const thisYear = new Date().getFullYear();
    
    // Check if any month in the year has events
    const hasEventInYear = (year) => {
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const formattedDate = date.toLocaleDateString('en-GB');
          if (events[formattedDate]) {
            return true;
          }
        }
      }
      return false;
    };
    
    for (let year = startYear; year <= endYear; year++) {
      const hasEvent = hasEventInYear(year);
      const isCurrentYear = year === thisYear;
      
      years.push(
        <div
          key={year}
          className={`usercld-year ${hasEvent ? 'usercld-has-event' : ''} ${
            isCurrentYear ? 'usercld-current-year' : ''
          }`}
          onClick={() => handleYearSelect(year)}
        >
          {year}
        </div>
      );
    }
    
    return years;
  };

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  return (
    <div className='usercld-calendar-leader'>
      <div className='usercld-wrapper'>
        <div className="usercld-container">
          {/* Display current user role for debugging
          {userRole && (
            <div className="usercld-role-indicator" style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              Viewing as: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </div>
          )} */}
          
          <div className="usercld-header">
            <button 
              onClick={
                viewMode === 'month' 
                  ? handlePrevMonth 
                  : viewMode === 'year' 
                    ? handlePrevYear 
                    : handlePrevYears
              } 
              className="usercld-button"
            >
              <IoIosArrowBack />
            </button>
            <h2 
              className='usercld-h2' 
              onClick={handleHeaderClick} 
              style={{ cursor: 'pointer' }}
            >
              {viewMode === 'month' ? (
                <>
                  {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
                </>
              ) : viewMode === 'year' ? (
                <>{currentDate.getFullYear()}</>
              ) : (
                <>Years {currentDate.getFullYear() - 10} - {currentDate.getFullYear() + 10}</>
              )}
            </h2>
            <button 
              onClick={
                viewMode === 'month' 
                  ? handleNextMonth 
                  : viewMode === 'year' 
                    ? handleNextYear 
                    : handleNextYears
              } 
              className="usercld-button"
            >
              <IoIosArrowForward />
            </button>
          </div>

          {viewMode === 'month' ? (
            // Month view
            <div className="usercld-grid">
              <div className="usercld-day-name">MON</div>
              <div className="usercld-day-name">TUE</div>
              <div className="usercld-day-name">WED</div>
              <div className="usercld-day-name">THU</div>
              <div className="usercld-day-name">FRI</div>
              <div className="usercld-day-name">SAT</div>
              <div className="usercld-day-name">SUN</div>
              {renderDays()}
            </div>
          ) : viewMode === 'year' ? (
            // Year view with months
            <div className="usercld-year-grid">
              {renderMonths()}
            </div>
          ) : (
            // Years view with a range of years
            <div className="usercld-years-grid">
              {renderYears()}
            </div>
          )}

          {showModal && (
            <div className="usercld-modal" onClick={handleClose}>
              <div className="usercld-modal-content" onClick={(e) => e.stopPropagation()}>
                {!isMobile && (
                  <button 
                    onClick={handleClose} 
                    className="usercld-close-button-top"
                  >
                    close
                  </button>
                )}
                <h3 className="usercld-modal-title">
                  Event for {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <h4 className="usercld-modal-subtitle">{event.title}</h4>
                <p className="usercld-modal-description">{event.description}</p>
                
                {/* Show meeting info if available */}
                {event.meeting && (
                  <div className="usercld-modal-meeting">
                    <strong>Meeting: </strong><a href={event.meeting}>{event.meeting}</a>
                  </div>
                )}
                
                {/* Show event recipients for admins */}
                {userRole === 'admin' && event.recipients && (
                  <div className="usercld-modal-recipients" style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginTop: '10px' 
                  }}>
                    Target: {event.recipients}
                  </div>
                )}
              
                
                {isMobile && (
                  <button onClick={handleClose} className="usercld-close-button-bottom">
                    Close
                  </button>
                )}
              </div>
            </div>
          )}

          {errorMessage && <div className="usercld-error-message">{errorMessage}</div>}
        </div>
      </div>
      <LeaderboardComponent />
    </div>
  );
};

export default CalendarUser;