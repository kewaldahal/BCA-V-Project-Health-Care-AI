import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getUserProfile, updateUserProfile } from '../services/geminiService';
import { ProfileData, User } from '../types';
import { UserIcon } from './icons/UserIcon';
import { ChartIcon } from './icons/ChartIcon';
import { EditIcon } from './icons/EditIcon';
import { SaveIcon } from './icons/SaveIcon';


interface ProfileProps {
    user: User | null;
    onProfileUpdate: (user: User) => void;
}


const Profile: React.FC<ProfileProps> = ({ user: initialUser, onProfileUpdate }) => {
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        medical_conditions: '',
        symptoms: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const data = await getUserProfile();
                setProfileData(data);
                setFormData({
                    medical_conditions: data.user.medical_conditions || '',
                    symptoms: data.user.symptoms || ''
                });
            } catch (err: any) {
                setError(err.message || 'Failed to load profile.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        // Reset form data if canceling edit
        if (isEditing && profileData) {
            setFormData({
                medical_conditions: profileData.user.medical_conditions || '',
                symptoms: profileData.user.symptoms || ''
            });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!profileData) return;
        setIsSaving(true);
        try {
            const updatedUser = await updateUserProfile(formData);
            
            // Update local state
            setProfileData(prev => prev ? { ...prev, user: { ...prev.user, ...updatedUser }} : null);
            onProfileUpdate({ ...profileData.user, ...updatedUser });

            setIsEditing(false);
        } catch (error) {
             console.error("Failed to save profile", error);
             setError("Could not save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 border-4 border-red-500 border-dashed rounded-full animate-spin"></div>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Loading your profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
                    <strong className="font-bold">An error occurred:</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                </div>
            </div>
        );
    }

    if (!profileData) {
        return <div className="text-center text-gray-500 dark:text-gray-400">No profile data available.</div>;
    }
    
    const { user, analyses } = profileData;

    const chartData = analyses.map(item => ({
        date: new Date(item.created_at).toLocaleDateString(),
        healthScore: item.health_score
    })).reverse(); // a more natural progression from left to right

    const InfoCard: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
        <div className="bg-gray-50 dark:bg-black p-4 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{value || 'N/A'}</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">
                    Health Profile
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                    Your personal health summary and history, {user.name}.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><UserIcon className="w-6 h-6"/> Your Information</h2>
                        {isEditing ? (
                             <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1 px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400">
                                <SaveIcon className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        ) : (
                            <button onClick={handleEditToggle} className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
                                <EditIcon className="w-4 h-4" /> Edit
                            </button>
                        )}
                    </div>

                    <InfoCard label="Age" value={user.age} />
                    <InfoCard label="Weight" value={user.weight ? `${user.weight} kg` : undefined} />
                    
                    <div className="bg-gray-50 dark:bg-black p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pre-existing Conditions</p>
                         {isEditing ? (
                            <textarea name="medical_conditions" value={formData.medical_conditions} onChange={handleInputChange} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-md text-gray-900 dark:text-white" rows={2}></textarea>
                         ) : (
                            <p className="text-md text-gray-900 dark:text-white">{user.medical_conditions || 'None specified'}</p>
                         )}
                    </div>
                     <div className="bg-gray-50 dark:bg-black p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Symptoms</p>
                         {isEditing ? (
                             <textarea name="symptoms" value={formData.symptoms} onChange={handleInputChange} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-md text-gray-900 dark:text-white" rows={2}></textarea>
                         ) : (
                            <p className="text-md text-gray-900 dark:text-white">{user.symptoms || 'None specified'}</p>
                         )}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><ChartIcon className="w-6 h-6"/> Health Score Trend</h2>
                    {chartData.length > 1 ? (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                                    <XAxis dataKey="date" className="text-xs fill-gray-500 dark:fill-gray-400" />
                                    <YAxis domain={[0, 100]} className="text-xs fill-gray-500 dark:fill-gray-400" />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(2px)', border: '1px solid #ddd' }} itemStyle={{color: '#ef4444'}}/>
                                    <Legend />
                                    <Line type="monotone" dataKey="healthScore" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                            <p>You need at least two analyses to see a trend chart.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Analysis History</h2>
                <div className="space-y-4">
                    {analyses.length > 0 ? analyses.map(item => (
                        <div key={item.id} className="bg-gray-50 dark:bg-black p-4 rounded-lg flex justify-between items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">Analysis from {new Date(item.created_at).toLocaleString()}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{item.summary}</p>
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Health Score</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{item.health_score}</p>
                            </div>
                        </div>
                    )) : (
                         <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            <p>You haven't analyzed any reports yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;