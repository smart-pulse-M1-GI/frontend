'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, X } from 'lucide-react';

interface Notification {
  id: number;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface NotificationsPanelProps {
  userId: string;
  token: string;
}

const API_BASE_URL = 'http://localhost:8080/api/v1';

export function NotificationsPanel({ userId, token }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        console.log('✅ Notification marquée comme lue');
      }
    } catch (error) {
      console.error('❌ Erreur marquage:', error);
    }
  };

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    if (!userId || !token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/user/${userId}/read-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        console.log('✅ Toutes marquées comme lues');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  // Charger au clic
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    if (!userId || !token) return;

    // Premier chargement
    fetchNotifications();

    // Refresh automatique
    const interval = setInterval(fetchNotifications, 30000);
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
          <Card className="absolute right-0 top-12 w-96 max-h-[500px] z-50 shadow-2xl">
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

            <CardContent className="p-0 max-h-96 overflow-y-auto">
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
                            {notification.message}
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