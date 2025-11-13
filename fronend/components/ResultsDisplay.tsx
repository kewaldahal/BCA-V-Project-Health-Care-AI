

import React from 'react';
import { HealthReportAnalysis } from '../types';
import HealthScoreGauge from './HealthScoreGauge';
import { UploadIcon } from './icons/UploadIcon';

interface ResultsDisplayProps {
  result: HealthReportAnalysis | null;
  onNewAnalysis: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onNewAnalysis }) => {
  if (!result) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">No Analysis Found</h2>
        <p className="mb-6">Please go to the input page to analyze a health report.</p>
        <button
          onClick={onNewAnalysis}
          className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700"
        >
          Analyze a Report
        </button>
      </div>
    );
  }

  const { healthScore, summary, predictions, recommendations } = result;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Your Health Analysis Results</h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">Here's what our AI found in your report.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Overall Health Score</h3>
          <HealthScoreGauge score={healthScore} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">AI Summary</h3>
            <p className="text-gray-600 dark:text-gray-300">{summary}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Potential Health Risks</h3>
            <div className="space-y-3">
              {predictions.length > 0 ? predictions.map((pred, index) => (
                <div key={index} className="bg-gray-50 dark:bg-black p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{pred.disease}</span>
                     <span className={`font-bold text-sm px-2 py-1 rounded-full ${pred.probability > 0.7 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300' : pred.probability > 0.4 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300'}`}>
                        {(pred.probability * 100).toFixed(0)}% Risk
                    </span>
                  </div>
                   <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${pred.probability > 0.7 ? 'bg-red-500' : pred.probability > 0.4 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pred.probability * 100}%` }}></div>
                   </div>
                </div>
              )) : <p className="text-gray-500 dark:text-gray-400">No significant risks were detected based on the provided report.</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Recommendations</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              {recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
            </ul>
          </div>
        </div>
      </div>
      <div className="text-center mt-8">
        <button
          onClick={onNewAnalysis}
          className="inline-flex items-center px-8 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
        >
          <UploadIcon className="h-5 w-5 mr-2" />
          Analyze Another Report
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;