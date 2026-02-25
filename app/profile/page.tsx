'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, ArrowLeft, Loader2, Save, LogOut, Key } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  UserId: number;
  mail: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  role: string;
  specialite?: string;
  medecinId?: number;
  id: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
    specialite: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);

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
      'Authorization': `Bearer ${token}`,
    };
  };

  // Charger le profil utilisateur
  useEffect(() => {
    const fetchProfile = async () => {
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
        setProfile(data);
        setFormData({
          nom: data.nom || '',
          prenom: data.prenom || '',
          dateNaissance: data.dateNaissance || '',
          specialite: data.specialite || '',
        });
      } catch (err) {
        console.error(err);
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  // Changer le mot de passe (fonction séparée car pas dans l'API actuelle)
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Note: Cet endpoint n'existe pas dans votre API actuelle
      // Il faudrait l'ajouter côté backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/user/change-password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors du changement de mot de passe');
      }

      setSuccess('Mot de passe modifié avec succès !');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du changement de mot de passe. Vérifiez votre mot de passe actuel.');
    } finally {
      setSaving(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error('API URL non configurée');

      const res = await fetch(`${apiUrl}/api/user/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const updatedProfile = await res.json();
      setProfile(updatedProfile);
      setSuccess('Profil mis à jour avec succès !');
      
      // Mettre à jour le localStorage
      if (typeof window !== 'undefined') {
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          localStorage.setItem('user', JSON.stringify({
            ...userData,
            ...updatedProfile
          }));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    router.push('/login');
  };

  const getDashboardLink = () => {
    if (profile?.role === 'MEDECIN') {
      return '/doctor/dashboard';
    } else {
      return '/patient/dashboard';
    }
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
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold text-foreground">Smart Pulse</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Mon Profil</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="outline" asChild size="sm">
                <Link href={getDashboardLink()}>
                  <ArrowLeft className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline ml-2">Retour</span>
                </Link>
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="sm">
                <LogOut className="h-4 w-4 flex-shrink-0" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8 max-w-2xl">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Informations Personnelles
              {profile?.role === 'MEDECIN' && (
                <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">Médecin</span>
              )}
              {profile?.role === 'PATIENT' && (
                <span className="text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">Patient</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.mail || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Votre nom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    placeholder="Votre prénom"
                  />
                </div>
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

              {profile?.role === 'MEDECIN' && (
                <div className="space-y-2">
                  <Label htmlFor="specialite">Spécialité</Label>
                  <Input
                    id="specialite"
                    value={formData.specialite}
                    onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                    placeholder="Ex: Cardiologue, Médecin généraliste..."
                  />
                </div>
              )}

              {profile?.role === 'PATIENT' && profile?.medecinId && (
                <div className="space-y-2">
                  <Label>Médecin assigné</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Médecin ID: {profile.medecinId}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Section Changement de mot de passe */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mot de passe</p>
                  <p className="text-sm text-muted-foreground">
                    Dernière modification : Non disponible
                  </p>
                </div>
                <Button 
                  onClick={() => setShowPasswordForm(true)}
                  variant="outline"
                  size="sm"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Changer
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mot de passe actuel *</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    placeholder="Votre mot de passe actuel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Minimum 6 caractères"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Répétez le nouveau mot de passe"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={saving} size="sm">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Modification...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Modifier le mot de passe
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setError('');
                    }}
                    disabled={saving}
                    size="sm"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}