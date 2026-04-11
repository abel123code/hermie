import React, { useState, useEffect, useCallback } from 'react';
import { Subject, CaptureListItem, CaptureFilter } from '../types';

interface ManagePageProps {
  subjects: Subject[];
  initialSubjectId: string;
  onBack: () => void;
}

const FILTERS: { value: CaptureFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due', label: 'Due' },
  { value: 'new', label: 'New' },
  { value: 'learning', label: 'Learning' },
  { value: 'review', label: 'Review' },
];

const PAGE_SIZE = 50;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDueTime(dueAt: number, now: number): string {
  const diff = dueAt - now;
  if (diff <= 0) return 'Now';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d === 1) return 'Tomorrow';
  return `${d}d`;
}

const stateColors: Record<string, { bg: string; fg: string }> = {
  new: { bg: 'rgba(45,122,79,0.08)', fg: '#2D7A4F' },
  learning: { bg: 'rgba(183,121,31,0.08)', fg: '#B7791F' },
  review: { bg: 'rgba(37,99,235,0.06)', fg: '#2563EB' },
  due: { bg: 'rgba(232,67,10,0.08)', fg: '#E8430A' },
};

export function ManagePage({ subjects, initialSubjectId, onBack }: ManagePageProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [filter, setFilter] = useState<CaptureFilter>('all');
  const [captures, setCaptures] = useState<CaptureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [previewCapture, setPreviewCapture] = useState<CaptureListItem | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CaptureListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  const loadCaptures = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const off = reset ? 0 : offset;
      const items = await window.hermie.manageListCaptures(selectedSubjectId, filter, PAGE_SIZE, off);
      if (reset) { setCaptures(items); setOffset(0); }
      else setCaptures(prev => [...prev, ...items]);
      setHasMore(items.length === PAGE_SIZE);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [selectedSubjectId, filter, offset]);

  useEffect(() => { setCaptures([]); setOffset(0); setImageUrls({}); loadCaptures(true); }, [selectedSubjectId, filter]);

  useEffect(() => {
    const load = async () => {
      const urls: Record<string, string> = { ...imageUrls };
      let n = false;
      for (const c of captures) { if (!urls[c.id]) { const u = await window.hermie.getImageUrl(c.imagePath); if (u) { urls[c.id] = u; n = true; } } }
      if (n) setImageUrls(urls);
    };
    load();
  }, [captures]);

  useEffect(() => {
    if (previewCapture) window.hermie.getImageUrl(previewCapture.imagePath).then(u => setPreviewImageUrl(u));
    else setPreviewImageUrl(null);
  }, [previewCapture]);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const handleDelete = async (c: CaptureListItem) => {
    setDeleting(true);
    try {
      const r = await window.hermie.manageDeleteCapture(c.id);
      if (r.ok) { setCaptures(p => p.filter(x => x.id !== c.id)); setDeleteConfirm(null); setPreviewCapture(null); setToast('Capture deleted'); }
      else setToast(r.error || 'Failed to delete');
    } catch { setToast('Failed to delete'); } finally { setDeleting(false); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (deleteConfirm) setDeleteConfirm(null); else if (previewCapture) setPreviewCapture(null); else onBack(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [deleteConfirm, previewCapture, onBack]);

  const now = Date.now();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', padding: '32px 40px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '28px' }}>
        <button
          onClick={onBack}
          style={{ padding: 0, border: 'none', background: 'none', color: 'var(--ink-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-muted)'; }}
        >
          ← Back
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
          Captures
        </h1>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select
          style={{
            padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)',
            background: 'var(--card)', color: 'var(--ink)', fontSize: '13px', fontWeight: 600,
            fontFamily: 'var(--font-body)', minWidth: '150px', cursor: 'pointer', outline: 'none',
          }}
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
        >
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div style={{ display: 'flex', gap: '4px' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              style={{
                padding: '6px 12px', borderRadius: 'var(--r-sm)',
                border: filter === f.value ? '1.5px solid var(--ink)' : '1.5px solid transparent',
                background: filter === f.value ? 'var(--ink)' : 'transparent',
                color: filter === f.value ? '#fff' : 'var(--ink-secondary)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s ease',
              }}
              onClick={() => setFilter(f.value)}
              onMouseEnter={(e) => { if (filter !== f.value) e.currentTarget.style.background = 'var(--paper-warm)'; }}
              onMouseLeave={(e) => { if (filter !== f.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', flex: 1 }}>
        {loading && captures.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: '180px', borderRadius: 'var(--r-md)', background: 'linear-gradient(90deg, var(--paper-warm) 25%, var(--paper-deep) 50%, var(--paper-warm) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
          ))
        ) : captures.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontStyle: 'italic', color: 'var(--ink-muted)', margin: 0 }}>
              No captures here yet
            </p>
            <span style={{ fontSize: '13px', color: 'var(--ink-faint)', marginTop: '4px' }}>Start study mode to capture screenshots</span>
          </div>
        ) : (
          captures.map(c => (
            <div
              key={c.id}
              onClick={() => setPreviewCapture(c)}
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', overflow: 'hidden', cursor: 'pointer',
                transition: 'all 0.15s ease', boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <div style={{ height: '140px', background: 'var(--paper-warm)', overflow: 'hidden' }}>
                {imageUrls[c.id] ? <img src={imageUrls[c.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--paper-warm) 25%, var(--paper-deep) 50%, var(--paper-warm) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 500 }}>{formatDate(c.createdAt)}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: stateColors[c.state]?.bg, color: stateColors[c.state]?.fg }}>{c.state}</span>
                    {c.dueAt <= now && <span style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', background: stateColors.due.bg, color: stateColors.due.fg }}>due</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ink-faint)', marginTop: '4px' }}>
                  <span>Next: {formatDueTime(c.dueAt, now)}</span>
                </div>
              </div>
              <button
                style={{ position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.9)', color: 'var(--accent)', opacity: 0, cursor: 'pointer', transition: 'all 0.12s ease', fontSize: '12px' }}
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c); }}
                ref={(el) => {
                  if (!el) return;
                  const p = el.parentElement;
                  p?.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
                  p?.addEventListener('mouseleave', () => { el.style.opacity = '0'; });
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))
        )}
      </div>

      {hasMore && !loading && (
        <button
          onClick={() => { setOffset(p => p + PAGE_SIZE); loadCaptures(); }}
          style={{ display: 'block', margin: '24px auto 0', padding: 0, border: 'none', background: 'none', color: 'var(--ink-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-muted)'; }}
        >
          Load more
        </button>
      )}

      {loading && captures.length > 0 && (
        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--ink-faint)', fontSize: '13px', fontStyle: 'italic' }}>Loading...</div>
      )}

      {/* Preview Modal */}
      {previewCapture && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setPreviewCapture(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 'var(--r-xl)', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--ink)' }}>{selectedSubject?.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--ink-faint)', flex: 1 }}>{formatDate(previewCapture.createdAt)}</span>
              <button style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: 'none', background: 'var(--paper-warm)', color: 'var(--ink-secondary)', cursor: 'pointer' }} onClick={() => setPreviewCapture(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--paper)' }}>
              {previewImageUrl ? <img src={previewImageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--r-sm)' }} /> : <div style={{ color: 'var(--ink-faint)' }}>Loading...</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, background: stateColors[previewCapture.state]?.bg, color: stateColors[previewCapture.state]?.fg }}>{previewCapture.state}</span>
              </div>
              <button
                style={{ padding: '8px 16px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setDeleteConfirm(previewCapture)}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 'var(--r-xl)', padding: '28px', maxWidth: '340px', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: 'var(--ink)', marginBottom: '6px' }}>Delete capture?</h3>
            <p style={{ fontSize: '14px', color: 'var(--ink-secondary)', marginBottom: '20px' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button style={{ padding: '9px 18px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--ink-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</button>
              <button style={{ padding: '9px 18px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }} onClick={() => handleDelete(deleteConfirm)} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', background: 'var(--ink)', color: '#fff', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 600, zIndex: 200, boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.2s ease' }}>{toast}</div>
      )}
    </div>
  );
}
