import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PersonaSwitcherBar from './PersonaSwitcherBar';
import BackendHealthBadge from './BackendHealthBadge';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-row overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-surface-container-lowest">
        {/* Top Sticky Bar with Persona Switcher */}
        <PersonaSwitcherBar />

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto bg-surface-container-lowest px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Health alert banner shown if offline */}
            <BackendHealthBadge compact={false} className="hidden" />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

