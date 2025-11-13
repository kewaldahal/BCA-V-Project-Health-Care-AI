import React, { useState } from 'react';
import { PulseIcon } from './icons/PulseIcon';
import { AuthResponse } from '../types';

interface RegisterProps {
    onRegister: (details: Record<string, any>) => Promise<void>;
    switchToLogin: () => void;
    error: string | null;
}

const Register: React.FC<RegisterProps> = ({ onRegister, switchToLogin, error }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        age: '',
        weight: '',
        medical_conditions: '',
        symptoms: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onRegister(formData);
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-black py-12 px-4">
            <div className="w-full max-w-lg p-8 space-y-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                 <div className="text-center">
                     <div className="flex items-center justify-center space-x-2 mb-4">
                        <PulseIcon className="h-10 w-10 text-red-600" />
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Health AI</h1>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Create Your Account</h2>
                    <p className="text-gray-500 dark:text-gray-400">Join to get personalized health insights.</p>
                </div>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-center">
                        {error}
                    </div>
                )}
                
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Full Name</label>
                            <input name="name" type="text" required onChange={handleChange} className="w-full px-3 py-2 mt-1 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                            <input name="email" type="email" required onChange={handleChange} className="w-full px-3 py-2 mt-1 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
                            <input name="password" type="password" required onChange={handleChange} className="w-full px-3 py-2 mt-1 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Age</label>
                            <input name="age" type="number" required onChange={handleChange} className="w-full px-3 py-2 mt-1 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Weight (kg)</label>
                            <input name="weight" type="number" step="0.1" required onChange={handleChange} className="w-full px-3 py-2 mt-1 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"/>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Pre-existing Medical Conditions (optional)</label>
                        <textarea name="medical_conditions" rows={2} onChange={handleChange} className="w-full px-3 py-2 mt-1 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g., Diabetes, Hypertension"></textarea>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Current Symptoms (optional)</label>
                        <textarea name="symptoms" rows={2} onChange={handleChange} className="w-full px-3 py-2 mt-1 bg-gray-50 dark:bg-black border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g., Headache, Fatigue"></textarea>
                    </div>

                    <div>
                        <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>
                </form>
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                    Already have an account?{' '}
                    <button onClick={switchToLogin} className="font-medium text-red-600 hover:underline">
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Register;