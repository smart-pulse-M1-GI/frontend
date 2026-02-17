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
  status?: 'normal' | 'warning' | 'critical' | 'alert';
  isActive?: boolean;
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
    alert: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-700 border-red-500/20',
  };

  const statusLabels = {
    normal: 'Normal',
    warning: 'Avertissement',
    alert: 'Alerte',
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
      <Card className={`hover:border-primary transition-colors cursor-pointer ${
        patient.status === 'alert' ? 'border-orange-500/50 shadow-orange-100' :
        patient.status === 'critical' ? 'border-red-500/50 shadow-red-100' :
        patient.status === 'warning' ? 'border-yellow-500/50 shadow-yellow-100' :
        ''
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                patient.isActive ? 'bg-green-500/20 animate-pulse' : 'bg-primary/10'
              }`}>
                <User className={`h-5 w-5 ${patient.isActive ? 'text-green-600' : 'text-primary'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                  {patientName}
                  {patient.isActive && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      En ligne
                    </Badge>
                  )}
                </h3>
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
            {patient.currentBpm !== undefined && patient.currentBpm !== null ? (
              <div className="flex items-center gap-2">
                <Heart className={`h-5 w-5 ${
                  patient.status === 'alert' || patient.status === 'critical' 
                    ? 'text-red-500 animate-pulse' 
                    : patient.status === 'warning'
                    ? 'text-yellow-500'
                    : 'text-green-500'
                }`} />
                <div>
                  <p className={`text-2xl font-bold ${
                    patient.status === 'alert' || patient.status === 'critical'
                      ? 'text-red-600'
                      : patient.status === 'warning'
                      ? 'text-yellow-600'
                      : 'text-foreground'
                  }`}>
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
                
                {patient.lastUpdate && (
                  <p className="text-xs">
                    Mis à jour: {new Date(patient.lastUpdate).toLocaleTimeString('fr-FR')}
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