interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const PageHeader = ({ title, children }: PageHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <h1>{title}</h1>
      {children}
    </div>
  );
};

export default PageHeader;