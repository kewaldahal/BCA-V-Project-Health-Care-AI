import React, { useState } from 'react';
import { HospitalFinderResult } from '../types';
import { findNearbyHospitals } from '../services/geminiService';
import { HospitalIcon } from './icons/HospitalIcon';

const HospitalFinder: React.FC = () => {
    const [result, setResult] = useState<HospitalFinderResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualLocation, setManualLocation] = useState('');


    const handleApiSearch = async (location: { lat?: number; lon?: number; query?: string }) => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await findNearbyHospitals(location);
            setResult(data);
        } catch (err: any) {
            setError(err.message || "An error occurred while fetching hospital data.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleFindHospitals = () => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        setShowManualInput(false);

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser. Please enter your location manually.");
            setShowManualInput(true);
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                handleApiSearch({ lat: latitude, lon: longitude });
            },
            (geoError) => {
                let errorMessage = "An unknown error occurred while getting your location.";
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
                setError(errorMessage);
                setShowManualInput(true);
                setIsLoading(false);
            }
        );
    };

     const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualLocation.trim()) {
            setError("Please enter a location to search.");
            return;
        }
        setShowManualInput(false);
        handleApiSearch({ query: manualLocation });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Find Nearby Hospitals</h2>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                    Use your current location or enter a city to find medical facilities.
                </p>
            </div>
            
            <div className="text-center bg-white dark:bg-gray-900 p-6 sm:p-10 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                <HospitalIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Ready to find help?</h3>
                <p className="mt-2 mb-6 max-w-xl mx-auto text-gray-600 dark:text-gray-300">
                    Click the button below to allow location access and see a list of nearby hospitals.
                </p>
                 <button
                    onClick={handleFindHospitals}
                    className="inline-flex items-center justify-center px-8 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    <HospitalIcon className="h-5 w-5 mr-2" />
                    {isLoading ? 'Searching...' : 'Find Hospitals Near Me'}
                </button>
            </div>

            {error && (
                <div className="mt-6 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                   {error}
                </div>
            )}

            {showManualInput && !isLoading && (
                 <div className="mt-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                    <form onSubmit={handleManualSubmit}>
                        <label htmlFor="manual-location" className="block text-lg font-medium text-center text-gray-700 dark:text-gray-200 mb-2">
                            Or, Enter Your Location Manually
                        </label>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <input
                                id="manual-location"
                                type="text"
                                value={manualLocation}
                                onChange={(e) => setManualLocation(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="e.g., San Francisco, CA"
                            />
                            <button
                                type="submit"
                                className="w-full sm:w-auto px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {isLoading && (
                 <div className="text-center p-8">
                    <div className="w-12 h-12 border-4 border-red-500 border-dashed rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">Searching for hospitals...</p>
                </div>
            )}

            {result && (
                <div className="mt-8 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Search Results</h3>
                    <div className="space-y-3">
                        {result.hospitals.length > 0 ? (
                             result.hospitals.map((hospital, index) => (
                                <a
                                    key={index}
                                    href={hospital.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 bg-gray-50 dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                >
                                    <p className="font-semibold text-red-600">{hospital.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Click to view on map</p>
                                </a>
                            ))
                        ) : (
                            <p className="text-gray-600 dark:text-gray-300">{result.summary}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HospitalFinder;