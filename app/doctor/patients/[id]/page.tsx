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
import { mockPatients, mockActivities, generateMockHeartRateData, generateMockPPGData } from '@/lib/mock-data';
import { Patient, HeartRateData, PPGData } from '@/lib/types';
import { Heart, Activity, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [heartRateData, setHeartRateData] = useState<HeartRateData[]>(generateMockHeartRateData(60));
  const [ppgData, setPpgData] = useState<PPGData[]>(generateMockPPGData(30));
  const [thresholds, setThresholds] = useState({ min: 50, max: 140 });
  const [showThresholdForm, setShowThresholdForm] = useState(false);

  useEffect(() => {
    const foundPatient = mockPatients.find(p => p.id === id);
    if (foundPatient) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setPatient({
        ...foundPatient,
        activities: mockActivities.slice(0, 3).map(a => ({ ...a, status: 'scheduled' as const })),
      });
    }
  }, [id]);

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
  }, [id]);

  const handleUpdateThresholds = () => {
    if (patient) {
      setPatient({
        ...patient,
        minThreshold: thresholds.min,
        maxThreshold: thresholds.max,
      });
      setShowThresholdForm(false);
    }
  };

  if (!patient) {
    return <div>Chargement...</div>;
  }

  const currentBpm = Math.round(heartRateData[heartRateData.length - 1]?.bpm || patient.currentBpm);
  const avgBpm = Math.round(heartRateData.reduce((sum, d) => sum + d.bpm, 0) / heartRateData.length);
  const minBpm = Math.round(Math.min(...heartRateData.map(d => d.bpm)));
  const maxBpm = Math.round(Math.max(...heartRateData.map(d => d.bpm)));

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
                <h1 className="text-xl font-bold text-foreground">{patient.name}</h1>
                <p className="text-sm text-muted-foreground">{patient.medicalId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="BPM Actuel"
            value={currentBpm}
            icon={Heart}
            subtitle="En temps réel"
          />
          <StatsCard
            title="BPM Moyen"
            value={avgBpm}
            icon={Activity}
            subtitle="Dernière minute"
          />
          <StatsCard
            title="BPM Minimum"
            value={minBpm}
            icon={Heart}
            subtitle="Dernière minute"
          />
          <StatsCard
            title="BPM Maximum"
            value={maxBpm}
            icon={Heart}
            subtitle="Dernière minute"
          />
        </div>

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
                        onChange={(e) => setThresholds({ ...thresholds, min: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max">Seuil Maximum (BPM)</Label>
                      <Input
                        id="max"
                        type="number"
                        value={thresholds.max}
                        onChange={(e) => setThresholds({ ...thresholds, max: parseInt(e.target.value) })}
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
                      <span className="text-lg font-semibold text-foreground">{patient.minThreshold} BPM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Maximum</span>
                      <span className="text-lg font-semibold text-foreground">{patient.maxThreshold} BPM</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activités Prescrites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.activities.map(activity => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
