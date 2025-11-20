import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import DigitalTwin from './pages/DigitalTwin';
import AdvancedAnalytics from './pages/AdvancedAnalytics';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-[var(--color-bg)] text-white overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Ambient Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />

        <Header />

        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'digital-twin' && <DigitalTwin />}
          {activeTab === 'analytics' && <AdvancedAnalytics />}
          {activeTab === 'settings' && <div className="text-center mt-20 text-2xl text-slate-400">Settings (Coming Soon)</div>}
        </main>
      </div>
    </div>
  );
}

export default App;
