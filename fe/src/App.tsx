import { useState } from 'react';
import { MedicineManagement } from './components/MedicineManagement';
import { MedicationTracker } from './pages/MedicationTracker';
import { HealthCheckManagement } from './components/HealthCheckManagement';
import { AiChat } from './pages/AiChat';

type Tab = 'tracker' | 'management' | 'health' | 'ai';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tracker');

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'tracker',    label: 'Medication Tracker',   emoji: '💊' },
    { id: 'management', label: 'Medicine Management',  emoji: '📋' },
    { id: 'health',     label: 'Health Checks',        emoji: '❤️' },
    { id: 'ai',         label: 'AI Assistant',         emoji: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b px-4 py-3 flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${
              activeTab === tab.id
                ? tab.id === 'ai'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="flex-1">
        {activeTab === 'tracker'    && <MedicationTracker />}
        {activeTab === 'management' && <MedicineManagement />}
        {activeTab === 'health'     && <HealthCheckManagement />}
        {activeTab === 'ai'         && <AiChat />}
      </div>
    </div>
  )
}

export default App

