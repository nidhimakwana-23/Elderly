import React from 'react';
import { useAuth } from '../context/AuthContext';

export const MyProfile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-4xl font-extrabold text-center mb-4">My Profile</h1>
      <div className="grid grid-cols-2 gap-4 text-lg">
        <div className="font-medium text-gray-600">User ID:</div>
        <div className="text-gray-800">{user?.id ?? 'N/A'}</div>
        <div className="font-medium text-gray-600">Email:</div>
        <div className="text-gray-800">{user?.email ?? 'N/A'}</div>
        <div className="font-medium text-gray-600">Role:</div>
        <div className="text-gray-800">{user?.role ?? 'N/A'}</div>
        {/* Add additional fields as needed */}
      </div>
    </div>
  );
};
