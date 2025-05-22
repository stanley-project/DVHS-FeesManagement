import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface TransitionProgressProps {
  transitionId: string;
  onComplete: () => void;
}

const TransitionProgress = ({ transitionId, onComplete }: TransitionProgressProps) => {
  const [progress, setProgress] = useState({
    status: 'in_progress',
    totalStudents: 0,
    processed: 0,
    promoted: 0,
    retained: 0,
    transferred: 0
  });

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/academic_year_transitions?id=eq.${transitionId}`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          }
        );

        const [data] = await response.json();
        
        setProgress({
          status: data.status,
          totalStudents: data.total_students,
          processed: data.promoted_students + data.retained_students + data.transferred_students,
          promoted: data.promoted_students,
          retained: data.retained_students,
          transferred: data.transferred_students
        });

        if (data.status === 'completed') {
          onComplete();
        }
      } catch (error) {
        console.error('Error checking transition progress:', error);
      }
    };

    const interval = setInterval(checkProgress, 2000);
    return () => clearInterval(interval);
  }, [transitionId, onComplete]);

  const percentComplete = progress.totalStudents > 0
    ? Math.round((progress.processed / progress.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <h3 className="text-lg font-medium">Processing Academic Year Transition</h3>
      </div>

      <div className="bg-muted rounded-lg p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-muted-foreground">Progress</span>
          <span className="text-sm font-medium">{percentComplete}%</span>
        </div>
        <div className="w-full bg-muted-foreground/20 rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm text-muted-foreground">Total Students</p>
          <p className="text-lg font-bold">{progress.totalStudents}</p>
        </div>
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm text-muted-foreground">Promoted</p>
          <p className="text-lg font-bold text-success">{progress.promoted}</p>
        </div>
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm text-muted-foreground">Retained</p>
          <p className="text-lg font-bold text-warning">{progress.retained}</p>
        </div>
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm text-muted-foreground">Transferred</p>
          <p className="text-lg font-bold text-error">{progress.transferred}</p>
        </div>
      </div>
    </div>
  );
};

export default TransitionProgress;