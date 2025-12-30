'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PatientCard } from '@/components/patient-card';
import { AlertBanner } from '@/components/alert-banner';
import { StatsCard } from '@/components/stats-card';
import { mockPatients, mockAlerts } from '@/lib/mock-data';
import { Patient, Alert } from '@/lib/types';
import { Heart, Users, AlertCircle, Activity, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

  useEffect(() => {
    const interval = setInterval(() => {
      setPatients(prev => prev.map(p => ({
        ...p,
        currentBpm: p.currentBpm + (Math.random() - 0.5) * 3,
        lastUpdate: new Date(),
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const totalPatients = patients.length;
  const criticalPatients = patients.filter(p => p.status === 'critical').length;
  const warningPatients = patients.filter(p => p.status === 'warning').length;
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
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
                <p className="text-sm text-muted-foreground">Dashboard Médecin</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/doctor/activities">
                  <Activity className="h-4 w-4 mr-2" />
                  Gérer les activités
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Patients"
            value={totalPatients}
            icon={Users}
            subtitle="Sous surveillance"
          />
          <StatsCard
            title="Alertes Actives"
            value={activeAlerts}
            icon={AlertCircle}
            subtitle={`${activeAlerts} non traitées`}
            trend={activeAlerts > 0 ? 'up' : 'neutral'}
          />
          <StatsCard
            title="Patients Critiques"
            value={criticalPatients}
            icon={Heart}
            subtitle="Attention requise"
            trend={criticalPatients > 0 ? 'down' : 'neutral'}
          />
          <StatsCard
            title="Avertissements"
            value={warningPatients}
            icon={Activity}
            subtitle="Surveillance accrue"
            trend={warningPatients > 0 ? 'down' : 'neutral'}
          />
        </div>

        {alerts.filter(a => !a.acknowledged).length > 0 && (
          <div className="mb-8 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Alertes en Temps Réel
            </h2>
            {alerts.filter(a => !a.acknowledged).map(alert => (
              <AlertBanner 
                key={alert.id} 
                alert={alert} 
                onDismiss={() => handleDismissAlert(alert.id)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Liste des Patients</h2>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un patient
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {patients.map(patient => (
            <PatientCard key={patient.id} patient={patient} role="doctor" />
          ))}
        </div>
      </main>
    </div>
  );
}
