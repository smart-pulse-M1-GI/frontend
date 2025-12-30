import { Activity } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play, Square, CheckCircle } from 'lucide-react';

interface ActivityCardProps {
  activity: Activity;
  onStart?: () => void;
  onStop?: () => void;
  showActions?: boolean;
}

export function ActivityCard({ activity, onStart, onStop, showActions = false }: ActivityCardProps) {
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

  const StatusIcon = statusIcons[activity.status];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground">{activity.name}</h3>
              <Badge className={typeColors[activity.type]} variant="secondary">
                {typeLabels[activity.type]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {activity.duration} min
              </span>
              {activity.status === 'completed' && activity.averageBpm && (
                <span>Moy: {activity.averageBpm} BPM</span>
              )}
            </div>
          </div>
          <StatusIcon className={`h-5 w-5 ${activity.status === 'active' ? 'text-success' : 'text-muted-foreground'}`} />
        </div>

        {showActions && (
          <div className="flex gap-2 mt-3">
            {activity.status === 'scheduled' && (
              <Button onClick={onStart} size="sm" className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Démarrer
              </Button>
            )}
            {activity.status === 'active' && (
              <Button onClick={onStop} size="sm" variant="destructive" className="w-full">
                <Square className="h-4 w-4 mr-2" />
                Arrêter
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
