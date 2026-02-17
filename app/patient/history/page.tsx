'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ArrowLeft, Activity, TrendingUp, Clock, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';

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

export default function PatientHistory() {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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

  // Réinitialiser la page quand on change de filtre
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPeriod]);

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/patient/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Historique des Activités</h1>
              <p className="text-sm text-muted-foreground">
                {filteredSessions.length} session{filteredSessions.length > 1 ? 's' : ''} trouvée{filteredSessions.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {/* Badge du nombre total */}
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Activity className="h-4 w-4 mr-2" />
            {sessions.length} session{sessions.length > 1 ? 's' : ''} au total
          </Badge>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/20 bg-destructive/10">
            <p className="text-destructive text-center">{error}</p>
          </div>
        )}

        {/* Filtres - Plus visibles */}
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle>Filtrer par période</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant={selectedPeriod === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod('all')}
                className="w-full"
              >
                Toutes
              </Button>
              <Button
                variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod('today')}
                className="w-full"
              >
                Aujourd&apos;hui
              </Button>
              <Button
                variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod('week')}
                className="w-full"
              >
                Cette semaine
              </Button>
              <Button
                variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod('month')}
                className="w-full"
              >
                Ce mois
              </Button>
            </div>
          </CardContent>
        </Card>

        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Aucune session trouvée</h3>
              <p className="text-sm text-muted-foreground">
                {selectedPeriod === 'all' 
                  ? 'Commencez une activité pour voir votre historique ici'
                  : 'Aucune session pour cette période. Essayez un autre filtre.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cartes des sessions paginées */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
              {paginatedSessions.map((session) => (
                <Card
                  key={session.sessionId}
                  className="transition-all hover:shadow-lg hover:border-primary/50"
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{session.activityTitle}</span>
                      <Badge variant="outline" className="ml-2">
                        #{session.sessionId}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {session.activityDescription}
                    </p>
                    
                    <div className="space-y-3 text-sm">
                      {/* Durée */}
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Durée</span>
                        </div>
                        <span className="font-semibold">{formatDuration(session.duration)}</span>
                      </div>

                      {/* BPM Moyen */}
                      <div className="flex items-center justify-between p-2 bg-primary/5 rounded">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-primary" />
                          <span className="font-medium">BPM moyen</span>
                        </div>
                        <span className="font-bold text-primary text-lg">
                          {Math.round(session.averageBpm)}
                        </span>
                      </div>

                      {/* Min - Max */}
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Min - Max</span>
                        </div>
                        <span className="font-semibold">
                          {Math.round(session.minBpm)} - {Math.round(session.maxBpm)}
                        </span>
                      </div>

                      {/* Points de données */}
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Points</span>
                        </div>
                        <span className="font-semibold">{session.totalPoints}</span>
                      </div>

                      {/* Date de début */}
                      <div className="pt-3 border-t space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="font-medium">Début:</span>
                          <span>{formatDate(session.startTime)}</span>
                        </p>
                        {session.endTime && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="font-medium">Fin:</span>
                            <span>{formatDate(session.endTime)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} sur {totalPages} 
                      <span className="ml-2">
                        ({startIndex + 1}-{Math.min(endIndex, filteredSessions.length)} sur {filteredSessions.length})
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Précédent
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}