import { useAuth } from '../context/AuthContext';

export const MyProfile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 space-y-6 bg-white rounded-2xl shadow-lg border border-slate-100">
      <h1 className="text-4xl font-extrabold text-center mb-4 text-slate-800">My Profile</h1>
      <div className="grid grid-cols-2 gap-4 text-lg">
        <div className="font-medium text-gray-600">User ID:</div>
        <div className="text-gray-800 break-all">{user?.id ?? 'N/A'}</div>
        <div className="font-medium text-gray-600">Email:</div>
        <div className="text-gray-800">{user?.email ?? 'N/A'}</div>
        <div className="font-medium text-gray-600">Role:</div>
        <div className="text-gray-800 capitalize">{user?.role ?? 'N/A'}</div>
        {/* Add additional fields as needed */}
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <button
          onClick={logout}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow transition-colors flex items-center gap-2"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );
};

