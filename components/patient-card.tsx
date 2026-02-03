import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Activity, User, Mail } from 'lucide-react';
import Link from 'next/link';

interface Patient {
  id: number;
  UserId?: number;
  mail: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  role: string;
  medecinId?: number;
  currentBpm?: number;
  status?: 'normal' | 'warning' | 'critical';
  lastUpdate?: Date | string;
  minThreshold?: number;
  maxThreshold?: number;
}

interface PatientCardProps {
  patient: Patient;
  role: 'doctor' | 'patient';
}

export function PatientCard({ patient, role }: PatientCardProps) {
  const statusColors = {
    normal: 'bg-green-500/10 text-green-700 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    critical: 'bg-red-500/10 text-red-700 border-red-500/20',
  };

  const statusLabels = {
    normal: 'Normal',
    warning: 'Attention',
    critical: 'Critique',
  };

  // Calculer l'âge à partir de la date de naissance
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const age = calculateAge(patient.dateNaissance);
  const patientName = `${patient.prenom} ${patient.nom}`;
  const patientStatus = patient.status || 'normal';

  return (
    <Link href={role === 'doctor' ? `/doctor/patients/${patient.id}` : '#'}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">{patientName}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {patient.mail}
                </p>
                <p className="text-xs text-muted-foreground">
                  {age} ans • ID: {patient.id}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={statusColors[patientStatus]}>
              {statusLabels[patientStatus]}
            </Badge>
          </div>

          <div className="flex items-center gap-6">
            {/* BPM actuel - affiché seulement si disponible */}
            {patient.currentBpm !== undefined ? (
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500 animate-pulse" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(patient.currentBpm)}
                  </p>
                  <p className="text-xs text-muted-foreground">BPM</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold text-muted-foreground">--</p>
                  <p className="text-xs text-muted-foreground">Aucune donnée</p>
                </div>
              </div>
            )}

            {/* Seuils et dernière mise à jour */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <div>
                {patient.minThreshold && patient.maxThreshold ? (
                  <p className="text-xs">
                    Seuils: {patient.minThreshold}-{patient.maxThreshold} BPM
                  </p>
                ) : (
                  <p className="text-xs">Seuils: Non définis</p>
                )}
                
                {patient.lastUpdate ? (
                  <p className="text-xs">
                    Mis à jour: {new Date(patient.lastUpdate).toLocaleTimeString('fr-FR')}
                  </p>
                ) : (
                  <p className="text-xs">
                    Inscrit le: {new Date(patient.dateNaissance).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}