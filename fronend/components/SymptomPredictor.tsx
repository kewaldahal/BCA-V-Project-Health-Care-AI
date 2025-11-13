import React, { useState } from 'react';
import { SymptomPrediction } from '../types';
import { predictSymptoms } from '../services/geminiService';
import { SymptomIcon } from './icons/SymptomsIcon';

const SymptomPredictor: React.FC = () => {
    const [symptoms, setSymptoms] = useState('');
    const [predictions, setPredictions] = useState<SymptomPrediction[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symptoms.trim()) {
            setError('Please describe your symptoms before analyzing.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setPredictions(null);
        try {
            const result = await predictSymptoms(symptoms);
            setPredictions(result);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">AI Symptom Checker</h2>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                    Describe your symptoms, and our AI will provide potential insights.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                <form onSubmit={handleSubmit}>
                    <label htmlFor="symptom-text" className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Your Symptoms
                    </label>
                    <textarea
                        id="symptom-text"
                        rows={8}
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200 text-sm"
                        placeholder="e.g., 'I have a persistent headache, slight fever, and a sore throat...'"
                    />
                    <div className="text-center mt-6">
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center px-8 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            <SymptomIcon className="h-5 w-5 mr-2" />
                            {isLoading ? 'Analyzing...' : 'Analyze Symptoms'}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="mt-6 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                   {error}
                </div>
            )}

            {isLoading && (
                 <div className="text-center p-8">
                    <div className="w-12 h-12 border-4 border-red-500 border-dashed rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">AI is thinking...</p>
                </div>
            )}

            {predictions && (
                <div className="mt-8">
                     <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-r-lg mb-6" role="alert">
                        <p className="font-bold">Disclaimer</p>
                        <p>This AI-powered analysis is for informational purposes only and is not a substitute for professional medical diagnosis or advice. Always consult a qualified healthcare provider for any health concerns.</p>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">Potential Conditions</h3>
                    <div className="space-y-4">
                        {predictions.map((pred, index) => (
                            <div key={index} className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-xl font-bold text-red-600">{pred.disease}</h4>
                                    <span className="font-bold text-lg text-gray-800 dark:text-gray-100">
                                        {(pred.probability * 100).toFixed(0)}%
                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">Likelihood</span>
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 mb-3">{pred.description}</p>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold">Recommended Specialist:</span> {pred.specialist}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
};

export default SymptomPredictor;