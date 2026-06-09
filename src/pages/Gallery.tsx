import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRESETS } from '../shader-agent/presets';
import { toast } from 'sonner';
import { staggerContainer, listItem } from '../utils/motion';
import { IconArrowLeft, IconPlay, IconSearch } from '../components/icons/ForgeIcons';

export default function Gallery() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allItems = [
    ...PRESETS.map((p, i) => ({
      id: `preset-${p.id}`,
      title: p.title,
      prompt: p.prompt,
      tags: p.tags,
      likes: 120 + (i % 7) * 37,
      views: 800 + i * 140,
      author: i % 3 === 0 ? 'voidwalker' : i % 3 === 1 ? 'neonforge' : 'glitchlab',
      type: 'preset' as const,
    })),
    { id: 'legend-1', title: 'Void Accretion Disk', prompt: 'Black hole with violet lensing and flowing plasma', tags: ['cosmic', 'lensing'], likes: 1840, views: 12400, author: 'spectral', type: 'legend' as const },
    { id: 'legend-2', title: 'Liquid Mercury Cells', prompt: 'Organic chrome cells pulsing under deep blue light', tags: ['liquid', 'organic'], likes: 920, views: 6700, author: 'mercury', type: 'legend' as const },
  ];

  const filtered = allItems.filter((item) => {
    const matchesSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !activeTag || (item.tags || []).includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(allItems.flatMap((i) => i.tags || [])));

  const handleLoad = (item: { id: string; title: string }) => {
    toast.success(`Loaded inspiration: ${item.title}`, {
      description: 'Open the AI Copilot in Studio and describe how you want to evolve it.',
    });
    setTimeout(() => {
      window.location.href = `/studio?inspiration=${encodeURIComponent(item.title)}`;
    }, 0);
  };

  return (
    <div className="page-with-nav" id="main-content">
      <div className="page-container-wide" style={{ paddingBlock: 40 }}>
        <header className="gallery-header">
          <Link to="/" className="gallery-back-link">
            <IconArrowLeft size={16} /> Back to site
          </Link>
          <div className="gallery-divider" aria-hidden="true" />
          <div>
            <div className="eyebrow-label">The archive</div>
            <h1 className="section-heading" style={{ fontSize: '2.25rem' }}>Public gallery</h1>
          </div>
        </header>

        <div className="gallery-controls">
          <div className="search-field">
            <IconSearch className="search-field-icon icon-md" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shaders, techniques, moods..."
              aria-label="Search shaders"
            />
          </div>

          <div className="tag-filters">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`tag-btn${!activeTag ? ' is-active' : ''}`}
            >
              All
            </button>
            {allTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`tag-btn${activeTag === tag ? ' is-active' : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <p className="gallery-count">{filtered.length} shaders · motion &amp; technique curated</p>

        <motion.div
          className="grid-4"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence>
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                variants={listItem}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 280, damping: 18 } }}
                whileTap={{ scale: 0.985 }}
                className="shader-card grain"
                onClick={() => handleLoad(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleLoad(item)}
              >
                <div className="shader-thumb shader-thumb-placeholder">
                  <div className="shader-thumb-pattern" aria-hidden="true" />
                  <div className="shader-thumb-label">
                    <div className="shader-thumb-icon" aria-hidden="true">◉</div>
                    <div className="shader-thumb-badge">WEBGL2 · LIVE</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/studio?preset=${item.id.includes('preset-') ? item.id.replace('preset-', '') : 'dreamy-nebula'}`;
                    }}
                    className="shader-remix-btn"
                  >
                    <IconPlay size={13} /> REMIX
                  </button>
                </div>

                <div className="gallery-card-body">
                  <div className="gallery-card-meta">
                    <div>
                      <div className="text-strong">{item.title}</div>
                      <div className="gallery-card-author">by {item.author}</div>
                    </div>
                    <div className="gallery-card-stats tabular-nums">
                      <div>♥ {Math.floor(item.likes / 100) / 10}k</div>
                      <div>◉ {Math.floor(item.views / 100) / 10}k</div>
                    </div>
                  </div>

                  <p className="gallery-card-prompt">{item.prompt}</p>

                  <div className="gallery-card-tags">
                    {(item.tags || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setActiveTag(tag); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setActiveTag(tag); } }}
                        className="gallery-tag-pill"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <div className="gallery-empty">No shaders match your search.</div>
        )}

        <div className="gallery-empty" style={{ marginTop: 48, paddingBlock: 24 }}>
          <p className="text-muted" style={{ fontSize: 14 }}>
            Live demo. Production version uses vector search over the technique archive + user uploads.
          </p>
          <Link to="/studio" className="link-accent" style={{ marginTop: 8 }}>Start creating your own →</Link>
        </div>
      </div>
    </div>
  );
}