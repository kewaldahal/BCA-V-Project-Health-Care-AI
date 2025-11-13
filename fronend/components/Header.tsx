import React from 'react';
import { Page, User } from '../types';
import { PulseIcon } from './icons/PulseIcon';
import { ChartIcon } from './icons/ChartIcon';
import { UploadIcon } from './icons/UploadIcon';
import { BotIcon } from './icons/BotIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserIcon } from './icons/UserIcon';
import { SymptomIcon } from './icons/SymptomsIcon';
import { HospitalIcon } from './icons/HospitalIcon';


interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User | null;
  onLogout: () => void;
}

const NavItem: React.FC<{
  page: Page;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  icon: React.ReactNode;
  label: string;
}> = ({ page, currentPage, onNavigate, icon, label }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => onNavigate(page)}
      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'bg-red-600 text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, user, onLogout }) => {
  return (
    <header className="bg-white/80 dark:bg-black/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate(Page.Dashboard)}>
            <PulseIcon className="h-8 w-8 text-red-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Health AI</h1>
          </div>
          <nav className="flex items-center space-x-2 sm:space-x-4">
            <NavItem
              page={Page.Dashboard}
              currentPage={currentPage}
              onNavigate={onNavigate}
              icon={<ChartIcon className="h-5 w-5" />}
              label="Dashboard"
            />
            <NavItem
              page={Page.Input}
              currentPage={currentPage}
              onNavigate={onNavigate}
              icon={<UploadIcon className="h-5 w-5" />}
              label="Analyze"
            />
            <NavItem
              page={Page.SymptomPredictor}
              currentPage={currentPage}
              onNavigate={onNavigate}
              icon={<SymptomIcon className="h-5 w-5" />}
              label="Symptoms"
            />
            <NavItem
              page={Page.HospitalFinder}
              currentPage={currentPage}
              onNavigate={onNavigate}
              icon={<HospitalIcon className="h-5 w-5" />}
              label="Hospitals"
            />
             <NavItem
              page={Page.Profile}
              currentPage={currentPage}
              onNavigate={onNavigate}
              icon={<UserIcon className="h-5 w-5" />}
              label="Profile"
            />
            <NavItem
              page={Page.Chat}
              currentPage={currentPage}
              onNavigate={onNavigate}
              icon={<BotIcon className="h-5 w-5" />}
              label="Chat"
            />
            {user && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogoutIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;