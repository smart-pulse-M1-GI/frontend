'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HeartRateChart } from '@/components/heart-rate-chart';
import { ActivityCard } from '@/components/activity-card';
import { StatsCard } from '@/components/stats-card';
import { Badge } from '@/components/ui/badge';
import { Activity, HeartRateData } from '@/lib/types';
import { Heart, Clock, TrendingUp, ActivityIcon, Loader2, LogOut, Play, Square, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export default function PatientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Données du patient
  const [patientId, setPatientId] = useState('');
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [minThreshold, setMinThreshold] = useState(60);
  const [maxThreshold, setMaxThreshold] = useState(100);
  
  // Données temps réel
  const [heartRateData, setHeartRateData] = useState<HeartRateData[]>([]);
  const [currentBpm, setCurrentBpm] = useState(0);
  
  // Activités
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);

  // Session libre
  const [isFreeSessionActive, setIsFreeSessionActive] = useState(false);
  const [freeSessionId, setFreeSessionId] = useState<number | null>(null);

  // WebSocket et états de connexion
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [stompClient, setStompClient] = useState<Client | null>(null);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const getHeaders = () => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  // Charger les infos du patient au démarrage
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) throw new Error('API URL non configurée');

        const profileRes = await fetch(`${apiUrl}/api/user/me`, {
          headers: getHeaders(),
        });

        if (!profileRes.ok) {
          if (profileRes.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Erreur lors de la récupération du profil');
        }

        const profileData = await profileRes.json();
        setPatientId(String(profileData.id || profileData.UserId));
        setPatientInfo(profileData);

        // Récupérer les seuils BPM
        try {
          const thresholdsRes = await fetch(`${apiUrl}/api/v1/thresholds/patient/${profileData.id}`, {
            headers: getHeaders(),
          });

          if (thresholdsRes.ok) {
            const thresholds = await thresholdsRes.json();
            setMinThreshold(thresholds.bpmMin || 60);
            setMaxThreshold(thresholds.bpmMax || 100);
          }
        } catch (err) {
          console.log('Seuils non trouvés, valeurs par défaut');
        }

        // Récupérer les activités
        try {
          const activitiesRes = await fetch(`${apiUrl}/api/v1/activities/patient/${profileData.id}`, {
            headers: getHeaders(),
          });

          if (activitiesRes.ok) {
            const activitiesData = await activitiesRes.json();
            setActivities(Array.isArray(activitiesData) ? activitiesData : []);
          }
        } catch (err) {
          console.log('Aucune activité trouvée');
          setActivities([]);
        }

        initializeChartData();
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur de connexion';
        console.error('[Patient Dashboard] Error:', errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [router]);

  // Initialiser les données du graphique
  const initializeChartData = () => {
    const now = new Date();
    const initialData: HeartRateData[] = [];
    for (let i = 59; i >= 0; i--) {
      initialData.push({
        timestamp: new Date(now.getTime() - i * 1000),
        bpm: 70 + (Math.random() - 0.5) * 10,
      });
    }
    setHeartRateData(initialData);
    setCurrentBpm(Math.round(initialData[initialData.length - 1].bpm));
  };

  // ==================== CONFIGURATION WEBSOCKET ====================
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL; // ✅ Garde http://
    if (!apiUrl || !patientId) return;

    console.log('🔌 Initialisation WebSocket pour patient:', patientId);
    setConnectionStatus('connecting');

    const client = new Client({
      webSocketFactory: () => new SockJS(`${apiUrl}/ws-cardiac`), // ✅ SockJS gère le protocole
      debug: (str) => console.log('[STOMP]', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('✅ WebSocket connecté');
        setConnectionStatus('connected');
        
        client.subscribe('/topic/pulse', (message) => {
          if (message.body) {
            const data = JSON.parse(message.body);
            const newBpm = Math.round(parseFloat(data.bpm));
            
            console.log('📊 Données BPM reçues:', newBpm);
            setCurrentBpm(newBpm);
            
            setHeartRateData(prev => {
              const newData = [...prev.slice(-59)];
              newData.push({
                timestamp: new Date(),
                bpm: newBpm,
              });
              return newData;
            });
          }
        });
      },
      onStompError: (frame) => {
        console.error('❌ Erreur STOMP:', frame);
        setConnectionStatus('disconnected');
      },
      onWebSocketClose: () => {
        console.log('🔌 WebSocket fermé');
        setConnectionStatus('disconnected');
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      console.log('🧹 Nettoyage WebSocket');
      if (client.active) {
        client.deactivate();
      }
    };
  }, [patientId]);

  // Démarrer une activité
  const handleStartActivity = async (activity: Activity) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;

      console.log('🏃 Démarrage de l\'activité:', activity.title);

      const res = await fetch(`${apiUrl}/api/v1/activities/start-activity`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          patientId: patientId,
          activityId: activity.id,
        }),
      });

      if (!res.ok) throw new Error('Impossible de démarrer l\'activité');

      const sessionId = await res.json();
      setActiveSessionId(sessionId);
      setActiveActivity(activity);
      setTimer(0);

      console.log('✅ Activité démarrée! Session ID:', sessionId);

      // Mettre à jour l'état localement
      setActivities(prev => prev.map(a =>
        a.id === activity.id ? { ...a, status: 'active' as const } : a
      ));

    } catch (err) {
      console.error('[Start Activity] Error:', err);
      setError('Impossible de démarrer l\'activité');
    }
  };

  // Démarrer une session libre
  const handleStartFreeSession = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl || !patientId) return;

      console.log('▶️  Démarrage de session libre pour patient:', patientId);

      const res = await fetch(`${apiUrl}/api/v1/cardiac/start`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          patientId: patientId,
        }),
      });

      if (!res.ok) throw new Error('Impossible de démarrer la session libre');

      const sessionId = await res.json();
      setFreeSessionId(sessionId);
      setIsFreeSessionActive(true);
      setTimer(0);

      console.log('✅ Session libre démarrée! Session ID:', sessionId);

    } catch (err) {
      console.error('[Start Free Session] Error:', err);
      setError('Impossible de démarrer la session libre');
    }
  };

  // Arrêter la session libre
  const handleStopFreeSession = async () => {
    if (!freeSessionId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;

      console.log('⏹️  Arrêt de la session libre');

      const res = await fetch(`${apiUrl}/api/v1/cardiac/stop`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error('Impossible d\'arrêter la session libre');

      console.log('✅ Session libre terminée');

      setIsFreeSessionActive(false);
      setFreeSessionId(null);
      setTimer(0);

    } catch (err) {
      console.error('[Stop Free Session] Error:', err);
      setError('Erreur lors de l\'arrêt de la session libre');
    }
  };

  // Arrêter une activité
  const handleStopActivity = useCallback(async () => {
    if (!activeActivity || !activeSessionId) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;

      console.log('⏹️  Arrêt de l\'activité');

      const res = await fetch(`${apiUrl}/api/v1/cardiac/stop`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error('Impossible d\'arrêter l\'activité');

      console.log('✅ Activité terminée');

      // Mettre à jour l'état localement
      setActivities(prev => prev.map(a =>
        a.id === activeActivity.id ? { 
          ...a, 
          status: 'completed' as const,
          completed: true,
        } : a
      ));

      setActiveActivity(null);
      setActiveSessionId(null);
      setTimer(0);

    } catch (err) {
      console.error('[Stop Activity] Error:', err);
      setError('Erreur lors de l\'arrêt de l\'activité');
    }
  }, [activeActivity, activeSessionId]);

  // Timer pour l'activité active ou session libre
  useEffect(() => {
    if (activeActivity || isFreeSessionActive) {
      const interval = setInterval(() => {
        setTimer(prev => {
          const newTime = prev + 1;
          // Auto-stop après la durée prévue (seulement pour les activités)
          if (activeActivity && activeActivity.durationInMinutes) {
            if (newTime >= activeActivity.durationInMinutes * 60) {
              console.log('⏰ Durée atteinte, arrêt automatique');
              handleStopActivity();
              return 0;
            }
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeActivity, isFreeSessionActive, handleStopActivity]);

  const handleLogout = () => {
    if (stompClient?.active) {
      stompClient.deactivate();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    router.push('/login');
  };

  const avgBpm = heartRateData.length > 0
    ? Math.round(heartRateData.reduce((sum, d) => sum + d.bpm, 0) / heartRateData.length)
    : 0;

  const isOutOfRange = currentBpm < minThreshold || currentBpm > maxThreshold;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold text-foreground">CardioWatch</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                  {patientInfo ? `${patientInfo.prenom} ${patientInfo.nom}` : 'Mon Dashboard'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Indicateur de connexion WebSocket */}
              <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border transition-all ${
                connectionStatus === 'connected' 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              }`}>
                {connectionStatus === 'connected' ? (
                  <Wifi className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <WifiOff className="h-3 w-3 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-xs md:text-sm font-medium hidden sm:inline ${
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
              
              <Button variant="outline" asChild size="sm" className="hidden md:flex">
                <Link href="/patient/history">Historique</Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout} size="sm">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/20 bg-destructive/10">
            <p className="text-destructive text-center">{error}</p>
          </div>
        )}

        {isOutOfRange && currentBpm > 0 && (
          <div className="mb-6 p-4 rounded-lg border-2 border-destructive bg-destructive/10 animate-pulse">
            <p className="text-destructive font-semibold text-center">
              ⚠️ Votre fréquence cardiaque est en dehors des limites normales ({minThreshold}-{maxThreshold} BPM). 
              Contactez votre médecin si les symptômes persistent.
            </p>
          </div>
        )}

        {/* ==================== CONTRÔLE DE SESSION LIBRE ==================== */}
        <Card className="mb-6 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  isFreeSessionActive || activeActivity
                    ? 'bg-green-100 dark:bg-green-900' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {isFreeSessionActive || activeActivity ? (
                    <Heart className="h-6 w-6 text-green-600 dark:text-green-400 animate-pulse" />
                  ) : (
                    <Heart className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Session de monitoring cardiaque</h3>
                  {activeActivity ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        ✅ Activité en cours : {activeActivity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Session ID: {activeSessionId} | Temps écoulé: {formatTime(timer)}
                      </p>
                    </>
                  ) : isFreeSessionActive ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        ✅ Session libre active (ID: {freeSessionId})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Temps écoulé: {formatTime(timer)}
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
              
              {!isFreeSessionActive && !activeActivity ? (
                <Button 
                  onClick={handleStartFreeSession} 
                  size="lg"
                  className="gap-2 px-6"
                  disabled={connectionStatus !== 'connected'}
                >
                  <Play className="h-5 w-5" />
                  Session libre
                </Button>
              ) : isFreeSessionActive ? (
                <Button 
                  onClick={handleStopFreeSession} 
                  variant="destructive" 
                  size="lg"
                  className="gap-2 px-6"
                >
                  <Square className="h-5 w-5" />
                  Arrêter la session
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* ==================== ACTIVITÉ EN COURS - GRANDE CARTE ==================== */}
        {activeActivity && (
          <Card className="mb-6 border-2 border-green-500 bg-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-green-600 dark:text-green-400 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Activité en cours</p>
                    <h3 className="text-xl font-bold text-foreground">{activeActivity.title}</h3>
                    <p className="text-sm text-muted-foreground">{activeActivity.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-green-700 dark:text-green-300">{formatTime(timer)}</p>
                  <p className="text-sm text-muted-foreground">
                    / {activeActivity.durationInMinutes} min
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStopActivity}
                    className="mt-2 gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Arrêter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        

        {/* ==================== STATISTIQUES ==================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatsCard
            title="Fréquence Actuelle"
            value={currentBpm || '--'}
            subtitle={currentBpm > 0 ? (isOutOfRange ? 'Hors limites!' : 'Normal') : 'En attente...'}
            icon={Heart}
            trend={isOutOfRange ? 'down' : 'neutral'}
          />
          <StatsCard
            title="Moyenne (1 min)"
            value={avgBpm || '--'}
            subtitle="BPM moyen"
            icon={TrendingUp}
          />
          <StatsCard
            title="Temps d'Activité"
            value={formatTime(timer)}
            subtitle={activeActivity ? activeActivity.title : isFreeSessionActive ? 'Session libre' : 'Aucune activité'}
            icon={Clock}
          />
        </div>

        {/* ==================== GRAPHIQUES ET ACTIVITÉS ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <HeartRateChart 
              data={heartRateData}
              minThreshold={minThreshold}
              maxThreshold={maxThreshold}
              showThresholds
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-semibold text-foreground">Activités Prescrites</h2>
              <Badge variant="secondary">
                <ActivityIcon className="h-3 w-3 mr-1" />
                {activities.length}
              </Badge>
            </div>
            
            {activities.length === 0 ? (
              <div className="p-6 text-center border border-dashed rounded-lg">
                <ActivityIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucune activité prescrite</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map(activity => {
                  const isActive = activeActivity?.id === activity.id;
                  
                  return (
                    <div key={activity.id} className="space-y-2">
                      <ActivityCard
                        activity={activity}
                        showActions={false}
                      />
                      
                      {/* Bouton démarrer/arrêter */}
                      <div className="flex items-center justify-between pl-2">
                        {isActive ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                            <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
                            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                              En cours
                            </span>
                          </div>
                        ) : activeActivity || isFreeSessionActive ? (
                          <div className="text-xs text-muted-foreground italic">
                            {isFreeSessionActive ? 'Session libre en cours' : 'Une activité est déjà en cours'}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleStartActivity(activity)}
                            disabled={connectionStatus !== 'connected' || activity.completed}
                            className="gap-2"
                          >
                            <Play className="h-3 w-3" />
                            Démarrer
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}