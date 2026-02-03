'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Fonction de login avec vérification backend
  const handleLogin = async (role: 'doctor' | 'patient') => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail: email, password: password }),
      });

      if (!res.ok) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const data = await res.json();

      // Stockage du JWT pour les requêtes futures
      localStorage.setItem('token', data.token);

      // Redirection selon le rôle
      if (role === 'doctor') {
        router.push('/doctor/dashboard');
      } else {
        router.push('/patient/dashboard');
      }

    } catch (err) {
      console.error(err);
      alert('Email ou mot de passe incorrect');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Smart Pulse</h1>
              <p className="text-sm text-muted-foreground">Monitoring Cardiaque LoRaWAN</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="doctor" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="doctor">Médecin</TabsTrigger>
            <TabsTrigger value="patient">Patient</TabsTrigger>
          </TabsList>

          <TabsContent value="doctor">
            <Card>
              <CardHeader>
                <CardTitle>Connexion Médecin</CardTitle>
                <CardDescription>
                  Accédez au dashboard de monitoring des patients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="doctor-email">Email</Label>
                  <Input
                    id="doctor-email"
                    type="email"
                    placeholder="medecin@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-password">Mot de passe</Label>
                  <Input
                    id="doctor-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => handleLogin('doctor')}>
                  Se connecter
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patient">
            <Card>
              <CardHeader>
                <CardTitle>Connexion Patient</CardTitle>
                <CardDescription>
                  Consultez vos données de monitoring cardiaque
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-email">Email</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    placeholder="patient@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-password">Mot de passe</Label>
                  <Input
                    id="patient-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => handleLogin('patient')}>
                  Se connecter
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Système de monitoring cardiaque sécurisé
        </p>
      </div>
    </div>
  );
}
