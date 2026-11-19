import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import PersonaSwitcherBar from './PersonaSwitcherBar';
import BackendHealthBadge from './BackendHealthBadge';
import WelcomeNoteModal from '../common/WelcomeNoteModal';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat' || location.pathname === '/';

  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(() => {
    return !sessionStorage.getItem('has_seen_welcome_note');
  });

  const handleCloseWelcomeModal = () => {
    sessionStorage.setItem('has_seen_welcome_note', 'true');
    setIsWelcomeModalOpen(false);
  };

  const handleOpenWelcomeModal = () => {
    setIsWelcomeModalOpen(true);
  };

  return (
    <div className="h-screen bg-white flex flex-row overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-white">
        {/* Top Sticky Bar with Persona Switcher & Project Note */}
        <PersonaSwitcherBar onOpenWelcomeNote={handleOpenWelcomeModal} />

        {/* Dynamic Workspace Container */}
        {isChatPage ? (
          <main className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden px-4 sm:px-6 py-3">
            <Outlet />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto bg-white px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Health alert banner shown if offline */}
              <BackendHealthBadge compact={false} className="hidden" />
              <Outlet />
            </div>
          </main>
        )}
      </div>

      {/* Developer Welcome Note Modal */}
      <WelcomeNoteModal
        isOpen={isWelcomeModalOpen}
        onClose={handleCloseWelcomeModal}
      />
    </div>
  );
};

export default AppLayout;

