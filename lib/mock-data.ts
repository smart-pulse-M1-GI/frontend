import type { Patient, Activity, HeartRateData, PPGData, Alert } from "./types"

export const mockPatients: Patient[] = [
  {
    id: "1",
    name: "Cinthia Tsague",
    age: 58,
    gender: "female",
    medicalId: "PAT-2024-001",
    currentBpm: 145,
    status: "warning",
    minThreshold: 50,
    maxThreshold: 140,
    lastUpdate: new Date(),
    activities: [],
  },
  {
    id: "2",
    name: "Maniche ",
    age: 42,
    gender: "female",
    medicalId: "PAT-2024-002",
    currentBpm: 72,
    status: "normal",
    minThreshold: 50,
    maxThreshold: 150,
    lastUpdate: new Date(),
    activities: [],
  },
  {
    id: "3",
    name: "Arthur le crush",
    age: 65,
    gender: "male",
    medicalId: "PAT-2024-003",
    currentBpm: 88,
    status: "normal",
    minThreshold: 50,
    maxThreshold: 130,
    lastUpdate: new Date(),
    activities: [],
  },
  {
    id: "4",
    name: "Meli le sharo ",
    age: 51,
    gender: "female",
    medicalId: "PAT-2024-004",
    currentBpm: 45,
    status: "critical",
    minThreshold: 50,
    maxThreshold: 140,
    lastUpdate: new Date(),
    activities: [],
  },
]

export const mockActivities: Activity[] = [
  {
    id: "1",
    name: "Repos complet",
    description: "Période de repos sans activité physique",
    type: "rest",
    duration: 30,
    status: "scheduled",
  },
  {
    id: "2",
    name: "Marche légère",
    description: "Promenade à faible intensité",
    type: "light",
    duration: 20,
    status: "scheduled",
  },
  {
    id: "3",
    name: "Exercice modéré",
    description: "Activité cardiovasculaire modérée",
    type: "moderate",
    duration: 15,
    status: "scheduled",
  },
  {
    id: "4",
    name: "Effort intense",
    description: "Exercice cardiovasculaire intense",
    type: "intense",
    duration: 10,
    status: "scheduled",
  },
  {
    id: "5",
    name: "Méditation",
    description: "Session de méditation guidée",
    type: "meditation",
    duration: 15,
    status: "scheduled",
  },
]

export const mockAlerts: Alert[] = [
  {
    id: "1",
    patientId: "1",
    patientName: "Jean Dupont",
    type: "high",
    bpm: 145,
    threshold: 140,
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    acknowledged: false,
  },
  {
    id: "2",
    patientId: "4",
    patientName: "Sophie Dubois",
    type: "low",
    bpm: 45,
    threshold: 50,
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    acknowledged: false,
  },
]

export function generateMockHeartRateData(duration = 60): HeartRateData[] {
  const data: HeartRateData[] = []
  const now = new Date()

  for (let i = duration; i >= 0; i--) {
    data.push({
      timestamp: new Date(now.getTime() - i * 1000),
      bpm: 70 + Math.sin(i / 10) * 10 + Math.random() * 5,
    })
  }

  return data
}

export function generateMockPPGData(duration = 30): PPGData[] {
  const data: PPGData[] = []
  const now = new Date()
  const samplesPerSecond = 25
  const totalSamples = duration * samplesPerSecond

  for (let i = totalSamples; i >= 0; i--) {
    const t = i / samplesPerSecond
    const heartRate = 1.2
    const value =
      Math.sin(t * heartRate * 2 * Math.PI) * 50 + Math.sin(t * heartRate * 4 * Math.PI) * 20 + Math.random() * 10 + 100

    data.push({
      timestamp: new Date(now.getTime() - (i / samplesPerSecond) * 1000),
      value,
    })
  }

  return data
}
