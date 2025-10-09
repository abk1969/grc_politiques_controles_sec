import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  percentage?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, percentage }) => (
  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 transition-transform hover:translate-y-[-2px]">
    <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
    <p className="text-3xl font-bold text-gray-800">{value}</p>
    {percentage !== undefined && (
      <p className="text-sm text-green-600 font-semibold mt-1">{percentage.toFixed(1)}% mappés</p>
    )}
  </div>
);
