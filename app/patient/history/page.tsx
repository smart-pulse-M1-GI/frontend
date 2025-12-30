'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeartRateChart } from '@/components/heart-rate-chart';
import { generateMockHeartRateData, mockActivities } from '@/lib/mock-data';
import { Activity } from '@/lib/types';
import { Heart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const completedActivities: Activity[] = mockActivities.slice(0, 5).map((a, i) => ({
  ...a,
  status: 'completed' as const,
  startTime: new Date(Date.now() - (i + 1) * 3600000),
  endTime: new Date(Date.now() - i * 3600000),
  averageBpm: 70 + Math.random() * 30,
  minBpm: 60 + Math.random() * 20,
  maxBpm: 90 + Math.random() * 20,
}));

export default function PatientHistory() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedActivity, setSelectedActivity] = useState('all');

  const filteredActivities = completedActivities.filter(activity => {
    if (selectedActivity !== 'all' && activity.type !== selectedActivity) return false;
    // Simple period filter (in a real app, this would be more sophisticated)
    const now = new Date();
    const activityDate = activity.startTime || now;
    switch (selectedPeriod) {
      case 'today':
        return activityDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return activityDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return activityDate >= monthAgo;
      default:
        return true;
    }
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/patient/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Historique des Activités</h1>
      </div>
      <div className="flex gap-4 mb-6">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sélectionner période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd&apos;hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedActivity} onValueChange={setSelectedActivity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sélectionner activité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les activités</SelectItem>
            <SelectItem value="rest">Repos</SelectItem>
            <SelectItem value="light">Marche légère</SelectItem>
            <SelectItem value="meditation">Méditation</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Rythme Cardiaque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HeartRateChart data={generateMockHeartRateData(100)} />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map(activity => (
            <Card key={activity.id}>
              <CardHeader>
                <CardTitle className="text-lg">{activity.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                <div className="space-y-1 text-sm">
                  <p>Durée: {activity.duration} min</p>
                  <p>BPM moyen: {activity.averageBpm?.toFixed(0)}</p>
                  <p>Min: {activity.minBpm?.toFixed(0)} - Max: {activity.maxBpm?.toFixed(0)}</p>
                  <p>Début: {activity.startTime?.toLocaleTimeString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
