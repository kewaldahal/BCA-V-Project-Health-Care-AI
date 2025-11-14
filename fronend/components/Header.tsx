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
  isMobile?: boolean;
}> = ({ page, currentPage, onNavigate, icon, label, isMobile }) => {
  const isActive = currentPage === page;
  const baseClasses = "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
  const mobileClasses = isMobile ? "w-full justify-start text-base" : "";
  const activeClasses = isActive ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
  
  return (
    <button
      onClick={() => onNavigate(page)}
      className={`${baseClasses} ${activeClasses} ${mobileClasses}`}
    >
      {icon}
      <span className={isMobile ? "" : "hidden sm:inline"}>{label}</span>
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleNav = (page: Page) => {
    onNavigate(page);
    setIsMenuOpen(false);
  }

  return (
    <header className="bg-white/80 dark:bg-black/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNav(Page.Dashboard)}>
            <PulseIcon className="h-8 w-8 text-red-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Health Care AI</h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <NavItem page={Page.Dashboard} currentPage={currentPage} onNavigate={handleNav} icon={<ChartIcon className="h-5 w-5" />} label="Dashboard" />
            <NavItem page={Page.Input} currentPage={currentPage} onNavigate={handleNav} icon={<UploadIcon className="h-5 w-5" />} label="Analyze" />
            <NavItem page={Page.SymptomPredictor} currentPage={currentPage} onNavigate={handleNav} icon={<SymptomIcon className="h-5 w-5" />} label="Symptoms" />
            <NavItem page={Page.HospitalFinder} currentPage={currentPage} onNavigate={handleNav} icon={<HospitalIcon className="h-5 w-5" />} label="Hospitals" />
            <NavItem page={Page.Profile} currentPage={currentPage} onNavigate={handleNav} icon={<UserIcon className="h-5 w-5" />} label="Profile" />
            <NavItem page={Page.Chat} currentPage={currentPage} onNavigate={handleNav} icon={<BotIcon className="h-5 w-5" />} label="Chat" />
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

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              {isMenuOpen ? (
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-800">
            <NavItem page={Page.Dashboard} currentPage={currentPage} onNavigate={handleNav} icon={<ChartIcon className="h-6 w-6" />} label="Dashboard" isMobile />
            <NavItem page={Page.Input} currentPage={currentPage} onNavigate={handleNav} icon={<UploadIcon className="h-6 w-6" />} label="Analyze Report" isMobile />
            <NavItem page={Page.SymptomPredictor} currentPage={currentPage} onNavigate={handleNav} icon={<SymptomIcon className="h-6 w-6" />} label="Symptom Checker" isMobile />
            <NavItem page={Page.HospitalFinder} currentPage={currentPage} onNavigate={handleNav} icon={<HospitalIcon className="h-6 w-6" />} label="Find Hospitals" isMobile />
            <NavItem page={Page.Profile} currentPage={currentPage} onNavigate={handleNav} icon={<UserIcon className="h-6 w-6" />} label="Profile" isMobile />
            <NavItem page={Page.Chat} currentPage={currentPage} onNavigate={handleNav} icon={<BotIcon className="h-6 w-6" />} label="AI Assistant" isMobile />
            {user && (
              <button
                onClick={() => { onLogout(); setIsMenuOpen(false); }}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 w-full justify-start"
              >
                <LogoutIcon className="h-6 w-6" />
                <span>Logout</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;