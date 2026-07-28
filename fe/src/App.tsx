import { useState } from 'react';
import { MedicineManagement } from './components/MedicineManagement';
import { MedicationTracker } from './pages/MedicationTracker';

function App() {
  const [activeTab, setActiveTab] = useState<'management' | 'tracker'>('tracker');

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b px-4 py-3 flex gap-4">
        <button 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'tracker' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('tracker')}
        >
          Medication Tracker
        </button>
        <button 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'management' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('management')}
        >
          Medicine Management
        </button>
      </nav>
      <div className="flex-1">
        {activeTab === 'tracker' ? <MedicationTracker /> : <MedicineManagement />}
      </div>
    </div>
  )
}

export default App
