// src/Pages/Admin/Students/FeeVisualizations.jsx
import React from 'react';

export const PieChart = ({ title, paid, total, color }) => {
  const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * percentage) / 100;
  const isDisabled = total <= 0 || paid >= total;
  const displayColor = isDisabled ? '#e5e7eb' : color;

  return (
    <div className="w-1/2 bg-white p-4 rounded-lg shadow border border-gray-200 transition-all hover:shadow-md">
      <h4 className="text-md font-semibold mb-2 text-gray-700">{title}</h4>
      <div className="relative h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r={radius} fill="none" 
                 stroke="#f3f4f6" strokeWidth="8" />
          <circle cx="50" cy="50" r={radius} fill="none" 
                 stroke={displayColor} strokeWidth="8"
                 strokeDasharray={circumference}
                 strokeDashoffset={offset}
                 transform="rotate(-90 50 50)" />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
              className={`text-sm font-bold ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {total > 0 ? `${percentage}%` : 'N/A'}
          </text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div className="text-center">
          <div className="text-gray-500">Paid</div>
          <div className={`font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
            ₹{paid?.toLocaleString() || 0}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Pending</div>
          <div className={`font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
            ₹{Math.max((total || 0) - (paid || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeeBar = ({ label, paid, total }) => {
  if (total <= 0) return null;

  const paidPercent = (paid / total) * 100 || 0;
  const remainingPercent = 100 - paidPercent;
  const isPaidComplete = paid >= total;

  return (
    <div className="space-y-2 group">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-600">
          ₹{paid?.toLocaleString() || 0} / ₹{total?.toLocaleString() || 0}
        </span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden transition-all">
        <div
          className="absolute h-full bg-gradient-to-r from-purple-500 to-purple-300 transition-all duration-500"
          style={{ width: `${isPaidComplete ? 100 : paidPercent}%` }}
        />
        <div
          className="absolute h-full bg-gray-200 transition-all duration-500"
          style={{ width: `${isPaidComplete ? 0 : remainingPercent}%`, left: `${paidPercent}%` }}
        />
      </div>
    </div>
  );
};