'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeartRateChart } from '@/components/heart-rate-chart';
import { Heart, ArrowLeft, Activity, TrendingUp, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { HeartRateData } from '@/lib/types';

interface SessionSummary {
  sessionId: number;
  averageBpm: number;
  maxBpm: number;
  minBpm: number;
  totalPoints: number;
  startTime?: string;
  endTime?: string;
  activityTitle?: string;
  activityDescription?: string;
  duration?: number;
}

interface SessionData {
  id: number;
  bpm: number;
  timestamp: string;
}

export default function PatientHistory() {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionData, setSessionData] = useState<HeartRateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState('');

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

  // Charger l'ID du patient
  useEffect(() => {
    const fetchPatientId = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) throw new Error('API URL non configurée');

        const profileRes = await fetch(`${apiUrl}/api/user/me`, {
          headers: getHeaders(),
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setPatientId(String(profileData.id || profileData.UserId));
        }
      } catch (err) {
        console.error('Erreur chargement profil:', err);
      }
    };

    fetchPatientId();
  }, []);

  // Charger les sessions du patient
  useEffect(() => {
    const fetchSessions = async () => {
      if (!patientId) return;

      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) throw new Error('API URL non configurée');

        console.log('📊 Chargement des sessions pour patient:', patientId);

        // Récupérer toutes les sessions
        const sessionsRes = await fetch(
          `${apiUrl}/api/v1/cardiac/patient/${patientId}/sessions`,
          {
            headers: getHeaders(),
          }
        );

        if (!sessionsRes.ok) {
          if (sessionsRes.status === 204) {
            console.log('Aucune session trouvée');
            setSessions([]);
            return;
          }
          throw new Error('Erreur chargement sessions');
        }

        const sessionsData = await sessionsRes.json();
        console.log('✅ Sessions chargées:', sessionsData);

        // Pour chaque session, récupérer le résumé
        const sessionsWithSummary = await Promise.all(
          sessionsData.map(async (session: any) => {
            try {
              const summaryRes = await fetch(
                `${apiUrl}/api/v1/cardiac/session/${session.id}/summary`,
                {
                  headers: getHeaders(),
                }
              );

              if (summaryRes.ok) {
                const summary = await summaryRes.json();
                return {
                  sessionId: session.id,
                  averageBpm: summary.averageBpm,
                  maxBpm: summary.maxBpm,
                  minBpm: summary.minBpm,
                  totalPoints: summary.totalPoints,
                  startTime: session.startTime,
                  endTime: session.endTime,
                  activityTitle: session.activity?.title || 'Session libre',
                  activityDescription: session.activity?.description || 'Monitoring cardiaque',
                  duration: session.activity?.durationInMinutes || 
                    Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
                };
              }
              return null;
            } catch (err) {
              console.error('Erreur chargement summary session:', session.id, err);
              return null;
            }
          })
        );

        const validSessions = sessionsWithSummary.filter(s => s !== null) as SessionSummary[];
        setSessions(validSessions);

        // Sélectionner la première session par défaut
        if (validSessions.length > 0) {
          setSelectedSession(validSessions[0].sessionId);
        }

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur de chargement';
        console.error('[History] Error:', errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [patientId]);

  // Charger les données d'une session sélectionnée
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!selectedSession) return;

      try {
        setLoadingData(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) return;

        console.log('📈 Chargement données session:', selectedSession);

        const dataRes = await fetch(
          `${apiUrl}/api/v1/cardiac/session/${selectedSession}/data`,
          {
            headers: getHeaders(),
          }
        );

        if (dataRes.ok) {
          const data: SessionData[] = await dataRes.json();
          console.log('✅ Données chargées:', data.length, 'points');

          // Transformer les données pour le graphique
          const heartRateData: HeartRateData[] = data.map(point => ({
            timestamp: new Date(point.timestamp),
            bpm: point.bpm,
          }));

          setSessionData(heartRateData);
        }
      } catch (err) {
        console.error('Erreur chargement données session:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchSessionData();
  }, [selectedSession]);

  // Filtrer les sessions par période
  const filteredSessions = sessions.filter(session => {
    if (!session.startTime) return true;

    const now = new Date();
    const sessionDate = new Date(session.startTime);

    switch (selectedPeriod) {
      case 'today':
        return sessionDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return sessionDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return sessionDate >= monthAgo;
      default:
        return true;
    }
  });

  // Formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formater la durée
  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
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
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/patient/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Historique des Activités</h1>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/20 bg-destructive/10">
            <p className="text-destructive text-center">{error}</p>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-4 mb-6">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sélectionner période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              <SelectItem value="today">Aujourd&apos;hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucune session trouvée</h3>
              <p className="text-sm text-muted-foreground">
                Commencez une activité pour voir votre historique ici
              </p>
            </CardContent>
          </Card>
        ) : (
          // Cartes des sessions uniquement
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => (
                <Card
                  key={session.sessionId}
                  className="transition-all hover:shadow-lg"
                >
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {session.activityTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {session.activityDescription}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      {/* Durée */}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Durée:</span>
                        <span>{formatDuration(session.duration)}</span>
                      </div>

                      {/* BPM Moyen */}
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">BPM moyen:</span>
                        <span className="font-semibold text-primary">
                          {Math.round(session.averageBpm)}
                        </span>
                      </div>

                      {/* Min - Max */}
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Min - Max:</span>
                        <span>
                          {Math.round(session.minBpm)} - {Math.round(session.maxBpm)}
                        </span>
                      </div>

                      {/* Points de données */}
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Points:</span>
                        <span>{session.totalPoints}</span>
                      </div>

                      {/* Date de début */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Début: {formatDate(session.startTime)}
                        </p>
                        {session.endTime && (
                          <p className="text-xs text-muted-foreground">
                            Fin: {formatDate(session.endTime)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}