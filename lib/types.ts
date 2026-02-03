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
  id: string | number;
  title?: string;
  name?: string;
  description: string;
  type?: 'rest' | 'light' | 'moderate' | 'intense' | 'meditation';
  duration?: number;
  durationInMinutes?: number;
  status?: 'active' | 'completed' | 'scheduled';
  completed?: boolean;
  patientId?: string | number;
  doctorId?: string | number;
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

export interface DoctorPatient {
  id: number;
  nom: string;
  prenom: string;
}

export type UserRole = 'doctor' | 'patient';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  patientId?: string;
}
