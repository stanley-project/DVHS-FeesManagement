import { useState } from 'react';
import { X, Bell, CircleDollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

interface NotificationCenterProps {
  onClose: () => void;
}

const NotificationCenter = ({ onClose }: NotificationCenterProps) => {
  const [notifications] = useState([
    {
      id: 1,
      type: 'payment',
      title: 'New Payment Received',
      message: '₹15,000 received from Amit Kumar (IX-A)',
      time: '5 minutes ago',
      read: false,
    },
    {
      id: 2,
      type: 'alert',
      title: 'Fee Payment Due',
      message: '10 students have pending fees for this month',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 3,
      type: 'success',
      title: 'Daily Collection Report',
      message: 'Total collection for today: ₹1,25,000',
      time: '2 hours ago',
      read: true,
    },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CircleDollarSign className="h-5 w-5 text-primary" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-96 rounded-lg bg-card shadow-lg ring-1 ring-black ring-opacity-5 z-20">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-full"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 hover:bg-muted/50 ${notification.read ? 'opacity-70' : ''}`}
          >
            <div className="flex gap-3">
              <div className="mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-muted/50">
        <button className="btn btn-outline btn-sm w-full">
          View All Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;