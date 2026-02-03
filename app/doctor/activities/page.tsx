'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ActivityCard } from '@/components/activity-card';
import { Activity as ActivityType } from '@/lib/types';
import { Heart, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DoctorPatient {
  id: number;
  nom: string;
  prenom: string;
  mail: string;
  dateNaissance: string;
}

export default function ActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doctorId, setDoctorId] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    patientId: '',
    durationInMinutes: 30,
  });

  // Récupérer le token JWT
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Headers avec authentification
  const getHeaders = useCallback(() => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // Récupérer la liste des patients du médecin
  const fetchPatients = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;

      const res = await fetch(`${apiUrl}/api/user/my-patients`, {
        headers: getHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erreur récupération patients:', err);
      setPatients([]);
    }
  }, [getHeaders]);

  // Récupérer les activités du médecin
  const fetchActivities = useCallback(async (docId: string) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/v1/activities/doctor/${docId}`, {
        headers: getHeaders(),
      });

      // 1. Vérification du type de contenu avant toute chose
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await res.text();
        console.error("ERREUR SERVEUR (Contenu non-JSON) :", textError.slice(0, 500));
        setError("Le serveur a renvoyé du HTML au lieu de données. Vérifiez votre API.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      
      // 2. Mapping robuste des colonnes MySQL
      const sanitizedData = Array.isArray(data) ? data.map(act => ({
        ...act,
        id: act.id,
        doctorId: act.doctor_id || act.doctorId,
        patientId: act.patient_id || act.patientId,
        durationInMinutes: Number(act.duration_in_minutes || act.durationInMinutes) || 0,
        completed: act.completed === 1 || act.completed === true || act.completed?.data?.[0] === 1
      })) : [];
      
      setActivities(sanitizedData);
      setError('');
    } catch (err) {
      console.error("Crash lors de la lecture :", err);
      setError('Erreur de format de données');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Récupérer les infos du médecin connecté
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) throw new Error('API URL non configurée');

        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`${apiUrl}/api/user/me`, {
          headers: getHeaders(),
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Erreur lors de la récupération du profil');
        }

        const data = await res.json();
        const docId = String(data.id || data.UserId);
        setDoctorId(docId);
        
        // Charger les patients et activités
        await fetchPatients();
        await fetchActivities(docId);
      } catch (err) {
        console.error(err);
        setError('Erreur de connexion');
      }
    };

    fetchDoctorInfo();
  }, [fetchActivities, fetchPatients, getHeaders, router]);

  // Créer une nouvelle activité
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Protection contre le NaN sur la durée
    const duration = parseInt(String(formData.durationInMinutes), 10) || 0;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/v1/activities/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          patientId: formData.patientId,
          doctorId: doctorId,
          durationInMinutes: duration, // S'assure que c'est un nombre propre
        }),
      });

      if (!res.ok) throw new Error('Erreur création');

      const newActivity = await res.json();
      // On rafraîchit la liste complète pour être sûr d'avoir les bonnes données
      await fetchActivities(doctorId);
      
      setFormData({ title: '', description: '', patientId: '', durationInMinutes: 30 });
      setShowForm(false);
    } catch (err) {
      setError('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour une activité
  const handleUpdate = async (activityId: string | number, updates: Partial<ActivityType>) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;

      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      const res = await fetch(`${apiUrl}/api/v1/activities/${activityId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          title: updates.title || activity.title,
          description: updates.description || activity.description,
          patientId: activity.patientId,
          doctorId: activity.doctorId,
          durationInMinutes: updates.durationInMinutes || activity.durationInMinutes,
        }),
      });

      if (res.ok) {
        const updatedActivity = await res.json();
        setActivities(activities.map(a => a.id === activityId ? updatedActivity : a));
        alert('Activité mise à jour avec succès');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour');
    }
  };

  // Clôturer une activité
  const handleClose = async (activityId: string | number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;

      const res = await fetch(`${apiUrl}/api/v1/activities/${activityId}/close`, {
        method: 'PATCH',
        headers: getHeaders(),
      });

      if (res.ok) {
        setActivities(activities.map(a => 
          a.id === activityId ? { ...a, completed: true } : a
        ));
        alert('Activité clôturée avec succès');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la clôture');
    }
  };

  // Supprimer une activité
  const handleDelete = async (activityId: string | number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;

      const res = await fetch(`${apiUrl}/api/v1/activities/${activityId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        setActivities(activities.filter(a => a.id !== activityId));
        alert('Activité supprimée avec succès');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    router.push('/login');
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
                <p className="text-sm text-muted-foreground">Gestion des Activités</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/doctor/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au dashboard
                </Link>
              </Button>
              <Button onClick={handleLogout}>
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Activités Médicales
            {!loading && <span className="text-muted-foreground ml-2">({activities.length})</span>}
          </h2>
          <Button onClick={() => setShowForm(!showForm)} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Créer une activité
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Nouvelle Activité</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient">Patient *</Label>
                  <Select
                    value={formData.patientId}
                    onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Aucun patient disponible
                        </SelectItem>
                      ) : (
                        patients.map(patient => (
                          <SelectItem key={patient.id} value={String(patient.id)}>
                            {patient.prenom} {patient.nom}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Titre de l'activité *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Marche rapide"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Ex: 30 minutes de marche rapide par jour"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Durée recommandée (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="180"
                    value={formData.durationInMinutes}
                    onChange={(e) => setFormData({ ...formData, durationInMinutes: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Créer l'activité
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading && !showForm ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Aucune activité créée pour le moment</p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer votre première activité
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map(activity => (
              <ActivityCard 
                key={activity.id} 
                activity={activity}
                onUpdate={handleUpdate}
                onClose={handleClose}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}