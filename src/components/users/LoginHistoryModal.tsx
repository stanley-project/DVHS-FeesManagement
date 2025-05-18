import { X, Monitor, Smartphone, AlertCircle } from 'lucide-react';

interface LoginHistoryModalProps {
  user: any;
  onClose: () => void;
}

const LoginHistoryModal = ({ user, onClose }: LoginHistoryModalProps) => {
  // Mock login history data
  const loginHistory = [
    {
      id: 1,
      timestamp: '2025-08-15 09:30:45',
      status: 'success',
      ipAddress: '192.168.1.100',
      device: 'desktop',
      browser: 'Chrome',
      location: 'New Delhi, India',
    },
    {
      id: 2,
      timestamp: '2025-08-14 15:20:30',
      status: 'failed',
      ipAddress: '192.168.1.101',
      device: 'mobile',
      browser: 'Safari',
      location: 'Mumbai, India',
    },
    // Add more mock data as needed
  ];

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-3xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Login History</h2>
            <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP Address</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Device</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{log.timestamp.split(' ')[1]}</p>
                        <p className="text-xs text-muted-foreground">{log.timestamp.split(' ')[0]}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {log.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.ipAddress}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {log.device === 'desktop' ? (
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{log.browser}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{log.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loginHistory.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No login history available
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>Login history is retained for 30 days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginHistoryModal;