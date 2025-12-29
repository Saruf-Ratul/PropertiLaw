import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  case: {
    id: string;
    caseNumber: string;
    property: {
      name: string;
    };
  };
}

export default function Calendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'overdue'>('upcoming');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events/upcoming', {
        params: { days: filter === 'today' ? 1 : 30 }
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (eventId: string) => {
    try {
      await api.patch(`/events/${eventId}/complete`);
      fetchEvents();
    } catch (error) {
      console.error('Failed to mark event complete:', error);
    }
  };

  const getEventDate = (event: Event) => {
    return event.dueDate || event.eventDate;
  };

  const filteredEvents = events.filter(event => {
    if (event.isCompleted && filter !== 'all') return false;
    
    const eventDate = getEventDate(event);
    if (!eventDate) return false;

    const date = parseISO(eventDate);
    
    switch (filter) {
      case 'today':
        return isToday(date);
      case 'overdue':
        return date < new Date() && !event.isCompleted;
      case 'upcoming':
        return date >= new Date();
      default:
        return true;
    }
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Calendar & Tasks</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {(['all', 'today', 'upcoming', 'overdue'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No events found
          </div>
        ) : (
          filteredEvents.map((event) => {
            const eventDate = getEventDate(event);
            const isOverdue = eventDate && parseISO(eventDate) < new Date() && !event.isCompleted;

            return (
              <div
                key={event.id}
                className={`bg-white shadow rounded-lg p-6 ${
                  isOverdue ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={event.isCompleted}
                        onChange={() => markComplete(event.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <h3
                          className={`text-lg font-medium ${
                            event.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatDate(eventDate)}</span>
                          <Link
                            to={`/cases/${event.case.id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            {event.case.caseNumber}
                          </Link>
                          <span>{event.case.property.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {isOverdue && (
                    <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded">
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

