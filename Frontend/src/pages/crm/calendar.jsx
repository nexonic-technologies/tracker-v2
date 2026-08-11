import React, { useState, useEffect } from 'react';
import axiosInstance from '@api/axiosInstance';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  Video
} from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import toast from 'react-hot-toast';

dayjs.extend(isBetween);

const MarketingCalendar = () => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [view, setView] = useState('month'); // month, week, day
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [clients, setClients] = useState([]);

  // Fetch meetings and clients
  const fetchData = async () => {
    try {
      setLoading(true);
      const [meetingsRes, clientsRes] = await Promise.all([
        axiosInstance.post('/populate/read/crm_meetings', { limit: 1000 }),
        axiosInstance.post('/populate/read/clients', { limit: 1000, select: 'name _id' })
      ]);
      setMeetings(meetingsRes.data?.data || []);
      setClients(clientsRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to fetch calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrev = () => {
    setCurrentDate(currentDate.subtract(1, view));
  };

  const handleNext = () => {
    setCurrentDate(currentDate.add(1, view));
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  const renderMonthView = () => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDay = startOfMonth.startOf('week');
    const endDay = endOfMonth.endOf('week');

    const calendarGrid = [];
    let day = startDay;

    while (day.isBefore(endDay)) {
      calendarGrid.push(day);
      day = day.add(1, 'day');
    }

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="flex flex-col h-full bg-surface border border-hairline rounded-tracker-lg overflow-hidden">
        {/* Weekdays Header */}
        <div className="grid grid-cols-7 border-b border-hairline bg-surface-1">
          {weekdays.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1">
          {calendarGrid.map((date, idx) => {
            const isCurrentMonth = date.isSame(currentDate, 'month');
            const isToday = date.isSame(dayjs(), 'day');
            const dayMeetings = meetings.filter(m => dayjs(m.scheduledTime).isSame(date, 'day'));

            return (
              <div
                key={idx}
                className={`min-h-[120px] p-2 border-r border-b border-hairline transition-colors hover:bg-surface-1/50 cursor-pointer ${!isCurrentMonth ? 'bg-canvas' : ''}`}
                onClick={() => {
                  setSelectedMeeting({ scheduledTime: date.hour(10).minute(0).toDate() });
                  setIsModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand text-white' : 'text-ink'}`}>
                    {date.date()}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayMeetings.slice(0, 3).map(m => (
                    <div
                      key={m._id}
                      className="px-1.5 py-0.5 text-[10px] bg-module-project-light text-module-project border-l-2 border-module-project rounded-sm truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMeeting(m);
                        setIsModalOpen(true);
                      }}
                    >
                      {dayjs(m.scheduledTime).format('HH:mm')} {m.title}
                    </div>
                  ))}
                  {dayMeetings.length > 3 && (
                    <div className="text-[10px] text-ink-subtle pl-1 font-medium">
                      + {dayMeetings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4" data-module="project">
      {/* Calendar Header */}
      <div className="flex items-center justify-between bg-surface p-4 rounded-tracker-lg border border-hairline shadow-card">
        <div className="flex items-center gap-4">
          <div className="lmx-icon-tile">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">{currentDate.format('MMMM YYYY')}</h2>
            <p className="text-xs text-ink-muted">Marketing & Sales Schedule</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-1 rounded-tracker-md p-1 border border-hairline">
            <button onClick={handlePrev} className="p-1.5 hover:bg-surface-2 rounded-tracker-sm transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleToday} className="px-3 py-1 text-xs font-semibold hover:bg-surface-2 rounded-tracker-sm transition-colors border-x border-hairline mx-1">
              Today
            </button>
            <button onClick={handleNext} className="p-1.5 hover:bg-surface-2 rounded-tracker-sm transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center bg-surface-1 rounded-tracker-md p-1 border border-hairline ml-2">
            {['month', 'week', 'day'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-semibold capitalize rounded-tracker-sm transition-colors ${view === v ? 'bg-surface text-ink shadow-sm' : 'text-ink-subtle hover:text-ink'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSelectedMeeting({ scheduledTime: new Date() });
              setIsModalOpen(true);
            }}
            className="tracker-btn-brand flex items-center gap-2"
          >
            <Plus size={16} />
            <span>New Meeting</span>
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          view === 'month' ? renderMonthView() : (
            <div className="flex items-center justify-center h-64 bg-surface border border-hairline rounded-tracker-lg">
              <div className="text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-ink-tertiary mb-2" />
                <p className="text-ink-muted">{view.charAt(0).toUpperCase() + view.slice(1)} view is coming soon</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Meeting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/90 backdrop-blur-md">
          <div className="bg-surface w-full max-w-2xl rounded-tracker-xl shadow-overlay overflow-hidden border border-hairline animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-ink">
                    {selectedMeeting?._id ? 'Meeting Outcome' : 'Schedule Meeting'}
                  </h3>
                  <p className="text-sm text-ink-muted mt-1">Record the results and next steps for this engagement.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="lmx-icon-tile hover:bg-canvas transition-colors">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Client & Title */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Client</label>
                    <div className="flex items-center gap-3 p-3 bg-canvas rounded-tracker-md border border-hairline">
                      <User size={16} className="text-brand" />
                      <span className="text-sm font-medium text-ink">
                        {selectedMeeting?.clientId?.name || 'Select Client...'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Meeting Title</label>
                    <input
                      type="text"
                      defaultValue={selectedMeeting?.title}
                      className="lmx-input"
                      placeholder="e.g. Initial Requirement Discussion"
                    />
                  </div>
                </div>

                {/* Notes & Outcome */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Meeting Notes</label>
                  <textarea
                    className="lmx-input min-h-[120px] resize-none"
                    placeholder="What was discussed? Any specific requirements or objections?"
                    defaultValue={selectedMeeting?.notes}
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Outcome Status</label>
                    <select className="lmx-input" defaultValue={selectedMeeting?.status || 'Scheduled'}>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Started">In Progress</option>
                      <option value="Completed">Completed / Success</option>
                      <option value="Follow-up">Follow-up Needed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Milestone Update</label>
                    <select className="lmx-input">
                      <option value="">No Milestone Change</option>
                      <option value="Requirement Gathered">Requirement Gathered</option>
                      <option value="Proposal Sent">Proposal Sent</option>
                      <option value="Negotation">Negotiation</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-hairline">
                <button onClick={() => setIsModalOpen(false)} className="tracker-btn-secondary px-6">Discard</button>
                <button className="tracker-btn-brand px-8 flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  <span>Save Outcome</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingCalendar;
