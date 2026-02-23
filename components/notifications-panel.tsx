'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, X, RefreshCw } from 'lucide-react';

interface Notification {
  id: number;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface NotificationsPanelProps {
  userId: string;
  token: string;
  userRole?: 'doctor' | 'patient'; // Optionnel, pour savoir si on doit charger les patients
}

const API_BASE_URL = 'http://localhost:8080/api/v1';

export function NotificationsPanel({ userId, token, userRole = 'doctor' }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);

  // Récupérer la liste des patients pour enrichir les notifications (seulement pour les médecins)
  const fetchPatients = async () => {
    if (userRole !== 'doctor') return; // Ne pas charger les patients si c'est un patient
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/my-patients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data);
        console.log('✅ Patients chargés pour notifications:', data);
      }
    } catch (error) {
      console.error('❌ Erreur chargement patients:', error);
    }
  };

  // Enrichir le message de notification avec le nom du patient
  const enrichNotificationMessage = (message: string): string => {
    if (patients.length === 0) return message;

    let enrichedMessage = message;

    // Pattern pour capturer "Le patient X", "le patient X", "La patient X", etc.
    const patternWithArticle = /(Le|le|La|la|L'|l')\s+patient\s+(\d+)/gi;
    
    // Remplacer "Le/le/La/la patient X" avec juste le nom (sans article)
    enrichedMessage = enrichedMessage.replace(patternWithArticle, (match, article, patientId) => {
      const patient = patients.find(p => String(p.id) === patientId);
      if (patient) {
        return `${patient.prenom} ${patient.nom}`;
      }
      return match;
    });

    // Pattern pour "patient X" sans article (au cas où)
    const patternWithSpace = /patient\s+(\d+)/gi;
    enrichedMessage = enrichedMessage.replace(patternWithSpace, (match, patientId) => {
      const patient = patients.find(p => String(p.id) === patientId);
      if (patient) {
        return `${patient.prenom} ${patient.nom}`;
      }
      return match;
    });

    // Pattern pour "patientX" collé
    const patternWithoutSpace = /patient(\d+)/gi;
    enrichedMessage = enrichedMessage.replace(patternWithoutSpace, (match, patientId) => {
      const patient = patients.find(p => String(p.id) === patientId);
      if (patient) {
        return `${patient.prenom} ${patient.nom}`;
      }
      return match;
    });

    return enrichedMessage;
  };

  // Récupérer le nombre de notifications non lues
  const fetchUnreadCount = async () => {
    if (!userId || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}/unread`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const unreadNotifications = await response.json();
        setUnreadCount(unreadNotifications.length);
        console.log('✅ Notifications non lues:', unreadNotifications.length);
      }
    } catch (error) {
      console.error('❌ Erreur comptage notifications:', error);
    }
  };

  // Récupérer les notifications
  const fetchNotifications = async () => {
    if (!userId || !token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        
        // Compter les non-lues
        const unread = data.filter((n: Notification) => !n.isRead).length;
        setUnreadCount(unread);
        console.log('✅ Notifications chargées:', data);
      } else {
        console.error('❌ Erreur chargement notifications:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur API notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Marquer une notification comme lue
  const markAsRead = async (notificationId: number) => {
    try {
      console.log('📝 Marquage notification comme lue:', notificationId);
      
      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📡 Réponse serveur:', response.status);

      if (response.ok) {
        // Mettre à jour l'état local immédiatement
        setNotifications(prev => 
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        
        // Décrémenter le compteur immédiatement
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        console.log('✅ Notification marquée comme lue');
      } else {
        console.error('❌ Erreur marquage notification:', response.status);
        const errorText = await response.text();
        console.error('Détails erreur:', errorText);
      }
    } catch (error) {
      console.error('❌ Erreur marquage:', error);
    }
  };

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    if (!userId || !token) return;

    try {
      console.log('📝 Marquage de toutes les notifications comme lues');
      
      const response = await fetch(
        `${API_BASE_URL}/notifications/user/${userId}/read-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      console.log('📡 Réponse serveur:', response.status);

      if (response.ok) {
        // Mettre à jour immédiatement
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        console.log('✅ Toutes marquées comme lues');
      } else {
        console.error('❌ Erreur marquage toutes:', response.status);
        const errorText = await response.text();
        console.error('Détails erreur:', errorText);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  // Charger les patients au montage
  useEffect(() => {
    if (userId && token) {
      fetchPatients();
    }
  }, [userId, token]);

  // Charger au clic sur la cloche (seulement à l'ouverture, pas à la fermeture)
  useEffect(() => {
    if (isOpen) {
      // Recharger les notifications à l'ouverture
      fetchNotifications();
    }
  }, [isOpen]);

  // Auto-refresh du compteur toutes les 10 secondes
  useEffect(() => {
    if (!userId || !token) return;

    // Premier chargement
    fetchNotifications();

    // Refresh automatique du compteur uniquement
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 10000); // Toutes les 10 secondes
    
    return () => clearInterval(interval);
  }, [userId, token]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins}m`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      if (diffDays < 7) return `Il y a ${diffDays}j`;
      
      return date.toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="relative">
      {/* Bouton Bell */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Panel de notifications */}
      {isOpen && (
        <>
          {/* Overlay pour fermer en cliquant dehors */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <Card className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-12 left-2 sm:left-auto sm:w-96 max-h-[70vh] sm:max-h-[500px] z-50 shadow-2xl">
            <CardHeader className="border-b bg-background p-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                {unreadCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {unreadCount} non-lue{unreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchNotifications()}
                  disabled={isLoading}
                  title="Rafraîchir"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Marquer tout
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-[calc(70vh-80px)] sm:max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 p-4">
                  <Bell className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune notification
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        notification.isRead
                          ? 'hover:bg-muted/50'
                          : 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      }`}
                      onClick={() =>
                        !notification.isRead && markAsRead(notification.id)
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-relaxed">
                            {enrichNotificationMessage(notification.message)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
