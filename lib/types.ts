export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  medicalId: string;
  currentBpm: number;
  status: 'normal' | 'warning' | 'critical';
  minThreshold: number;
  maxThreshold: number;
  lastUpdate: Date;
  activities: Activity[];
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  type: 'rest' | 'light' | 'moderate' | 'intense' | 'meditation';
  duration: number;
  status: 'active' | 'completed' | 'scheduled';
  startTime?: Date;
  endTime?: Date;
  averageBpm?: number;
  minBpm?: number;
  maxBpm?: number;
}

export interface HeartRateData {
  timestamp: Date;
  bpm: number;
  activityId?: string;
}

export interface PPGData {
  timestamp: Date;
  value: number;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'high' | 'low';
  bpm: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

export type UserRole = 'doctor' | 'patient';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  patientId?: string;
}
