/* AllToolsScreen — dynamically categorized tool grid driven by registry with Category Hub links */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ToolCategory from '../components/ui/ToolCategory';
import SearchBar from '../components/ui/SearchBar';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import ParticleBackground from '../components/ui/ParticleBackground';
import { getToolsRegistry, getToolsRegistrySync } from '../services/tools';
import { Wrench } from 'lucide-react';
import './AllToolsScreen.css';



const CATEGORY_SLUG_MAP = {
  'PDF Tools': 'pdf',
  'PDF Processing & Pages': 'pdf',
  'AI Tools': 'ai',
  'AI Document Intelligence': 'ai',
  'Security': 'security',
  'Security & Privacy': 'security',
  'Convert': 'convert',
  'Conversions': 'convert',
  'Archive Tools': 'archive',
  'Archive & Compression': 'archive',
  'Image Tools': 'image',
  'Image Format Converter': 'image',
  'Video Tools': 'video',
  'Video Format Converter': 'video',
  'Audio Tools': 'audio',
  'Audio Format Converter': 'audio',
  'Media Downloader': 'downloader',
};

export default function AllToolsScreen() {
  const navigate = useNavigate();
  const initialTools = getToolsRegistrySync();
  const [tools, setTools] = useState(initialTools);
  const [loading, setLoading] = useState(!initialTools.length);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
    let list = tools;
    if (selectedCategory !== 'All') {
      list = list.filter(t => t.category === selectedCategory);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.capabilities && t.capabilities.some(c => c.toLowerCase().includes(q)))
    );
  }, [tools, search, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set();
    tools.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ['All', ...Array.from(set)];
  }, [tools]);

  const grouped = useMemo(() => {
    const map = {};
    filteredTools.forEach(t => {
      if (!map[t.category]) {
        map[t.category] = [];
      }
      map[t.category].push(t);
    });
    return map;
  }, [filteredTools]);

  return (
    <div className="all-tools-screen">
      {/* Interactive Constellation Particle Canvas */}
      <ParticleBackground />

      {/* Top Search & Filter Bar */}
      <div className="all-tools-screen__search-section">

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search all 30+ PaperKit tools &amp; capabilities..."
          id="all-tools-search"
        />

        {/* Category Pills Slider */}
        <div className="all-tools-category-pills">
          {categories.map(cat => (
            <button
              key={cat}
              className={`all-tools-cat-pill ${selectedCategory === cat ? 'all-tools-cat-pill--active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingState text="Loading tools catalog..." />}
      {!loading && error && <ErrorState title="Failed to load tools" message={error} onRetry={loadRegistry} />}
      
      {!loading && !error && filteredTools.length === 0 && (
        <EmptyState
          icon={Wrench}
          title="No tools found"
          description={`Nothing matched your search for "${search}"`}
        />
      )}

      {/* Grouped Tool Containers matching Home Page */}
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

        const slug = CATEGORY_SLUG_MAP[categoryName] || 'pdf';

        return (
          <ToolCategory
            key={categoryName}
            title={categoryName}
            tools={categoryTools}
            showViewAll={true}
            onViewAll={() => navigate(`/category/${slug}`)}
          />
        );
      })}
    </div>
  );
}
