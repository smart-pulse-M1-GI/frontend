import { Patient } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Activity } from 'lucide-react';
import Link from 'next/link';

interface PatientCardProps {
  patient: Patient;
  role: 'doctor' | 'patient';
}

export function PatientCard({ patient, role }: PatientCardProps) {
  const statusColors = {
    normal: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    critical: 'bg-destructive text-destructive-foreground',
  };

  const statusLabels = {
    normal: 'Normal',
    warning: 'Attention',
    critical: 'Critique',
  };

  return (
    <Link href={role === 'doctor' ? `/doctor/patients/${patient.id}` : '#'}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg text-foreground">{patient.name}</h3>
              <p className="text-sm text-muted-foreground">{patient.medicalId}</p>
              <p className="text-xs text-muted-foreground">{patient.age} ans • {patient.gender === 'male' ? 'Homme' : 'Femme'}</p>
            </div>
            <Badge className={statusColors[patient.status]}>
              {statusLabels[patient.status]}
            </Badge>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{patient.currentBpm}</p>
                <p className="text-xs text-muted-foreground">BPM</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <div>
                <p className="text-xs">Seuils: {patient.minThreshold}-{patient.maxThreshold} BPM</p>
                <p className="text-xs">Mis à jour: {patient.lastUpdate.toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
