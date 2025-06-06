import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Upload, Calendar as CalendarIcon, Home } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isAfter } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useInstitution } from '../../../contexts/InstitutionContext';
import Swal from "sweetalert2"
const EventCalendar = () => {
    // Add state for tracking file upload
    const [uploading, setUploading] = useState(false);
    const [fileKey, setFileKey] = useState(Date.now());
    const { userData } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showExcelModal, setShowExcelModal] = useState(false);
    const currentEvents = events.filter(e =>
        isSameDay(parseISO(e.date), selectedDate) &&
        e.academicYear === school?.academicYear
    );
    const { school } = useInstitution();

    const nextEvent = events
        .filter(e => isAfter(parseISO(e.date), selectedDate))
        .sort((a, b) => parseISO(a.date) - parseISO(b.date))[0];

    useEffect(() => {
        try {
            if (school.events && school.events.length) {
                setEvents(school.events?.filter(e => e.academicYear === school.academicYear) || []);
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "error",
                text: error.message
            })
        } finally {
            setLoading(false)
        }
    }, [school.Code, userData]);

    const handleTodayClick = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const handleAddEvent = async (e) => {
        e.preventDefault();
        if (!newEvent.title || !newEvent.date) return;

        try {
            const academicYear = school?.academicYear;
            const eventDate = format(new Date(newEvent.date), 'yyyy-MM-dd');

            const existingIndex = events.findIndex(e =>
                e.date === eventDate && e.academicYear === academicYear
            );

            const updatedEvents = [...events];
            if (existingIndex > -1) {
                updatedEvents[existingIndex] = {
                    ...updatedEvents[existingIndex],
                    title: newEvent.title
                };
            } else {
                updatedEvents.push({
                    date: eventDate,
                    title: newEvent.title,
                    type: 'holiday',
                    academicYear
                });
            }

            await updateDoc(doc(db, 'schools', school.id), {
                events: updatedEvents.sort((a, b) => parseISO(a.date) - parseISO(b.date))
            });
            setEvents(updatedEvents);
            setNewEvent({ title: '', date: '' });
            setShowAddForm(false);
        } catch (err) {
            setError('Failed to save event');
        }
    };


    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const reader = new FileReader();
            const fileData = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file);
            });

            const data = new Uint8Array(fileData);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            // Validate columns
            if (!jsonData[0] || !('Date' in jsonData[0]) || !('Event' in jsonData[0])) {
                throw new Error('Invalid file format - required columns: Date, Event');
            }

            const academicYear = school?.academicYear;
            const importedEvents = jsonData.map((row, index) => {
                try {
                    let parsedDate;

                    // Handle different date formats
                    if (typeof row.Date === 'number') {
                        // Excel serial number date
                        const dateData = XLSX.SSF.parse_date_code(row.Date);
                        parsedDate = new Date(Date.UTC(dateData.y, dateData.m - 1, dateData.d));
                    } else if (row.Date instanceof Date) {
                        // JS Date object from Excel
                        parsedDate = new Date(Date.UTC(
                            row.Date.getFullYear(),
                            row.Date.getMonth(),
                            row.Date.getDate()
                        ));
                    } else {
                        // String date (DD-MM-YYYY)
                        const dateParts = String(row.Date).split('-');
                        if (dateParts.length !== 3) throw new Error('Invalid date format');

                        const [day, month, year] = dateParts.map(Number);
                        if (isNaN(day) || isNaN(month) || isNaN(year)) {
                            throw new Error('Invalid date components');
                        }

                        parsedDate = new Date(Date.UTC(year, month - 1, day));
                    }

                    if (isNaN(parsedDate.getTime())) {
                        throw new Error('Invalid date value');
                    }

                    return {
                        date: format(parsedDate, 'yyyy-MM-dd'),
                        title: row.Event,
                        type: 'holiday',
                        academicYear
                    };
                } catch (err) {
                    throw new Error(`Row ${index + 2}: ${err.message} - Value: "${row.Date}"`);
                }
            });

            const updatedEvents = [
                ...events.filter(e => e.academicYear !== academicYear),
                ...importedEvents
            ].sort((a, b) => parseISO(a.date) - parseISO(b.date));

            await updateDoc(doc(db, 'schools', school.id), { events: updatedEvents });
            setEvents(updatedEvents);
            setFileKey(Date.now());

        } catch (err) {
            setError(err.message.includes('Row') ? err.message : 'Invalid file. Ensure dates are in DD-MM-YYYY format');
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // number of blank slots before the 1st of the month
    const startWeekday = monthStart.getDay(); // 0–6
    const blankDays = Array(startWeekday).fill(null);

    if (loading) return (
        <div className="p-6 bg-white rounded-2xl shadow-lg animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-7 gap-2 mb-4">
                {[...Array(42)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl shadow-sm border border-gray-100">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleTodayClick}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 tooltip"
                        data-tooltip="Jump to Today"
                    >
                        <Home size={18} />
                    </button>
                    <span className="text-lg font-semibold text-gray-800">
                        {format(currentDate, 'MMM yyyy')}
                    </span>
                    {isSameMonth(currentDate, new Date()) && (
                        <span className="text-sm text-gray-500">
                            ({format(new Date(), 'd')})
                        </span>
                    )}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Compact Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
                {['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs text-gray-500 font-medium">
                        {day}
                    </div>
                ))}
                {blankDays.map((_, i) => (
                    <div key={"blank-" + i} className="h-8" />
                ))}
                {daysInMonth.map(date => {
                    const hasEvents = events.some(e =>
                        isSameDay(parseISO(e.date), date) &&
                        e.academicYear === school?.academicYear
                    );

                    return (
                        <button
                            key={date.toString()}
                            onClick={() => setSelectedDate(date)}
                            className={`h-8 rounded text-sm flex items-center justify-center relative
                            ${isSameDay(date, selectedDate) ? 'bg-purple-600 text-white' :
                                    isSameMonth(date, currentDate) ? 'hover:bg-gray-100' : 'text-gray-400'}
                            ${isSameDay(date, new Date()) && 'font-bold'}`}
                        >
                            {format(date, 'd')}
                            {hasEvents && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-400"></div>
                            )}
                        </button>
                    );
                })}
            </div>


            {/* Event Cards */}
            <div className="flex gap-3">
                <EventCard
                    date={format(selectedDate, 'd MMM')}
                    title={currentEvents[0]?.title || 'No Event'}
                    color={isAfter(selectedDate, new Date()) ? 'blue' : 'amber'}
                />
                {nextEvent && (
                    <EventCard
                        date={format(parseISO(nextEvent.date), 'd MMM')}
                        title={nextEvent.title}
                        color="blue"
                    />
                )}
            </div>



            <div className="mt-4 border-t pt-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-1 text-sm text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Plus size={16} /> Add Event
                    </button>

                    <button
                        onClick={() => setShowExcelModal(true)}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Upload size={16} />
                        Bulk Upload
                    </button>
                </div>
                {/* Add Event Form */}
                <div className="mt-4 border-t pt-4">
                    <AnimatePresence>
                        {showAddForm && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleAddEvent}
                                className="mt-3 flex gap-2"
                            >
                                <input
                                    type="date"
                                    className="flex-1 text-sm px-2 py-1 border rounded"
                                    value={newEvent.date}
                                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Event name"
                                    className="flex-1 text-sm px-2 py-1 border rounded"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                />
                                <button
                                    type="submit"
                                    className="px-2 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                    Save
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
                {/* Excel Template Modal */}
                <AnimatePresence>
                    {showExcelModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                            onClick={() => setShowExcelModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: -20 }}
                                className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl border border-purple-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center pb-4 mb-4 border-b border-purple-100">
                                    <h2 className="text-xl font-bold text-purple-700">
                                        Event Upload Template
                                    </h2>
                                    <button
                                        onClick={() => setShowExcelModal(false)}
                                        className="text-gray-500 hover:text-purple-600 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">
                                        <span className="font-medium text-purple-600">Note:</span>
                                        {' '}File must contain these columns (date format: DD-MM-YYYY)
                                    </div>

                                    <div className="overflow-x-auto rounded-lg border border-purple-100">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-purple-50">
                                                <tr>
                                                    {['Date*', 'Event*'].map((header) => (
                                                        <th
                                                            key={header}
                                                            className="px-4 py-3 text-left font-medium text-purple-700 border-r border-purple-100 last:border-r-0"
                                                        >
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-purple-100">
                                                <tr>
                                                    <td className="px-4 py-3 font-mono text-purple-600">2024-03-15</td>
                                                    <td className="px-4 py-3 text-gray-700">Sports Day</td>
                                                </tr>
                                                <tr className="bg-purple-50/50">
                                                    <td className="px-4 py-3 font-mono text-purple-600">2024-03-20</td>
                                                    <td className="px-4 py-3 text-gray-700">Parent-Teacher Meeting</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <motion.label
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="block w-full px-4 py-3 bg-purple-600 text-white rounded-lg text-center cursor-pointer hover:bg-purple-700 transition-colors relative"
                                    >
                                        {uploading ? (
                                            <>
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="animate-spin">🌀</span>
                                                    Uploading...
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                Choose Excel File
                                                <input
                                                    type="file"
                                                    accept=".xls,.xlsx"
                                                    onChange={(e) => {
                                                        handleFileUpload(e);
                                                        setShowExcelModal(false);
                                                    }}
                                                    className="hidden"
                                                />
                                            </>
                                        )}
                                    </motion.label>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const EventCard = ({ date, title, color }) => (
    <div className={`flex-1 p-3 rounded-lg border-l-4 ${color === 'amber' ?
        'border-l-amber-400 bg-amber-50' :
        'border-l-blue-400 bg-blue-50'
        }`}>
        <div className="flex items-center justify-between">
            <div>
                <div className="text-xs text-gray-600 mb-1">{date}</div>
                <div className="text-sm font-medium text-gray-800">{title}</div>
            </div>
            <CalendarIcon size={16} className="text-gray-500" />
        </div>
    </div>
);


export default EventCalendar;