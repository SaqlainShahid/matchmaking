import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  CheckCheck
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { requestNotificationPermission, onMessageListener } from '@/firebaseConfig';
import { cn } from '@/lib/utils';

const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
  SYSTEM: 'system'
};

const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.SUCCESS]: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    accentColor: 'bg-emerald-500'
  },
  [NOTIFICATION_TYPES.WARNING]: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    accentColor: 'bg-amber-500'
  },
  [NOTIFICATION_TYPES.ERROR]: {
    icon: AlertCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    accentColor: 'bg-red-500'
  },
  [NOTIFICATION_TYPES.INFO]: {
    icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    accentColor: 'bg-blue-500'
  },
  [NOTIFICATION_TYPES.SYSTEM]: {
    icon: Bell,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    accentColor: 'bg-purple-500'
  }
};

export default function EnterpriseNotificationPopup() {
  const [notifications, setNotifications] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  // Memoized notification handlers
  const addNotification = useCallback((payload) => {
    const { notification, data } = payload;
    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: notification?.title || 'System Notification',
      message: notification?.body || 'You have a new notification',
      type: data?.type || NOTIFICATION_TYPES.INFO,
      timestamp: new Date().toISOString(),
      read: false,
      priority: data?.priority || 'medium',
      action: data?.action,
      source: data?.source || 'system',
      data: data || {}
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep max 10 notifications

    // Show enterprise toast
    toast({
      title: notification?.title || 'New Notification',
      description: notification?.body,
      duration: 4000,
      variant: data?.type === NOTIFICATION_TYPES.ERROR ? 'destructive' : 'default',
    });
  }, [toast]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Auto-remove notifications after delay (except when hovered)
  useEffect(() => {
    if (isHovered || notifications.length === 0) return;

    const autoRemoveTimeouts = notifications.map(notification => {
      if (!notification.read) {
        return setTimeout(() => {
          removeNotification(notification.id);
        }, 8000); // Auto-remove after 8 seconds
      }
      return null;
    });

    return () => {
      autoRemoveTimeouts.forEach(timeout => timeout && clearTimeout(timeout));
    };
  }, [notifications, isHovered, removeNotification]);

  // Setup notification listeners
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const permission = await requestNotificationPermission();
        if (permission === 'granted') {
          console.log('🔔 Enterprise notifications enabled');
        }
      } catch (error) {
        console.error('Error setting up enterprise notifications:', error);
      }
    };

    setupNotifications();

    // Listen for incoming messages
    const messageListener = onMessageListener()
      .then((payload) => {
        if (payload) {
          addNotification(payload);
        }
      })
      .catch(err => {
        console.error('Error in enterprise message listener:', err);
      });

    return () => {
      // Cleanup if needed
    };
  }, [addNotification]);

  const getNotificationCount = () => notifications.filter(n => !n.read).length;

  const NotificationIcon = ({ type }) => {
    const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG[NOTIFICATION_TYPES.INFO];
    const IconComponent = config.icon;
    return <IconComponent className={cn("h-4 w-4", config.iconColor)} />;
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notifTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notifTime.toLocaleDateString();
  };

  return (
    <div 
      className="fixed top-6 right-6 z-[100] w-96 max-w-[calc(100vw-3rem)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Notification Header */}
      {notifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-3 px-1"
        >
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              {getNotificationCount() > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  {getNotificationCount()}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-700">
              Notifications ({notifications.length})
            </span>
          </div>
          <div className="flex items-center space-x-1">
            {getNotificationCount() > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={clearAllNotifications}
              className="p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Clear all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {notifications.slice(0, 5).map((notification, index) => {
          const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG[NOTIFICATION_TYPES.INFO];
          
          return (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ 
                opacity: 0, 
                x: 100, 
                transition: { 
                  duration: 0.3,
                  ease: "easeInOut"
                } 
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                delay: index * 0.1
              }}
              className={cn(
                "relative mb-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm",
                config.bgColor,
                config.borderColor,
                "hover:shadow-xl transition-all duration-200",
                notification.read ? 'opacity-80' : 'opacity-100'
              )}
              onMouseEnter={() => !notification.read && markAsRead(notification.id)}
            >
              {/* Priority Indicator */}
              {notification.priority === 'high' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 rounded-t-xl"></div>
              )}

              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  notification.read ? 'bg-gray-100' : 'bg-white'
                )}>
                  <NotificationIcon type={notification.type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {notification.title}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {notification.message}
                  </p>

                  {/* Source Badge */}
                  {notification.source && notification.source !== 'system' && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {notification.source}
                      </span>
                    </div>
                  )}

                  {/* Action Button */}
                  {notification.action && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          // Handle action
                          console.log('Action triggered:', notification.action);
                          removeNotification(notification.id);
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                      >
                        {notification.action.label || 'View Details'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Unread Indicator */}
              {!notification.read && (
                <div className="absolute top-3 right-3">
                  <span className="flex h-2 w-2">
                    <span className={cn(
                      "animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75",
                      config.accentColor
                    )}></span>
                    <span className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      config.accentColor
                    )}></span>
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Empty State */}
      {notifications.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 px-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm"
        >
          <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No notifications</p>
          <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
        </motion.div>
      )}
    </div>
  );
}