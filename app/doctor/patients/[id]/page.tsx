'use client';

import { useState, useEffect, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HeartRateChart } from '@/components/heart-rate-chart';
import { PPGWaveform } from '@/components/ppg-waveform';
import { ActivityCard } from '@/components/activity-card';
import { StatsCard } from '@/components/stats-card';
import { mockPatients, mockActivities, generateMockPPGData } from '@/lib/mock-data';
import { Patient, HeartRateData, PPGData } from '@/lib/types';
import { Heart, Activity, ArrowLeft, Settings, Play, Square, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { NotificationsPanel } from '@/components/notifications-panel';

// ==================== CONFIGURATION API ====================
const API_BASE_URL = 'http://localhost:8080/api/v1';
const WS_URL = 'http://localhost:8080/ws-cardiac';

// ==================== TYPES POUR LES ACTIVITÉS API ====================
interface ActivityFromAPI {
  id: number;
  title: string;
  description: string;
  patientId: string;
  doctorId: string;
  durationInMinutes: number;
  completed: boolean;
}

// Transformer les données de l'API vers le format frontend
const transformActivityFromAPI = (apiActivity: ActivityFromAPI): any => {
  return {
    id: apiActivity.id.toString(),
    title: apiActivity.title,
    description: apiActivity.description,
    duration: apiActivity.durationInMinutes,
    durationInMinutes: apiActivity.durationInMinutes,
    status: apiActivity.completed ? 'completed' as const : 'scheduled' as const,
    scheduledFor: new Date().toISOString(),
  };
};

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // États existants
  const [patient, setPatient] = useState<Patient | null>(null);
  const [heartRateData, setHeartRateData] = useState<HeartRateData[]>([]);
  const [ppgData, setPpgData] = useState<PPGData[]>(generateMockPPGData(30));
  const [thresholds, setThresholds] = useState({ min: 50, max: 140 });
  const [showThresholdForm, setShowThresholdForm] = useState(false);
  
  // ==================== NOUVEAUX ÉTATS POUR TEMPS RÉEL ====================
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  // ==================== ÉTATS POUR ACTIVITÉS ====================
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [activityTimer, setActivityTimer] = useState(0);

  // ==================== CHARGEMENT DU PATIENT ====================
  useEffect(() => {
    const loadPatientData = async () => {
      const foundPatient = mockPatients.find(p => p.id === id);
      if (!foundPatient) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/activities/patient/${id}`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (response.ok) {
          const activities = await response.json();
          console.log('✅ Activités chargées pour le patient:', activities);
          
          const transformedActivities = Array.isArray(activities) 
            ? activities.map(transformActivityFromAPI)
            : [];
          
          setPatient({
            ...foundPatient,
            activities: transformedActivities
          });
        } else {
          console.warn('⚠️ Impossible de charger les activités, utilisation des données mock');
          setPatient({
            ...foundPatient,
            activities: mockActivities.slice(0, 3).map(a => ({ ...a, status: 'scheduled' as const })),
          });
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des activités:', error);
        setPatient({
          ...foundPatient,
          activities: mockActivities.slice(0, 3).map(a => ({ ...a, status: 'scheduled' as const })),
        });
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/thresholds/patient/${id}`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (response.ok) {
          const thresholdsData = await response.json();
          console.log('✅ Seuils chargés:', thresholdsData);
          setThresholds({
            min: thresholdsData.bpmMin,
            max: thresholdsData.bpmMax
          });
        } else {
          console.warn('⚠️ Pas de seuils définis, utilisation des valeurs par défaut');
          setThresholds({
            min: foundPatient.minThreshold,
            max: foundPatient.maxThreshold
          });
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des seuils:', error);
        setThresholds({
          min: foundPatient.minThreshold,
          max: foundPatient.maxThreshold
        });
      }
    };

    loadPatientData();
  }, [id]);

  // ==================== CONFIGURATION WEBSOCKET ====================
  useEffect(() => {
    console.log('🔌 Initialisation de la connexion WebSocket...');
    
    const client = new Client({
      webSocketFactory: () => {
        console.log('🌐 Création de la connexion SockJS vers:', WS_URL);
        return new SockJS(WS_URL);
      },
      debug: (str) => {
        console.log('[STOMP]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('✅ WebSocket connecté avec succès!');
        setConnectionStatus('connected');
        setError(null);

        client.subscribe('/topic/pulse', (message) => {
          try {
            const data = JSON.parse(message.body);
            console.log('📊 Données BPM reçues:', data);
            
            setHeartRateData(prev => {
              const newData = [...prev, {
                timestamp: new Date(),
                bpm: data.bpm
              }];
              
              if (newData.length > 60) {
                return newData.slice(-60);
              }
              return newData;
            });

            // ✅ VÉRIFIER LES SEUILS EN TEMPS RÉEL
            const currentBpm = data.bpm;
            if (currentBpm < thresholds.min || currentBpm > thresholds.max) {
              console.warn('⚠️ ALERTE: BPM hors limites!', currentBpm);
              // L'alerte visuelle sera affichée automatiquement via isOutOfRange
            }
          } catch (error) {
            console.error('❌ Erreur lors du parsing des données WebSocket:', error);
          }
        });
      },
      onStompError: (frame) => {
        console.error('❌ Erreur STOMP:', frame.headers['message']);
        console.error('Détails:', frame.body);
        setConnectionStatus('disconnected');
        setError('Erreur de connexion WebSocket');
      },
      onWebSocketClose: () => {
        console.log('🔌 WebSocket fermé');
        setConnectionStatus('disconnected');
      },
      onWebSocketError: (event) => {
        console.error('❌ Erreur WebSocket:', event);
        setConnectionStatus('disconnected');
        setError('Impossible de se connecter au serveur');
      }
    });

    setConnectionStatus('connecting');
    
    try {
      client.activate();
      setStompClient(client);
    } catch (error) {
      console.error('❌ Erreur lors de l\'activation du client STOMP:', error);
      setConnectionStatus('disconnected');
      setError('Erreur d\'initialisation WebSocket');
    }

    return () => {
      console.log('🧹 Nettoyage de la connexion WebSocket');
      if (client.active) {
        client.deactivate();
      }
    };
  }, []);

  // ==================== ANIMATION PPG ====================
  useEffect(() => {
    const interval = setInterval(() => {
      setPpgData(generateMockPPGData(30));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ==================== TIMER POUR ACTIVITÉ ACTIVE ====================
  useEffect(() => {
    if (activeActivityId && isSessionActive) {
      const interval = setInterval(() => {
        setActivityTimer(prev => {
          const newTime = prev + 1;
          
          const activity = patient?.activities.find(a => a.id === activeActivityId);
          const durationInSeconds = (activity?.duration || activity?.durationInMinutes || 0) * 60;
          
          if (durationInSeconds > 0 && newTime >= durationInSeconds) {
            console.log('⏰ Durée de l\'activité atteinte, arrêt automatique');
            stopActivity();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setActivityTimer(0);
    }
  }, [activeActivityId, isSessionActive, patient]);

  // ==================== DÉMARRER UNE SESSION LIBRE ====================
  const startSession = async () => {
    if (!patient) {
      setError('Patient non trouvé');
      return;
    }

    setError(null);
    console.log('▶️  Tentative de démarrage de session libre pour patient:', patient.id);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/cardiac/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          patientId: patient.id
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const newSessionId = await response.json();
      setSessionId(newSessionId);
      setIsSessionActive(true);
      setHeartRateData([]);
      
      console.log('✅ Session libre démarrée avec succès! ID:', newSessionId);
      
    } catch (error) {
      console.error('❌ Erreur lors du démarrage de la session:', error);
      setError('Impossible de démarrer la session. Vérifiez que le backend est accessible.');
      setIsSessionActive(false);
    }
  };

  // ==================== DÉMARRER UNE ACTIVITÉ ====================
  const startActivity = async (activity: any) => {
    if (!patient) {
      setError('Patient non trouvé');
      return;
    }

    setError(null);
    console.log('🏃 Démarrage de l\'activité:', activity.title);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/activities/start-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          patientId: patient.id,
          activityId: activity.id
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const newSessionId = await response.json();
      setSessionId(newSessionId);
      setIsSessionActive(true);
      setActiveActivityId(activity.id);
      setActivityTimer(0);
      setHeartRateData([]);
      
      console.log('✅ Activité démarrée! Session ID:', newSessionId);
      console.log('⏱️  Durée prévue:', activity.duration || activity.durationInMinutes, 'minutes');
      
    } catch (error) {
      console.error('❌ Erreur lors du démarrage de l\'activité:', error);
      setError('Impossible de démarrer l\'activité. Vérifiez que le backend est accessible.');
    }
  };

  // ==================== ARRÊTER UNE ACTIVITÉ ====================
  const stopActivity = async () => {
    if (!sessionId) return;

    console.log('⏹️  Arrêt de l\'activité, session:', sessionId);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/cardiac/stop`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        setIsSessionActive(false);
        setSessionId(null);
        setActiveActivityId(null);
        setActivityTimer(0);
        console.log('✅ Activité terminée avec succès');
        
        // Recharger les activités
        const activitiesResponse = await fetch(`${API_BASE_URL}/activities/patient/${patient?.id}`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        
        if (activitiesResponse.ok && patient) {
          const activities = await activitiesResponse.json();
          const transformedActivities = Array.isArray(activities) 
            ? activities.map(transformActivityFromAPI)
            : [];
          
          setPatient({
            ...patient,
            activities: transformedActivities
          });
        }
      } else {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt de l\'activité:', error);
      setError('Erreur lors de l\'arrêt de l\'activité');
    }
  };

  // ==================== ARRÊTER LA SESSION LIBRE ====================
  const stopSession = async () => {
    if (!sessionId) return;

    console.log('⏹️  Arrêt de la session libre:', sessionId);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/cardiac/stop`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        setIsSessionActive(false);
        setSessionId(null);
        console.log('✅ Session arrêtée avec succès');
      } else {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt de la session:', error);
      setError('Erreur lors de l\'arrêt de la session');
    }
  };

  // ==================== METTRE À JOUR LES SEUILS ====================
  const handleUpdateThresholds = async () => {
    if (!patient) return;

    console.log('⚙️  Mise à jour des seuils:', thresholds);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${API_BASE_URL}/thresholds/set/${patient.id}?min=${thresholds.min}&max=${thresholds.max}`,
        {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        }
      );

      if (response.ok) {
        const updatedThresholds = await response.json();
        console.log('✅ Seuils mis à jour avec succès:', updatedThresholds);
        
        // Mettre à jour le patient avec les nouveaux seuils
        setPatient({
          ...patient,
          minThreshold: thresholds.min,
          maxThreshold: thresholds.max,
        });
        
        setShowThresholdForm(false);
        
        // Afficher un message de succès (optionnel)
        setError(null);
      } else {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des seuils:', error);
      setError('Erreur lors de la mise à jour des seuils');
    }
  };

  // ==================== FONCTION POUR FORMATER LE TEMPS ====================
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== CHARGEMENT ====================
  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Heart className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Chargement du patient...</p>
        </div>
      </div>
    );
  }

  // ==================== CALCUL DES STATISTIQUES ====================
  const currentBpm = heartRateData.length > 0 
    ? Math.round(heartRateData[heartRateData.length - 1].bpm) 
    : 0;
  
  const avgBpm = heartRateData.length > 0
    ? Math.round(heartRateData.reduce((sum, d) => sum + d.bpm, 0) / heartRateData.length)
    : 0;
  
  const minBpm = heartRateData.length > 0
    ? Math.round(Math.min(...heartRateData.map(d => d.bpm)))
    : 0;
  
  const maxBpm = heartRateData.length > 0
    ? Math.round(Math.max(...heartRateData.map(d => d.bpm)))
    : 0;

  // ✅ VÉRIFIER SI LE BPM EST HORS LIMITES
  const isOutOfRange = currentBpm > 0 && (currentBpm < thresholds.min || currentBpm > thresholds.max);

  return (
    <div className="min-h-screen bg-background">
      {/* ==================== HEADER ==================== */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{patient.name}</h1>
                <p className="text-sm text-muted-foreground">{patient.medicalId}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationsPanel 
                userId={patient.id} 
                token={localStorage.getItem('token') || ''} 
              />
              
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                connectionStatus === 'connected' 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}>
                {connectionStatus === 'connected' ? (
                  <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  connectionStatus === 'connected' 
                    ? 'text-green-700 dark:text-green-300' 
                    : connectionStatus === 'connecting'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {connectionStatus === 'connected' ? 'Connecté' : 
                   connectionStatus === 'connecting' ? 'Connexion...' : 
                   'Déconnecté'}
                </span>
              </div>
              
              <Button variant="outline" asChild>
                <Link href="/doctor/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              
              <Button asChild>
                <Link href="/login">Se déconnecter</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* ==================== ALERTE SEUILS DÉPASSÉS ==================== */}
        {isOutOfRange && isSessionActive && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border-2 border-red-500 dark:border-red-700 rounded-lg animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                <Heart className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-200 font-bold text-lg">
                  ⚠️ ALERTE: Fréquence cardiaque hors limites!
                </p>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  BPM actuel: <span className="font-bold">{currentBpm}</span> | 
                  Limites normales: {thresholds.min} - {thresholds.max} BPM
                </p>
                {currentBpm < thresholds.min && (
                  <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                    ⬇️ Le rythme cardiaque est trop bas (bradycardie)
                  </p>
                )}
                {currentBpm > thresholds.max && (
                  <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                    ⬆️ Le rythme cardiaque est trop élevé (tachycardie)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== ALERTE SEUILS DÉPASSÉS ==================== */}
        {isOutOfRange && isSessionActive && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border-2 border-red-500 dark:border-red-700 rounded-lg animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                <Heart className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-200 font-bold text-lg">
                  ⚠️ ALERTE: Fréquence cardiaque hors limites!
                </p>
                <p className="text-red-700 dark:text-red-300 text-sm">
                  BPM actuel: <span className="font-bold">{currentBpm}</span> | 
                  Limites normales: {thresholds.min} - {thresholds.max} BPM
                </p>
                {currentBpm < thresholds.min && (
                  <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                    ⬇️ Le rythme cardiaque est trop bas (bradycardie)
                  </p>
                )}
                {currentBpm > thresholds.max && (
                  <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                    ⬆️ Le rythme cardiaque est trop élevé (tachycardie)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== CONTRÔLE DE SESSION ==================== */}
        <Card className="mb-6 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  isSessionActive 
                    ? 'bg-green-100 dark:bg-green-900' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {isSessionActive ? (
                    <Heart className="h-6 w-6 text-green-600 dark:text-green-400 animate-pulse" />
                  ) : (
                    <Heart className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Session de monitoring cardiaque</h3>
                  {isSessionActive && activeActivityId ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        ✅ Activité en cours : {patient.activities.find(a => a.id === activeActivityId)?.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Session ID: {sessionId} | Temps écoulé: {formatTime(activityTimer)}
                      </p>
                    </>
                  ) : isSessionActive ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        ✅ Session libre active (ID: {sessionId})
                      </p>
                      {heartRateData.length === 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          📡 En attente des données du capteur...
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      ⭕ Aucune session active - Démarrez une activité ci-dessous ou une session libre
                    </p>
                  )}
                </div>
              </div>
              
              {!isSessionActive ? (
                <Button 
                  onClick={startSession} 
                  size="lg"
                  className="gap-2 px-6"
                  disabled={connectionStatus !== 'connected'}
                >
                  <Play className="h-5 w-5" />
                  Session libre
                </Button>
              ) : (
                <Button 
                  onClick={activeActivityId ? stopActivity : stopSession} 
                  variant="destructive" 
                  size="lg"
                  className="gap-2 px-6"
                >
                  <Square className="h-5 w-5" />
                  {activeActivityId ? 'Arrêter l\'activité' : 'Arrêter la session'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ==================== STATISTIQUES ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="BPM Actuel"
            value={currentBpm || '--'}
            icon={Heart}
            subtitle={
              !isSessionActive 
                ? "Session inactive" 
                : isOutOfRange 
                ? "⚠️ HORS LIMITES!" 
                : "Normal"
            }
            trend={isOutOfRange ? 'down' : 'neutral'}
          />
          <StatsCard
            title="BPM Moyen"
            value={avgBpm || '--'}
            icon={Activity}
            subtitle="Dernière minute"
          />
          <StatsCard
            title="BPM Minimum"
            value={minBpm || '--'}
            icon={Heart}
            subtitle="Dernière minute"
          />
          <StatsCard
            title="BPM Maximum"
            value={maxBpm || '--'}
            icon={Heart}
            subtitle="Dernière minute"
          />
        </div>

        {/* ==================== GRAPHIQUES ET INFORMATIONS ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <HeartRateChart 
              data={heartRateData} 
              minThreshold={patient.minThreshold}
              maxThreshold={patient.maxThreshold}
              showThresholds
            />
            
            <PPGWaveform data={ppgData} />
          </div>

          <div className="space-y-6">
            {/* ==================== SEUILS D'ALERTE ==================== */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Seuils d&apos;Alerte</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowThresholdForm(!showThresholdForm)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {showThresholdForm ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="min">Seuil Minimum (BPM)</Label>
                      <Input
                        id="min"
                        type="number"
                        value={thresholds.min}
                        onChange={(e) => setThresholds({ ...thresholds, min: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max">Seuil Maximum (BPM)</Label>
                      <Input
                        id="max"
                        type="number"
                        value={thresholds.max}
                        onChange={(e) => setThresholds({ ...thresholds, max: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <Button onClick={handleUpdateThresholds} className="w-full">
                      Enregistrer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Minimum</span>
                      <span className="text-lg font-semibold text-foreground">{thresholds.min} BPM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Maximum</span>
                      <span className="text-lg font-semibold text-foreground">{thresholds.max} BPM</span>
                    </div>
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      {isOutOfRange && currentBpm > 0 && (
                        <p className="text-red-600 dark:text-red-400 font-medium">
                          ⚠️ Valeur actuelle: {currentBpm} BPM (hors limites)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ==================== ACTIVITÉS PRESCRITES ==================== */}
            <Card>
              <CardHeader>
                <CardTitle>Activités Prescrites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.activities && patient.activities.length > 0 ? (
                  patient.activities.map(activity => {
                    const isActive = activeActivityId === activity.id;
                    
                    return (
                      <div key={activity.id} className="space-y-2">
                        <ActivityCard activity={activity} />
                        
                        {/* Timer et boutons d'action */}
                        <div className="flex items-center justify-between gap-2 pl-2">
                          {isActive && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                              <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
                              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                {formatTime(activityTimer)}
                              </span>
                              <span className="text-xs text-green-600 dark:text-green-400">
                                / {activity.duration || activity.durationInMinutes} min
                              </span>
                            </div>
                          )}
                          
                          {!isActive && !isSessionActive ? (
                            <Button
                              size="sm"
                              onClick={() => startActivity(activity)}
                              disabled={connectionStatus !== 'connected'}
                              className="gap-2"
                            >
                              <Play className="h-3 w-3" />
                              Démarrer
                            </Button>
                          ) : isActive ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={stopActivity}
                              className="gap-2"
                            >
                              <Square className="h-3 w-3" />
                              Arrêter
                            </Button>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">
                              Une autre session est en cours
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Aucune activité prescrite pour ce patient
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les activités apparaîtront ici une fois prescrites par le médecin
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
