import { useState, useEffect, useRef } from 'react';
import { Search, X, Indent as Student, CircleDollarSign, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  id: string;
  type: 'student' | 'payment' | 'user';
  title: string;
  subtitle: string;
  link: string;
}

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Load recent searches from localStorage
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchResults: SearchResult[] = [];

        // Search students
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select(`
            id,
            student_name,
            admission_number,
            class:class_id(name)
          `)
          .or(`student_name.ilike.%${query}%,admission_number.ilike.%${query}%`)
          .limit(5);

        if (studentError) throw studentError;

        if (students) {
          students.forEach(student => {
            searchResults.push({
              id: student.id,
              type: 'student',
              title: student.student_name,
              subtitle: `${student.admission_number} | ${student.class?.name || 'No Class'}`,
              link: `/student-registration?id=${student.id}`
            });
          });
        }

        // Search payments
        const { data: payments, error: paymentError } = await supabase
          .from('fee_payments')
          .select(`
            id,
            receipt_number,
            amount_paid,
            payment_date,
            student:student_id(student_name)
          `)
          .or(`receipt_number.ilike.%${query}%`)
          .order('payment_date', { ascending: false })
          .limit(3);

        if (paymentError) throw paymentError;

        if (payments) {
          payments.forEach(payment => {
            searchResults.push({
              id: payment.id,
              type: 'payment',
              title: `Receipt #${payment.receipt_number}`,
              subtitle: `₹${parseFloat(payment.amount_paid).toLocaleString('en-IN')} | ${new Date(payment.payment_date).toLocaleDateString()}`,
              link: `/fee-collection?receipt=${payment.receipt_number}`
            });
          });
        }

        // Search users
        const { data: users, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            name,
            role,
            phone_number
          `)
          .or(`name.ilike.%${query}%,phone_number.ilike.%${query}%`)
          .limit(3);

        if (userError) throw userError;

        if (users) {
          users.forEach(user => {
            searchResults.push({
              id: user.id,
              type: 'user',
              title: user.name,
              subtitle: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} | ${user.phone_number}`,
              link: `/user-management?id=${user.id}`
            });
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchSearchResults();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    // Add to recent searches
    const newRecentSearches = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery),
    ].slice(0, 5);
    
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
    
    // Navigate or perform search
    // For now, just close the search
    setIsOpen(false);
    setQuery('');
  };

  const handleResultClick = (result: SearchResult) => {
    handleSearch(result.title);
    navigate(result.link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'student':
        return <Student className="h-4 w-4" />;
      case 'payment':
        return <CircleDollarSign className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <button
        className="btn btn-outline btn-sm"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex ml-2 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-screen max-w-xl -right-4 bg-card rounded-lg shadow-lg border p-4 z-50">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search students, payments, or users..."
              className="flex-1 bg-transparent border-none focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button
              className="p-1 hover:bg-muted rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Search Results */}
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : results.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Results</h3>
                <div className="space-y-1">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md text-left"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="bg-muted p-2 rounded-md">
                        {getIcon(result.type)}
                      </div>
                      <div>
                        <p className="font-medium">{result.title}</p>
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : query ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : recentSearches.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Searches</h3>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded-md text-left"
                      onClick={() => setQuery(search)}
                    >
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span>{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;