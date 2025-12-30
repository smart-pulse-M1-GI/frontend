'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HeartRateChart } from '@/components/heart-rate-chart';
import { PPGWaveform } from '@/components/ppg-waveform';
import { ActivityCard } from '@/components/activity-card';
import { StatsCard } from '@/components/stats-card';
import { Badge } from '@/components/ui/badge';
import { mockPatients, mockActivities, generateMockHeartRateData, generateMockPPGData } from '@/lib/mock-data';
import { Activity, HeartRateData, PPGData } from '@/lib/types';
import { Heart, Clock, TrendingUp, ActivityIcon } from 'lucide-react';
import Link from 'next/link';

export default function PatientDashboard() {
  const patient = mockPatients[0];
  const [heartRateData, setHeartRateData] = useState<HeartRateData[]>(generateMockHeartRateData(60));
  const [ppgData, setPpgData] = useState<PPGData[]>(generateMockPPGData(30));
  const [activities, setActivities] = useState<Activity[]>(
    mockActivities.slice(0, 3).map(a => ({ ...a, status: 'scheduled' as const }))
  );
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [timer, setTimer] = useState(0);

  const handleStartActivity = (activity: Activity) => {
    setActiveActivity(activity);
    setActivities(prev => prev.map(a => 
      a.id === activity.id ? { ...a, status: 'active' as const, startTime: new Date() } : a
    ));
    setTimer(0);
  };

  const handleStopActivity = useCallback(() => {
    if (activeActivity) {
      setActivities(prev => prev.map(a => 
        a.id === activeActivity.id ? { 
          ...a, 
          status: 'completed' as const, 
          endTime: new Date(),
          averageBpm: Math.round(heartRateData.reduce((sum, d) => sum + d.bpm, 0) / heartRateData.length)
        } : a
      ));
      setActiveActivity(null);
      setTimer(0);
    }
  }, [activeActivity, heartRateData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeartRateData(prev => {
        const newData = [...prev.slice(1)];
        const lastBpm = prev[prev.length - 1]?.bpm || 70;
        newData.push({
          timestamp: new Date(),
          bpm: lastBpm + (Math.random() - 0.5) * 5,
        });
        return newData;
      });

      setPpgData(generateMockPPGData(30));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeActivity) {
      const interval = setInterval(() => {
        setTimer(prev => {
          const newTime = prev + 1;
          if (newTime >= activeActivity.duration * 60) {
            handleStopActivity();
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeActivity, handleStopActivity]);

  const currentBpm = Math.round(heartRateData[heartRateData.length - 1]?.bpm || patient.currentBpm);
  const avgBpm = Math.round(heartRateData.reduce((sum, d) => sum + d.bpm, 0) / heartRateData.length);
  const isOutOfRange = currentBpm < patient.minThreshold || currentBpm > patient.maxThreshold;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">CardioWatch</h1>
                <p className="text-sm text-muted-foreground">Mon Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/patient/history">Historique</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Se déconnecter</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isOutOfRange && (
          <div className="mb-6 p-4 rounded-lg border-2 border-destructive bg-destructive/10 animate-pulse">
            <p className="text-destructive font-semibold text-center">
              ⚠️ Votre fréquence cardiaque est en dehors des limites normales. Contactez votre médecin si les symptômes persistent.
            </p>
          </div>
        )}

        {activeActivity && (
          <div className="mb-6 p-6 rounded-lg border-2 border-success bg-success/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Activité en cours</p>
                <h3 className="text-xl font-bold text-foreground">{activeActivity.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-success">{formatTime(timer)}</p>
                <p className="text-sm text-muted-foreground">
                  / {activeActivity.duration} min
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatsCard
            title="Fréquence Actuelle"
            value={currentBpm}
            subtitle={isOutOfRange ? 'Hors limites!' : 'Normal'}
            icon={Heart}
            trend={isOutOfRange ? 'down' : 'neutral'}
          />
          <StatsCard
            title="Moyenne (1 min)"
            value={avgBpm}
            subtitle="BPM moyen"
            icon={TrendingUp}
          />
          <StatsCard
            title="Temps d'Activité"
            value={formatTime(timer)}
            subtitle={activeActivity ? activeActivity.name : 'Aucune activité'}
            icon={Clock}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <HeartRateChart 
              data={heartRateData}
              minThreshold={patient.minThreshold}
              maxThreshold={patient.maxThreshold}
              showThresholds
            />
            <PPGWaveform data={ppgData} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Activités Prescrites</h2>
              <Badge variant="secondary">
                <ActivityIcon className="h-3 w-3 mr-1" />
                {activities.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {activities.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  showActions
                  onStart={() => handleStartActivity(activity)}
                  onStop={handleStopActivity}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
