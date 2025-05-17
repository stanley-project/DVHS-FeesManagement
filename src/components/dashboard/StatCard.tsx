import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  color: string;
}

const StatCard = ({ title, value, change, isPositive, icon: Icon, color }: StatCardProps) => {
  return (
    <div className="bg-card rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          {change && (
            <span className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-error'} mt-1 inline-block`}>
              {change} from last week
            </span>
          )}
        </div>
        <div className={`rounded-full p-3 ${color} self-start`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;