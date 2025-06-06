import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { Calendar, Clock, ChevronDown, Info } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import { useInstitution } from '../../../contexts/InstitutionContext';

const BIN_DEFS = [
  { label: '7–10 AM', start: 7, end: 10 },
  { label: '10–12 PM', start: 10, end: 12 },
  { label: '12–2 PM', start: 12, end: 14 },
  { label: '2–4 PM', start: 14, end: 16 },
  { label: '4–6 PM', start: 16, end: 18 },
  { label: '6–7 PM', start: 18, end: 19 },
];

export default function DayHourLineChart() {
  const { userData } = useAuth();
  const { school } = useInstitution();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [last7Days, setLast7Days] = useState([]);

  // Generate last 7 days including today
  useEffect(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        ...Object.fromEntries(BIN_DEFS.map(b => [b.label, 0]))
      };
    }).reverse();

    setLast7Days(days);
    setSelectedDate(days[days.length - 1].date);
  }, []);

  const fetchData = useCallback(async () => {
    if (!school?.Code || !selectedDate) return;

    try {
      const schoolQuery = query(
        collection(db, 'schools'),
        where('Code', '==', school.Code)
      );
      const schoolSnap = await getDocs(schoolQuery);

      if (schoolSnap.empty) return;

      const studentsQuery = query(
        collection(db, 'students'),
        where('schoolCode', '==', school.Code),
        where('academicYear', '==', schoolSnap.docs[0].data().academicYear)
      );

      const studentsSnap = await getDocs(studentsQuery);
      const daysData = last7Days.map(day => ({ ...day }));
      studentsSnap.forEach(studentDoc => {
        const student = studentDoc.data();
        (student.transactions || []).forEach(tx => {
          // check if today trans is completed than we consider it as transaction 
          if (!isNaN(Number(tx.receiptId)) || (isNaN(Number(tx.receiptId)) && tx.status !== "completed")) {
            const txDate = new Date(tx.timestamp);
            const txDay = txDate.toISOString().split('T')[0];
            const txHour = txDate.getHours();

            const dayEntry = daysData.find(d => d.date === txDay);
            if (!dayEntry) return;

            const bin = BIN_DEFS.find(b => txHour >= b.start && txHour < b.end);
            if (bin) {
              dayEntry[bin.label] += Number(tx.amount) || 0;
            }
          }
        });
      });

      setChartData(daysData);
    } catch (error) {
      console.error('Data fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, [userData, school, last7Days, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSelectedDayData = () => {
    const selectedDay = chartData.find(d => d.date === selectedDate);
    if (!selectedDay) return [];

    return BIN_DEFS.map(bin => ({
      time: bin.label,
      amount: selectedDay[bin.label]
    }));
  };

  const totalCollection = getSelectedDayData().reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-1/2"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 py-8 rounded-xl ">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="text-purple-600" size={20} />
          Daily Collection Pattern
        </h2>

        <div className="flex items-center gap-2 w-full sm:w-48">
          <Calendar className="text-gray-600" size={18} />
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full pl-3 pr-8 py-2 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
          >
            {last7Days.map(day => (
              <option key={day.date} value={day.date}>
                {day.label}
              </option>
            ))}
          </select>
          <ChevronDown className="text-gray-500 -ml-6 pointer-events-none" size={16} />
        </div>
      </div>

      {totalCollection === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No collections recorded for this day
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={getSelectedDayData()}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                interval={0}
              />
              <YAxis
                tickFormatter={value => `₹${value}`}
                domain={[0, 'auto']}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                      <div className="text-sm font-semibold text-gray-700">
                        {payload[0].payload.time}
                      </div>
                      <div className="text-lg font-medium text-purple-600">
                        ₹{payload[0].value.toLocaleString()}
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#7C3AED"
                strokeWidth={2}
                dot={{ r: 4, fill: '#7C3AED' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          {/* tell them that we dont show cheque pending amount */}
          <div className="flex items-center gap-2  text-sm text-gray-500">
            <Info size={16} className="text-purple-600" />
            <span>Only completed anount will shown</span>
          </div>
        </div>
      )}
    </div>
  );
}