import { Link } from 'react-router-dom';

interface QuickAccessProps {
  items: {
    title: string;
    path: string;
  }[];
}

const QuickAccess = ({ items }: QuickAccessProps) => {
  return (
    <div className="bg-card rounded-lg shadow p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className="inline-flex flex-col items-center justify-center p-4 bg-muted rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickAccess;