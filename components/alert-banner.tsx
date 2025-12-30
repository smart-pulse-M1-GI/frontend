import { Alert } from '@/lib/types';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlertBannerProps {
  alert: Alert;
  onDismiss?: () => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const isHigh = alert.type === 'high';
  
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      isHigh 
        ? 'bg-destructive/10 border-destructive text-destructive' 
        : 'bg-warning/10 border-warning text-warning-foreground'
    }`}>
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <div>
          <p className="font-semibold">
            {isHigh ? 'Fréquence cardiaque élevée' : 'Fréquence cardiaque basse'}
          </p>
          <p className="text-sm">
            {alert.patientName}: {alert.bpm} BPM (seuil: {alert.threshold} BPM) - 
            {' '}{alert.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
      {onDismiss && (
        <Button variant="ghost" size="icon" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
