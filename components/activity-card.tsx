import { Activity } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play, Square, CheckCircle, Edit, X, Trash2 } from 'lucide-react';

interface ActivityCardProps {
  activity: Activity;
  onStart?: () => void;
  onStop?: () => void;
  onUpdate?: (activityId: string | number, updates: Partial<Activity>) => void;
  onEdit?: (activity: Activity) => void; // Nouvelle fonction pour ouvrir le formulaire de modification
  onClose?: (activityId: string | number) => void;
  onDelete?: (activityId: string | number) => void;
  showActions?: boolean;
  patientName?: string; // Nom du patient pour l'affichage côté médecin
}

export function ActivityCard({ activity, onStart, onStop, onUpdate, onEdit, onClose, onDelete, showActions = false, patientName }: ActivityCardProps) {
  const typeColors = {
    rest: 'bg-chart-2 text-white',
    light: 'bg-chart-3 text-white',
    moderate: 'bg-chart-4 text-foreground',
    intense: 'bg-chart-5 text-white',
    meditation: 'bg-primary text-primary-foreground',
  };

  const typeLabels = {
    rest: 'Repos',
    light: 'Léger',
    moderate: 'Modéré',
    intense: 'Intense',
    meditation: 'Méditation',
  };

  const statusIcons = {
    active: Play,
    completed: CheckCircle,
    scheduled: Clock,
  };

  const status = activity.completed === false ? 'scheduled' : activity.completed === true ? 'completed' : (activity.status || 'scheduled');
  const duration = activity.durationInMinutes || activity.duration || 0;
  const title = activity.title || activity.name || 'Activité';

  const StatusIcon = statusIcons[status as keyof typeof statusIcons] || Clock;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {activity.type && (
                <Badge className={typeColors[activity.type]} variant="secondary">
                  {typeLabels[activity.type]}
                </Badge>
              )}
            </div>
            {patientName && (
              <p className="text-xs text-primary font-medium mb-1">Patient: {patientName}</p>
            )}
            <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {duration} min
              </span>
              {status === 'completed' && activity.averageBpm && (
                <span>Moy: {activity.averageBpm} BPM</span>
              )}
            </div>
          </div>
          <StatusIcon className={`h-5 w-5 ${status === 'active' ? 'text-success' : 'text-muted-foreground'}`} />
        </div>

        {(showActions || onUpdate || onEdit || onClose || onDelete) && (
          <div className="flex gap-2 mt-3">
            {showActions && status === 'scheduled' && (
              <Button onClick={onStart} size="sm" className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Démarrer
              </Button>
            )}
            {showActions && status === 'active' && (
              <Button onClick={onStop} size="sm" variant="destructive" className="flex-1">
                <Square className="h-4 w-4 mr-2" />
                Arrêter
              </Button>
            )}
            {onEdit && (
              <Button onClick={() => onEdit(activity)} size="sm" variant="outline" title="Modifier">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onUpdate && !onEdit && (
              <Button onClick={() => onUpdate(activity.id, {})} size="sm" variant="outline" title="Modifier">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onClose && status !== 'completed' && (
              <Button onClick={() => onClose(activity.id)} size="sm" variant="secondary" title="Clôturer">
                <X className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button onClick={() => onDelete(activity.id)} size="sm" variant="destructive" title="Supprimer">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
