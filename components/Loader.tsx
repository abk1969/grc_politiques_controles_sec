import React from 'react';

interface LoaderProps {
  text: string;
}

export const Loader: React.FC<LoaderProps> = ({ text }) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <p className="text-blue-600 font-semibold">{text}</p>
  </div>
);
