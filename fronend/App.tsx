import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import HealthInputForm from './components/HealthInputForm';
import ResultsDisplay from './components/ResultsDisplay';
import ChatAssistant from './components/ChatAssistant';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import SymptomPredictor from './components/SymptomPredictor';
import HospitalFinder from './components/HospitalFinder';
import { Page, HealthReportAnalysis, User, AuthResponse } from './types';
import { jwtDecode } from 'jwt-decode';
import { getLatestAnalysis } from './services/geminiService';


const API_BASE_URL = 'http://localhost:3001';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
  const [analysisResult, setAnalysisResult] = useState<HealthReportAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const initializeUser = async (authToken: string) => {
      try {
        const decodedUser: User = jwtDecode(authToken);
        setUser(decodedUser);
        localStorage.setItem('authToken', authToken);
        
        // Fetch the latest analysis for the user
        const latestAnalysis = await getLatestAnalysis();
        if (latestAnalysis) {
          setAnalysisResult(latestAnalysis);
        }

      } catch (e) {
        handleLogout();
      }
    };

    if (token) {
      initializeUser(token);
    }
  }, [token]);

  const handleAuthResponse = (data: AuthResponse) => {
    setToken(data.token);
    // User state will be set by the useEffect hook when token changes
    setAuthError(null);
    setIsRegistering(false);
  };

  const handleLogin = async (email: string, password: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        handleAuthResponse(data);
    } catch (err: any) {
        setAuthError(err.message);
    }
  };
  
  const handleRegister = async (details: Record<string, any>) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');
        handleAuthResponse(data);
    } catch (err: any) {
        setAuthError(err.message);
    }
  };
  
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    setCurrentPage(Page.Dashboard);
    setAnalysisResult(null);
  };

  const handleAnalysisComplete = useCallback((result: HealthReportAnalysis) => {
    setAnalysisResult(result);
    setCurrentPage(Page.Results);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleAnalysisError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setError(null);
  };
  
  const handleNewAnalysis = () => {
    // We don't clear the analysis result here anymore,
    // so the dashboard still shows the last one until a new one is complete.
    handleNavigate(Page.Input);
  };
  
  if (!token) {
     return isRegistering ? (
        <Register 
          onRegister={handleRegister} 
          switchToLogin={() => { setIsRegistering(false); setAuthError(null); }} 
          error={authError} 
        />
     ) : (
        <Login 
          onLogin={handleLogin} 
          switchToRegister={() => { setIsRegistering(true); setAuthError(null); }} 
          error={authError} 
        />
     );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-dashed rounded-full animate-spin"></div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">AI is analyzing your report... This may take a moment.</p>
        </div>
      );
    }

    if (error) {
       return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">An error occurred:</strong>
                <span className="block sm:inline ml-2">{error}</span>
            </div>
            <button
                onClick={() => handleNavigate(Page.Input)}
                className="mt-6 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
            >
                Try Again
            </button>
        </div>
       )
    }

    switch (currentPage) {
      case Page.Dashboard:
        return <Dashboard analysisResult={analysisResult} onNewAnalysis={handleNewAnalysis} user={user}/>;
      case Page.Input:
        return <HealthInputForm 
                  onAnalysisComplete={handleAnalysisComplete} 
                  onAnalysisError={handleAnalysisError} 
                  setIsLoading={setIsLoading} 
                />;
      case Page.Results:
        return <ResultsDisplay result={analysisResult} onNewAnalysis={handleNewAnalysis} />;
      case Page.Chat:
        return <ChatAssistant />;
      case Page.Profile:
        return <Profile user={user} onProfileUpdate={setUser} />;
      case Page.SymptomPredictor:
        return <SymptomPredictor />;
      case Page.HospitalFinder:
        return <HospitalFinder />;
      default:
        return <Dashboard analysisResult={analysisResult} onNewAnalysis={handleNewAnalysis} user={user} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black text-gray-900 dark:text-gray-100 font-sans">
      <Header currentPage={currentPage} onNavigate={handleNavigate} user={user} onLogout={handleLogout} />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full">
          {renderContent()}
        </div>
      </main>
      <footer className="text-center p-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        Health Care AI &copy; {new Date().getFullYear()}. This is a prototype and not a substitute for professional medical advice.
      </footer>
    </div>
  );
};

export default App;