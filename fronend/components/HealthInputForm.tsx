// Implementing the HealthInputForm component.
import React, { useState, useRef } from 'react';
import { HealthReportAnalysis } from '../types';
import { analyzeHealthReport } from '../services/geminiService';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';
import { CloseIcon } from './icons/CloseIcon';


interface HealthInputFormProps {
  onAnalysisComplete: (result: HealthReportAnalysis) => void;
  onAnalysisError: (error: string) => void;
  setIsLoading: (isLoading: boolean) => void;
}

const HealthInputForm: React.FC<HealthInputFormProps> = ({
  onAnalysisComplete,
  onAnalysisError,
  setIsLoading,
}) => {
  const [reportText, setReportText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        onAnalysisError('Please upload a valid PDF file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        setUploadedFile({
            name: file.name,
            data: e.target?.result as string, // This will be a data URL
            mimeType: file.type,
        });
        setReportText(''); // Clear text input when a file is uploaded
        onAnalysisError(''); // Clear previous errors
    };
    reader.onerror = () => {
        onAnalysisError('Failed to read the file.');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const handleRemoveFile = () => {
    setUploadedFile(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim() && !uploadedFile) {
      onAnalysisError('Please upload a file or paste your health report before analyzing.');
      return;
    }

    setIsLoading(true);
    onAnalysisError('');
    try {
      const payload: { reportText?: string; fileData?: { data: string; mimeType: string } } = {};
      if (uploadedFile) {
        const base64Data = uploadedFile.data.split(',')[1];
        payload.fileData = { data: base64Data, mimeType: uploadedFile.mimeType };
      } else {
        payload.reportText = reportText;
      }
      const result = await analyzeHealthReport(payload);
      onAnalysisComplete(result);
    } catch (err: any) {
      onAnalysisError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">Analyze Your Health Report</h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Upload a PDF or paste your medical report text below for an AI-powered analysis.
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Note: This tool is a prototype and does not replace professional medical advice.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
        
        {uploadedFile ? (
            <div className="mb-6">
                <label className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Uploaded PDF Report
                </label>
                <div className="mt-2 flex items-center justify-between p-4 bg-gray-50 dark:bg-black rounded-lg border border-gray-300 dark:border-gray-700">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <FileIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <span className="font-medium text-gray-700 dark:text-gray-200 truncate" title={uploadedFile.name}>
                            {uploadedFile.name}
                        </span>
                    </div>
                    <button type="button" onClick={handleRemoveFile} className="text-gray-400 hover:text-red-500 ml-4">
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        ) : (
            <>
                <div className="mb-6">
                    <label htmlFor="report-upload" className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Upload PDF Report
                    </label>
                    <div 
                        className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-md cursor-pointer hover:border-red-500 dark:hover:border-red-500 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        >
                        <div className="space-y-1 text-center">
                            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <p className="pl-1">Click to upload a report</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">Only PDF files are supported</p>
                            <input ref={fileInputRef} id="report-upload" name="report-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf"/>
                        </div>
                    </div>
                </div>
                
                <div className="mb-6">
                    <label htmlFor="report-text" className="block text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Or Paste Your Report Text
                    </label>
                    <textarea
                        id="report-text"
                        rows={15}
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200 text-sm"
                        placeholder="You can paste your report directly here..."
                    />
                </div>
            </>
        )}

        <div className="text-center">
          <button
            type="submit"
            className="inline-flex items-center justify-center px-8 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!reportText.trim() && !uploadedFile}
          >
            <UploadIcon className="h-5 w-5 mr-2" />
            Analyze Report
          </button>
        </div>
      </form>
    </div>
  );
};

export default HealthInputForm;