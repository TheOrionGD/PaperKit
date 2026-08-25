/* AllToolsScreen — dynamically categorized tool grid driven by registry */
import { useState, useEffect, useMemo, useCallback } from 'react';
import ToolCategory from '../components/ui/ToolCategory';
import SearchBar from '../components/ui/SearchBar';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { getToolsRegistry, getToolsRegistrySync } from '../services/tools';
import { Wrench } from 'lucide-react';
import './AllToolsScreen.css';

export default function AllToolsScreen() {
  const initialTools = getToolsRegistrySync();
  const [tools, setTools] = useState(initialTools);
  const [loading, setLoading] = useState(!initialTools.length);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const loadRegistry = useCallback(async () => {
    if (!tools.length) setLoading(true);
    setError(null);
    try {
      const data = await getToolsRegistry();
      if (data && data.length > 0) setTools(data);
    } catch (err) {
      if (!tools.length) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tools.length]);

  useEffect(() => {
    loadRegistry();
  }, [loadRegistry]);

  const filteredTools = useMemo(() => {
    if (!search.trim()) return tools;
    const q = search.toLowerCase();
    return tools.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.capabilities.some(c => c.toLowerCase().includes(q))
    );
  }, [tools, search]);

  const grouped = useMemo(() => {
    const categories = {};
    filteredTools.forEach(t => {
      if (!categories[t.category]) {
        categories[t.category] = [];
      }
      categories[t.category].push(t);
    });
    return categories;
  }, [filteredTools]);

  return (
    <div className="all-tools-screen">
      <div className="all-tools-screen__search" style={{ marginBottom: 'var(--space-4)' }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search all tools..."
          id="all-tools-search"
        />
      </div>

      {loading && <LoadingState text="Loading tools..." />}
      {!loading && error && <ErrorState title="Failed to load tools" message={error} onRetry={loadRegistry} />}
      
      {!loading && !error && filteredTools.length === 0 && (
        <EmptyState
          icon={Wrench}
          title="No tools found"
          description={`Nothing matched your search for "${search}"`}
        />
      )}

      {!loading && !error && Object.keys(grouped).map(categoryName => {
        const categoryTools = grouped[categoryName].map(t => ({
          id: t.toolId,
          label: t.name,
          path: t.route,
          availability: t.availability,
          description: t.description,
          capabilities: t.capabilities,
          supportedFormats: t.supportedFormats
        }));

        return (
          <ToolCategory
            key={categoryName}
            title={categoryName}
            tools={categoryTools}
          />
        );
      })}
    </div>
  );
}
