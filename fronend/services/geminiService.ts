// Implementing the service to handle API calls to the backend.
import { HealthReportAnalysis, ProfileData, SymptomPrediction, Hospital, HospitalFinderResult, User } from '../types';

const API_BASE_URL = 'http://localhost:3001';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// A helper to get the auth token and create headers
const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        // This should ideally not happen in protected routes, but handle it gracefully.
        throw new Error('No authentication token found.');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

export const analyzeHealthReport = async (payload: { reportText?: string; fileData?: { data: string; mimeType:string } }): Promise<HealthReportAnalysis> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze health report.');
        }
        return data;
    } catch (error) {
        console.error("Error in analyzeHealthReport:", error);
        throw error;
    }
};

export const getChatResponse = async (prompt: string, history: Message[]): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message: prompt, history }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get chat response.');
        }
        return data.response;
    } catch (error) {
        console.error("Error in getChatResponse:", error);
        throw error;
    }
};

export const getUserProfile = async (): Promise<ProfileData> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/profile`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch user profile.');
        }
        return data;
    } catch (error) {
        console.error("Error in getUserProfile:", error);
        throw error;
    }
};

export const predictSymptoms = async (symptoms: string): Promise<SymptomPrediction[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/predict-symptoms`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ symptoms }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to predict diseases from symptoms.');
        }
        return data.predictions;
    } catch (error) {
        console.error("Error in predictSymptoms:", error);
        throw error;
    }
};

export const findNearbyHospitals = async (location: { lat?: number; lon?: number; query?: string }): Promise<HospitalFinderResult> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/find-hospitals`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(location),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to find nearby hospitals.');
        }
        return data;
    } catch (error) {
        console.error("Error in findNearbyHospitals:", error);
        throw error;
    }
};

export const getLatestAnalysis = async (): Promise<HealthReportAnalysis | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/latest-analysis`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        if (response.status === 404) {
            return null; // No analysis found, not an error
        }
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch latest analysis.');
        }
        return data;
    } catch (error) {
        console.error("Error in getLatestAnalysis:", error);
        throw error;
    }
};

export const getHealthTips = async (analysis: HealthReportAnalysis): Promise<string[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/health-tips`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ analysis }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch health tips.');
        }
        return data.tips;
    } catch (error) {
        console.error("Error in getHealthTips:", error);
        throw error;
    }
};

export const updateUserProfile = async (payload: Partial<User>): Promise<User> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update user profile.');
        }
        return data.user;
    } catch (error) {
        console.error("Error in updateUserProfile:", error);
        throw error;
    }
};