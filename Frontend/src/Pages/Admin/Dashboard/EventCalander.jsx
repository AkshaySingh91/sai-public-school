import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Upload,
    Calendar as CalendarIcon,
    X,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isBefore } from 'date-fns';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

const EventCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([
        { id: 1, date: '2023-08-01', title: 'Sports Day', color: 'sky', type: 'sports' },
        { id: 2, date: '2023-08-15', title: 'Independence Day', color: 'orange', type: 'holiday' },
        { id: 3, date: '2023-08-20', title: 'Science Fair', color: 'emerald', type: 'academic' },
    ]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: format(new Date(), 'yyyy-MM-dd') });
    const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
    const [error, setError] = useState('');

    // Color mappings
    const colorMap = {
        sky: 'bg-sky-500',
        orange: 'bg-orange-500',
        emerald: 'bg-emerald-500',
        violet: 'bg-violet-500',
        rose: 'bg-rose-500'
    };

    const typeIcons = {
        sports: '🏆',
        holiday: '🎉',
        academic: '📚',
        meeting: '📅',
        other: '🌟'
    };

    // Calendar navigation
    const nextPeriod = () => setCurrentDate(addMonths(currentDate, viewMode === 'month' ? 1 : 1));
    const prevPeriod = () => setCurrentDate(subMonths(currentDate, viewMode === 'month' ? 1 : 1));

    // Date calculations
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Event helpers
    const getDateEvents = (date) => events.filter(e => isSameDay(parseISO(e.date), date));
    const hasEvents = (date) => getDateEvents(date).length > 0;

    // File upload handling
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                const importedEvents = jsonData.map((row, i) => ({
                    id: Date.now() + i,
                    date: row.date,
                    title: row.event,
                    color: Object.keys(colorMap)[i % 5],
                    type: row.type || 'other'
                }));

                setEvents(prev => [...prev, ...importedEvents]);
                setError('');
            } catch (err) {
                setError('Invalid file format. Please use the provided template.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Add new event
    const validateEvent = () => {
        if (!newEvent.title.trim()) return 'Event title is required';
        if (isBefore(parseISO(newEvent.date), new Date())) return 'Date cannot be in the past';
        return '';
    };

    const handleAddEvent = () => {
        const validationError = validateEvent();
        if (validationError) return setError(validationError);

        setEvents(prev => [...prev, {
            id: Date.now(),
            ...newEvent,
            color: Object.keys(colorMap)[Math.floor(Math.random() * 5)],
            type: 'other'
        }]);
        setNewEvent({ title: '', date: format(new Date(), 'yyyy-MM-dd') });
        setError('');
        setShowAddEvent(false);
    };

    // Mobile swipe handlers
    const [touchStart, setTouchStart] = useState(0);
    const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
    const handleTouchEnd = (e) => {
        const touchEnd = e.changedTouches[0].clientX;
        if (touchStart - touchEnd > 50) nextPeriod();
        if (touchStart - touchEnd < -50) prevPeriod();
    };

    return (
        <div className="max-w-md mx-auto p-4 bg-white rounded-2xl shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{format(currentDate, 'MMMM yyyy')}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CalendarIcon size={16} />
                        <span>{events.length} events scheduled</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode(prev => prev === 'month' ? 'week' : 'month')}
                        className="p-2 bg-gray-100 rounded-lg text-sm font-medium"
                    >
                        {viewMode === 'month' ? 'Week' : 'Month'} View
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div
                className="grid grid-cols-7 gap-px mb-4 bg-gray-100 rounded-xl overflow-hidden shadow-sm"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-white p-2 text-center text-sm font-medium text-gray-500">
                        {day}
                    </div>
                ))}
                {daysInMonth.map((date, index) => {
                    const isCurrentMonth = isSameMonth(date, currentDate);
                    const dayEvents = getDateEvents(date);

                    return (
                        <motion.div
                            key={date.toISOString()}
                            className={`relative h-14 p-1 bg-white cursor-pointer hover:bg-gray-50 transition-colors
                                ${isCurrentMonth ? '' : 'text-gray-300'}`}
                            onClick={() => setSelectedDate(date)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.01 }}
                        >
                            <div className={`w-6 h-6 flex items-center justify-center text-sm rounded-full
                                ${isSameDay(date, new Date()) ? 'bg-blue-500 text-white' : ''}`}
                            >
                                {format(date, 'd')}
                            </div>

                            {dayEvents.length > 0 && (
                                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                                    {dayEvents.slice(0, 2).map(event => (
                                        <div
                                            key={event.id}
                                            className={`w-2 h-2 rounded-full ${colorMap[event.color]}`}
                                        />
                                    ))}
                                    {dayEvents.length > 2 && (
                                        <span className="text-xs text-gray-400">+{dayEvents.length - 2}</span>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Controls */}
            <div className="flex justify-between mb-6">
                <button
                    onClick={prevPeriod}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddEvent(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        <Plus size={16} />
                        Add Event
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <Upload size={16} />
                        Import
                        <input
                            type="file"
                            accept=".xlsx"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>
                <button
                    onClick={nextPeriod}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Event List */}
            <div className="space-y-3">
                {events.filter(e => isSameMonth(parseISO(e.date), currentDate)).map(event => (
                    <motion.div
                        key={event.id}
                        className="p-4 bg-gray-50 rounded-xl flex items-center gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className={`w-3 h-3 rounded-full ${colorMap[event.color]}`} />
                        <div>
                            <h3 className="font-medium">{event.title}</h3>
                            <p className="text-sm text-gray-500">
                                {format(parseISO(event.date), 'MMM do, yyyy')}
                                <span className="ml-2">{typeIcons[event.type]}</span>
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Add Event Modal */}
            <AnimatePresence>
                {showAddEvent && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl p-6 w-full max-w-md"
                            initial={{ y: 50 }}
                            animate={{ y: 0 }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">New Event</h2>
                                <button
                                    onClick={() => setShowAddEvent(false)}
                                    className="p-1 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Event title"
                                    className="w-full p-3 border rounded-lg"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                />
                                <input
                                    type="date"
                                    className="w-full p-3 border rounded-lg"
                                    value={newEvent.date}
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                />
                                <button
                                    onClick={handleAddEvent}
                                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} />
                                    Create Event
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EventCalendar;