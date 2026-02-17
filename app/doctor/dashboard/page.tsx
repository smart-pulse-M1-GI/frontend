'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PatientCard } from '@/components/patient-card';
import { StatsCard } from '@/components/stats-card';
import { NotificationsPanel } from '@/components/notifications-panel';
import { Patient } from '@/lib/types';
import { Heart, Users, AlertCircle, Activity, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DoctorDashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [doctorId, setDoctorId] = useState('');
  
  // États pour les données temps réel
  const [patientsWithStatus, setPatientsWithStatus] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    mail: '',
    password: '',
    nom: '',
    prenom: '',
    dateNaissance: '',
  });

  // Récupérer le token JWT
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Headers avec authentification
  const getHeaders = () => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // Récupérer les infos du médecin et ses patients
  useEffect(() => {
    const fetchDoctorData = async () => {
      try {
        // Récupérer le profil du médecin
        const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/me`, {
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
        setDoctorId(String(profileData.id));

        // Récupérer les patients
        const patientsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/my-patients`, {
          headers: getHeaders(),
        });

        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          setPatients(patientsData);
          
          // Enrichir avec les données temps réel
          await enrichPatientsWithRealtimeData(patientsData);
        }
      } catch (err) {
        console.error(err);
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, []);

  // Enrichir les patients avec les données temps réel (seuils, BPM actuel, etc.)
  const enrichPatientsWithRealtimeData = async (patientsData: any[]) => {
    const enrichedPatients = await Promise.all(
      patientsData.map(async (patient) => {
        try {
          // Récupérer les seuils
          const thresholdsRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/thresholds/patient/${patient.id}`,
            { headers: getHeaders() }
          );

          let thresholds = { bpmMin: 60, bpmMax: 100 };
          if (thresholdsRes.ok) {
            thresholds = await thresholdsRes.json();
          }

          // Récupérer la session active
          const sessionsRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cardiac/patient/${patient.id}/sessions`,
            { headers: getHeaders() }
          );

          let currentBpm = null;
          let isActive = false;
          
          if (sessionsRes.ok) {
            const sessions = await sessionsRes.json();
            const activeSession = sessions.find((s: any) => !s.endTime);
            
            if (activeSession) {
              isActive = true;
              // Récupérer les dernières données
              const dataRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cardiac/session/${activeSession.id}/data`,
                { headers: getHeaders() }
              );
              
              if (dataRes.ok) {
                const data = await dataRes.json();
                if (data.length > 0) {
                  currentBpm = data[data.length - 1].bpm;
                }
              }
            }
          }

          // Déterminer le statut
          let status = 'normal';
          if (currentBpm !== null && isActive) {
            if (currentBpm < thresholds.bpmMin || currentBpm > thresholds.bpmMax) {
              status = 'alert'; // Alerte active
            } else if (
              Math.abs(currentBpm - thresholds.bpmMin) <= 2 ||
              Math.abs(currentBpm - thresholds.bpmMax) <= 2
            ) {
              status = 'warning'; // Avertissement
            }
          }

          return {
            ...patient,
            currentBpm,
            isActive,
            minThreshold: thresholds.bpmMin,
            maxThreshold: thresholds.bpmMax,
            status,
          };
        } catch (err) {
          console.error('Erreur enrichissement patient:', patient.id, err);
          return {
            ...patient,
            currentBpm: null,
            isActive: false,
            minThreshold: 60,
            maxThreshold: 100,
            status: 'normal',
          };
        }
      })
    );

    setPatientsWithStatus(enrichedPatients);
  };

  // Rafraîchir les données toutes les 10 secondes
  useEffect(() => {
    if (patients.length === 0) return;

    const interval = setInterval(() => {
      enrichPatientsWithRealtimeData(patients);
    }, 10000);

    return () => clearInterval(interval);
  }, [patients]);

  // Enregistrer un nouveau patient
  const handleSubmitPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          medecinId: parseInt(doctorId),
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || 'Erreur lors de l\'enregistrement');
      }

      // Recharger la liste des patients
      const patientsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/my-patients`, {
        headers: getHeaders(),
      });

      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData);
      }

      // Réinitialiser le formulaire
      setFormData({
        mail: '',
        password: '',
        nom: '',
        prenom: '',
        dateNaissance: '',
      });
      setShowAddPatient(false);
      alert('Patient enregistré avec succès !');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible d\'enregistrer le patient');
      alert('Erreur: ' + (err.message || 'Impossible d\'enregistrer le patient'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalPatients = patientsWithStatus.length;
  const alertPatients = patientsWithStatus.filter((p: any) => p.status === 'alert').length;

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
              <NotificationsPanel 
                userId={doctorId} 
                token={getToken() || ''} 
              />
              <Button variant="outline" asChild>
                <Link href="/doctor/activities">
                  <Activity className="h-4 w-4 mr-2" />
                  Gérer les activités
                </Link>
              </Button>
              <Button onClick={() => {
                localStorage.removeItem('token');
                router.push('/login');
              }}>
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatsCard
            title="Total Patients"
            value={totalPatients}
            icon={Users}
            subtitle="Sous surveillance"
          />
          <StatsCard
            title="Alertes Actives"
            value={alertPatients}
            icon={AlertCircle}
            subtitle={`${alertPatients} patient${alertPatients > 1 ? 's' : ''} hors limites`}
            trend={alertPatients > 0 ? 'down' : 'neutral'}
          />
          <StatsCard
            title="Patients En Ligne"
            value={patientsWithStatus.filter(p => p.isActive).length}
            icon={Heart}
            subtitle="Sessions actives"
            trend="neutral"
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Alertes Actives
            {alertPatients > 0 && (
              <span className="ml-3 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                {alertPatients} patient{alertPatients > 1 ? 's' : ''} en alerte
              </span>
            )}
          </h2>
          <Button onClick={() => setShowAddPatient(true)} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un patient
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Aucun patient enregistré</p>
            <Button onClick={() => setShowAddPatient(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter votre premier patient
            </Button>
          </div>
        ) : (
          <>
            {/* Section Alertes Actives */}
            {alertPatients > 0 ? (
              <div className="mb-8">
                <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="h-6 w-6 text-red-600 animate-pulse" />
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                      ⚠️ Patients en alerte - Intervention requise
                    </h3>
                  </div>
                  <p className="text-red-700 dark:text-red-300 text-sm">
                    {alertPatients} patient{alertPatients > 1 ? 's ont' : ' a'} dépassé les seuils de fréquence cardiaque. 
                    Vérifiez leur état immédiatement.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  {patientsWithStatus
                    .filter((p: any) => p.status === 'alert')
                    .map((patient: any) => (
                      <PatientCard key={patient.id} patient={patient} role="doctor" />
                    ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6 mb-8 text-center">
                <Heart className="h-12 w-12 mx-auto mb-3 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  ✅ Aucune alerte active
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Tous vos patients sont dans les limites normales ou ne sont pas en session active.
                </p>
              </div>
            )}

            {/* Section Tous les Patients */}
            <div className="border-t pt-8">
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                Tous les patients ({totalPatients})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {patientsWithStatus.map((patient: any) => (
                  <PatientCard key={patient.id} patient={patient} role="doctor" />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal d'ajout de patient */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enregistrer un Nouveau Patient</DialogTitle>
            <DialogDescription>
              Remplissez les informations du patient. Il recevra un email avec ses identifiants.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPatient} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  placeholder="Dupont"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                  placeholder="Jean"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail">Email *</Label>
              <Input
                id="mail"
                type="email"
                value={formData.mail}
                onChange={(e) => setFormData({ ...formData, mail: e.target.value })}
                required
                placeholder="patient@exemple.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                placeholder="Minimum 6 caractères"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateNaissance">Date de naissance *</Label>
              <Input
                id="dateNaissance"
                type="date"
                value={formData.dateNaissance}
                onChange={(e) => setFormData({ ...formData, dateNaissance: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer le patient
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddPatient(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}