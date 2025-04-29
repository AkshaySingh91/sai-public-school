// src/components/DayHourLineChart.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../config/firebase';
import { Calendar, Clock, ChevronDown } from 'lucide-react';

const BIN_DEFS = [
  { label: '7–10 AM', start: 7, end: 10 },
  { label: '10–12 PM', start: 10, end: 12 },
  { label: '12–2 PM', start: 12, end: 14 },
  { label: '2–4 PM', start: 14, end: 16 },
  { label: '4–6 PM', start: 16, end: 18 },
  { label: '6–7 PM', start: 18, end: 19 },
];

function formatDateISO(date) {
  return date.toISOString().slice(0, 10);
}

function formatLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DayHourLineChart() {
  const { userData } = useAuth();
  const chartRef = useRef();
  const [last7Days] = useState(() => 
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return new Date(d.setHours(0,0,0,0));
    })
  );
  const [selectedDate, setSelectedDate] = useState(last7Days[0]);
  const [bins, setBins] = useState(BIN_DEFS);
  const [maxValue, setMaxValue] = useState(1);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, bin: null });

  const calculateXPosition = useCallback((hour) => {
    const totalHours = 12; // 7 AM to 7 PM (12 hours)
    const startHour = 7;
    return ((hour - startHour) / totalHours) * 100;
  }, []);

  const fetchData = useCallback(async (date) => {
    if (!userData?.schoolCode) return;

    const schoolSnap = await getDocs(query(
      collection(db, 'schools'),
      where('Code', '==', userData.schoolCode)
    ));
    if (schoolSnap.empty) return;
    
    const schoolData = schoolSnap.docs[0].data();
    const dateStr = formatDateISO(date);
    const newBins = BIN_DEFS.map(bin => ({ ...bin, total: 0, txs: [] }));

    const studSnap = await getDocs(query(
      collection(db, 'students'),
      where('schoolCode', '==', userData.schoolCode),
      where('academicYear', '==', schoolData.academicYear)
    ));

    studSnap.docs.forEach(doc => {
      (doc.data().transactions || []).forEach(tx => {
        if (!tx.timestamp?.startsWith(dateStr)) return;
        const txHour = new Date(tx.timestamp).getHours();
        const bin = newBins.find(b => txHour >= b.start && txHour < b.end);
        if (bin) {
          bin.total += Number(tx.amount) || 0;
          bin.txs.push(tx);
        }
      });
    });

    const max = Math.max(...newBins.map(b => b.total), 1);
    setBins(newBins);
    setMaxValue(max);
  }, [userData]);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  const handleMouseMove = (e) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const xPos = ((e.clientX - rect.left) / rect.width) * 100;
    
    const hoveredBin = bins.reduce((closest, bin) => {
      const binStart = calculateXPosition(bin.start);
      const binEnd = calculateXPosition(bin.end);
      return (xPos >= binStart && xPos <= binEnd) ? bin : closest;
    }, null);

    if (hoveredBin) {
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        bin: hoveredBin
      });
    } else {
      setTooltip(t => ({ ...t, visible: false }));
    }
  };

  const pathData = bins.reduce((acc, bin, i) => {
    const x1 = calculateXPosition(bin.start);
    const x2 = calculateXPosition(bin.end);
    const y = 100 - (bin.total / maxValue) * 100;
    
    if (i === 0) acc += `M ${x1},100 L ${x1},${y} `;
    acc += `L ${x2},${y} `;
    if (i === bins.length - 1) acc += `L 100,100 Z`;
    
    return acc;
  }, '');

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="text-purple-600" size={20} />
          Hourly Collection Pattern
        </h2>
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-600" size={18} />
          <select
            value={formatDateISO(selectedDate)}
            onChange={e => setSelectedDate(new Date(e.target.value))}
            className="appearance-none pl-3 pr-8 py-2 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {last7Days.map(d => (
              <option key={formatDateISO(d)} value={formatDateISO(d)}>
                {formatLabel(d)}
              </option>
            ))}
          </select>
          <ChevronDown className="text-gray-500 -ml-6" size={16} />
        </div>
      </div>

      <div 
        className="relative h-64"
        ref={chartRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
      >
        {/* Chart Grid */}
        <div className="absolute inset-0 flex flex-col justify-between pb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border-t border-gray-100"></div>
          ))}
        </div>

        {/* Chart Area */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d={pathData}
            className="fill-purple-100 opacity-50"
          />
          <path
            d={pathData.replace(/Z$/, '')}
            className="stroke-purple-600 stroke-2 fill-none"
            strokeLinejoin="round"
          />
        </svg>

        {/* X-Axis Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-sm text-gray-500 px-1">
          {BIN_DEFS.map((bin, i) => (
            <span key={i} className="text-center" style={{ width: `${calculateXPosition(bin.end) - calculateXPosition(bin.start)}%` }}>
              {bin.label}
            </span>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip.visible && tooltip.bin && (
          <div 
            className="absolute bg-white border border-gray-200 rounded-lg p-3 shadow-xl text-sm"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y + 10,
              pointerEvents: 'none'
            }}
          >
            <div className="font-semibold text-purple-600 mb-1">
              {tooltip.bin.label}
            </div>
            <div className="text-gray-600">
              Total: ₹{tooltip.bin.total.toLocaleString()}
            </div>
            {tooltip.bin.txs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                {tooltip.bin.txs.slice(0, 3).map((tx, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-500">
                    <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    <span className="truncate">{tx.feeType}</span>
                    <span>₹{tx.amount}</span>
                  </div>
                ))}
                {tooltip.bin.txs.length > 3 && (
                  <div className="text-gray-400 mt-1">
                    + {tooltip.bin.txs.length - 3} more transactions
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}