// Implementing the type definitions for the application.
export enum Page {
  Dashboard = 'Dashboard',
  Input = 'Input',
  Results = 'Results',
  Chat = 'Chat',
  Profile = 'Profile',
  SymptomPredictor = 'SymptomPredictor',
  HospitalFinder = 'HospitalFinder',
}

export interface Prediction {
  disease: string;
  probability: number;
}

export interface HealthReportAnalysis {
  healthScore: number;
  summary: string;
  predictions: Prediction[];
  recommendations: string[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  weight?: number;
  medical_conditions?: string;
  symptoms?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AnalysisHistoryItem {
    id: number;
    summary: string;
    health_score: number;
    created_at: string;
}

export interface ProfileData {
    user: User;
    analyses: AnalysisHistoryItem[];
}

export interface SymptomPrediction {
  disease: string;
  probability: number;
  description: string;
  specialist: string;
}

export interface Hospital {
  name: string;
  uri: string;
}

export interface HospitalFinderResult {
  summary: string;
  hospitals: Hospital[];
}