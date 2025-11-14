// Implementing the Dashboard component.
import React, { useState, useEffect } from 'react';
import { HealthReportAnalysis, User, HospitalFinderResult } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import HealthScoreGauge from './HealthScoreGauge';
import { getHealthTips, findNearbyHospitals } from '../services/geminiService';
import { BotIcon } from './icons/BotIcon';
import { HospitalIcon } from './icons/HospitalIcon';


interface DashboardProps {
  analysisResult: HealthReportAnalysis | null;
  onNewAnalysis: () => void;
  user: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ analysisResult, onNewAnalysis, user }) => {
  const [tips, setTips] = useState<string[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  const [hospitalResult, setHospitalResult] = useState<HospitalFinderResult | null>(null);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [hospitalError, setHospitalError] = useState<string | null>(null);
  const [showManualHospitalInput, setShowManualHospitalInput] = useState(false);
  const [manualLocation, setManualLocation] = useState('');

  const handleFetchTips = async () => {
    if (!analysisResult) return;
    setIsLoadingTips(true);
    try {
      const fetchedTips = await getHealthTips(analysisResult);
      setTips(fetchedTips);
    } catch (error) {
      console.error("Failed to fetch health tips:", error);
      setTips([]); // Clear tips on error
    } finally {
      setIsLoadingTips(false);
    }
  };

  const handleHospitalApiSearch = async (location: { lat?: number; lon?: number; query?: string }) => {
    if (!analysisResult || analysisResult.predictions.length === 0) return;

    setIsLoadingHospitals(true);
    setHospitalError(null);
    setHospitalResult(null);
    setShowManualHospitalInput(false);

    const diseases = analysisResult.predictions.slice(0, 2).map(p => p.disease).join(', ');
    const diseaseQuery = `Find hospitals and clinics specializing in ${diseases}`;
    
    let searchPayload: { lat?: number; lon?: number; query?: string } = {};

    if (location.query) { // Manual search
        searchPayload = { query: `${diseaseQuery} near ${location.query}` };
    } else { // Geolocation search
        searchPayload = { lat: location.lat, lon: location.lon, query: diseaseQuery };
    }

    try {
        const data = await findNearbyHospitals(searchPayload);
        setHospitalResult(data);
    } catch (err: any) {
        setHospitalError(err.message || "An error occurred while fetching hospital data.");
        setShowManualHospitalInput(true); // Show manual input on API failure
    } finally {
        setIsLoadingHospitals(false);
    }
  };

  // Map disease names / keywords to recommended medical specialists
  const mapDiseaseToSpecialist = (disease: string): string | null => {
    const d = disease.toLowerCase();
    if (d.includes('heart') || d.includes('cardio') || d.includes('cholesterol') || d.includes('angina') || d.includes('myocard')) return 'Cardiologist';
    if (d.includes('stroke') || d.includes('brain') || d.includes('neurol')) return 'Neurologist';
    if (d.includes('diabet') || d.includes('insulin') || d.includes('blood sugar')) return 'Endocrinologist';
    if (d.includes('lung') || d.includes('breath') || d.includes('asthma') || d.includes('pneum')) return 'Pulmonologist';
    if (d.includes('eye') || d.includes('vision') || d.includes('ocular')) return 'Ophthalmologist';
    if (d.includes('ear') || d.includes('throat') || d.includes('nose') || d.includes('sinus')) return 'ENT Specialist';
    if (d.includes('kidney') || d.includes('renal') || d.includes('neph')) return 'Nephrologist';
    if (d.includes('liver') || d.includes('hepatic') || d.includes('hepat')) return 'Hepatologist';
    if (d.includes('cancer') || d.includes('tumor') || d.includes('malignan')) return 'Oncologist';
    if (d.includes('skin') || d.includes('rash') || d.includes('derma')) return 'Dermatologist';
    if (d.includes('bone') || d.includes('joint') || d.includes('fracture') || d.includes('arthritis')) return 'Orthopedic Surgeon';
    if (d.includes('child') || d.includes('pediatr')) return 'Pediatrician';
    if (d.includes('eye') || d.includes('ocular')) return 'Ophthalmologist';
    if (d.includes('mental') || d.includes('depress') || d.includes('anxiety') || d.includes('psychi')) return 'Psychiatrist';
    // default fallback
    return null;
  };

  const getRecommendedSpecialists = (): string[] => {
    if (!analysisResult || !analysisResult.predictions) return [];
    const specialistsSet = new Set<string>();
    // look at top 3 predictions to decide specialists
    analysisResult.predictions.slice(0, 3).forEach(p => {
      const s = mapDiseaseToSpecialist(p.disease);
      if (s) specialistsSet.add(s);
    });
    return Array.from(specialistsSet);
  };

  // Search hospitals filtered by specialist (invokes existing API)
  const handleFindBySpecialist = async (specialist: string) => {
    setIsLoadingHospitals(true);
    setHospitalError(null);
    setHospitalResult(null);
    setShowManualHospitalInput(false);

    const specialistQuery = `Find hospitals or clinics with ${specialist} services or ${specialist} specialists`; 

    try {
      // Try geolocation first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const data = await findNearbyHospitals({ lat: latitude, lon: longitude, query: specialistQuery });
            setHospitalResult(data);
          } catch (err: any) {
            setHospitalError(err.message || 'Failed to search hospitals for specialist.');
          } finally {
            setIsLoadingHospitals(false);
          }
        }, (geoErr) => {
          // fallback to manual input if geolocation denied
          setIsLoadingHospitals(false);
          setHospitalError('Location access denied. Enter your city to search for specialists.');
          setShowManualHospitalInput(true);
        }, { timeout: 8000 });
      } else {
        // No geolocation available, show manual input and use specialist query when provided
        setIsLoadingHospitals(false);
        setHospitalError('Geolocation not available. Enter your city to search for specialists.');
        setShowManualHospitalInput(true);
      }
    } catch (e) {
      setIsLoadingHospitals(false);
      setHospitalError('An unexpected error occurred while searching for specialists.');
    }
  };

  const handleFindHospitals = () => {
    if (!navigator.geolocation) {
        setHospitalError("Geolocation is not supported by your browser. Please enter your location manually.");
        setShowManualHospitalInput(true);
        return;
    }

    setIsLoadingHospitals(true);
    setHospitalError(null);
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            handleHospitalApiSearch({ lat: latitude, lon: longitude });
        },
        (geoError) => {
            let errorMessage = "An unknown error occurred while getting your location. Please enter your location manually.";
            switch (geoError.code) {
                case geoError.PERMISSION_DENIED:
                    errorMessage = "You denied the request for Geolocation. Please enable it in your browser settings or enter your location manually.";
                    break;
                case geoError.POSITION_UNAVAILABLE:
                    errorMessage = "Your location information is unavailable. This may be due to a poor signal. Please try again or enter your location manually.";
                    break;
                case geoError.TIMEOUT:
                    errorMessage = "The request to get your location timed out. Please try again or enter your location manually.";
                    break;
            }
            setHospitalError(errorMessage);
            setShowManualHospitalInput(true);
            setIsLoadingHospitals(false);
        }
    );
  };

  const handleManualHospitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocation.trim()) {
        setHospitalError("Please enter a location to search.");
        return;
    }
    handleHospitalApiSearch({ query: manualLocation });
  };


  useEffect(() => {
    if (analysisResult) {
      // Reset states when a new analysis comes in
      setTips([]);
      setHospitalResult(null);
      setHospitalError(null);
      setIsLoadingHospitals(false);
      setShowManualHospitalInput(false);
    }
  }, [analysisResult]);


  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">
          Welcome, {user?.name || 'User'}!
        </h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
          {analysisResult ? 'Here is your latest health overview.' : 'Your personal AI health dashboard is ready.'}
        </p>
      </div>

      {analysisResult ? (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Side */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Latest Analysis</h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">A summary of your most recent report.</p>
                            </div>
                            <button onClick={onNewAnalysis} className="inline-flex items-center px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-colors w-full sm:w-auto">
                                <UploadIcon className="h-5 w-5 mr-2" />
                                Analyze New Report
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-black p-4 rounded-lg">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Health Score</h3>
                                <HealthScoreGauge score={analysisResult.healthScore} />
                            </div>
                            <div className="bg-gray-50 dark:bg-black p-6 rounded-lg">
                                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">AI Summary</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{analysisResult.summary}</p>
                            </div>
                        </div>
                        <div className="mt-6 text-center">
                            <button onClick={handleFindHospitals} className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors">
                                <HospitalIcon className="h-5 w-5 mr-2" />
                                Find Nearby Hospitals
                            </button>
                        </div>
                    </div>
                     <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Potential Health Risks</h3>
                         {analysisResult.predictions.length > 0 ? analysisResult.predictions.slice(0, 3).map((pred, index) => (
                            <div key={index} className="mb-3">
                                <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{pred.disease}</span>
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{(pred.probability * 100).toFixed(0)}% Risk</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div className={`h-2.5 rounded-full ${pred.probability > 0.7 ? 'bg-red-500' : pred.probability > 0.4 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pred.probability * 100}%` }}></div>
                                </div>
                            </div>
                        )) : <p className="text-gray-500 dark:text-gray-400">No significant risks were detected.</p>}
                    </div>
                </div>

                {/* Right Side */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <BotIcon className="w-6 h-6 text-red-500"/>
                            AI Health Tips
                        </h2>
                        {tips.length === 0 && !isLoadingTips && (
                            <div className="text-center">
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Click the button to generate personalized health tips and suggestions based on your report.</p>
                                <button onClick={handleFetchTips} className="inline-flex items-center px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-colors">
                                    <BotIcon className="h-5 w-5 mr-2" />
                                    Generate Health Tips
                                </button>
                            </div>
                        )}
                        {isLoadingTips ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                            </div>
                        ) : (
                            tips.length > 0 && (
                                <ul className="list-disc list-inside space-y-3 text-gray-600 dark:text-gray-300">
                                    {tips.map((tip, index) => <li key={index}>{tip}</li>)}
                                </ul>
                            )
                        )}
                    </div>
                    
                    {/* Recommended specialists (derived from AI predictions) */}
                    {analysisResult && analysisResult.predictions.length > 0 && (
                      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Recommended Specialists</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Based on your report, the following specialist(s) are recommended. Click to find nearby hospitals offering these services.</p>
                        <div className="flex flex-wrap gap-3">
                          {getRecommendedSpecialists().length > 0 ? (
                            getRecommendedSpecialists().map((spec, idx) => (
                              <button key={idx} onClick={() => handleFindBySpecialist(spec)} className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700">
                                {spec}
                              </button>
                            ))
                          ) : (
                            <p className="text-gray-600 dark:text-gray-300">No specific specialist identified. You can search hospitals related to your conditions.</p>
                          )}
                        </div>
                      </div>
                    )}

                    { (isLoadingHospitals || hospitalResult || hospitalError) && (
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                                <HospitalIcon className="w-6 h-6 text-red-500" />
                                Recommended Specialists & Hospitals
                            </h3>
                            {isLoadingHospitals && (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                </div>
                            )}
                            {hospitalError && (
                                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <p className="text-sm text-red-700 dark:text-red-300">{hospitalError}</p>
                                </div>
                            )}
                             {showManualHospitalInput && !isLoadingHospitals && (
                                <form onSubmit={handleManualHospitalSubmit} className="mt-4">
                                    <div className="flex flex-col sm:flex-row items-center gap-2">
                                        <input
                                            type="text"
                                            value={manualLocation}
                                            onChange={(e) => setManualLocation(e.target.value)}
                                            className="w-full p-2 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                            placeholder="e.g., Kathmandu, Nepal"
                                        />
                                        <button
                                            type="submit"
                                            className="w-full sm:w-auto px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-800"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </form>
                            )}
                            {hospitalResult && (
                                <div className="space-y-2">
                                    {hospitalResult.hospitals.length > 0 ? (
                                        hospitalResult.hospitals.slice(0, 4).map((hospital, index) => (
                                            <a
                                                key={index}
                                                href={hospital.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-3 bg-gray-50 dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 hover:border-red-500 dark:hover:border-red-500 transition-colors"
                                            >
                                                <p className="font-semibold text-red-600">{hospital.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Click to view on map</p>
                                            </a>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{hospitalResult.summary}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      ) : (
        <div className="text-center bg-white dark:bg-gray-900 p-8 sm:p-16 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Ready for your health check-in?
          </h2>
          <p className="mt-3 mb-8 max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
            Get started by analyzing your latest health report. Our AI will provide a summary, identify potential risks, and offer personalized recommendations.
          </p>
          <button
            onClick={onNewAnalysis}
            className="inline-flex items-center px-8 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
          >
            <UploadIcon className="h-5 w-5 mr-2" />
            Analyze Your First Report
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;