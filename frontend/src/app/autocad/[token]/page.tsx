'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import axios from 'axios';

// Lazy-load the CAD editor so Three.js only loads when this page is visited
const CADEditor = dynamic(() => import('@/features/cad/CADEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e' }}>
      <div style={{ textAlign: 'center', color: '#ccc', fontFamily: 'Consolas, monospace' }}>
        <div style={spinner} />
        <p style={{ marginTop: 16, fontSize: 13 }}>Loading CAD Editor…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

const spinner: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  border: '3px solid #333', borderTopColor: '#007acc',
  animation: 'spin 0.8s linear infinite', margin: '0 auto',
};

const client = axios.create({ baseURL: '/api/v1' });
client.interceptors.response.use(r => {
  if (r.data?.success !== undefined) return { ...r, data: r.data.data };
  return r;
});

export default function AutocadPortalPage() {
  const { token } = useParams() as { token: string };

  const [projectName, setProjectName] = useState('Loading…');
  const [initialData, setInitialData] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    client.get(`/public/autocad/${token}/canvas`)
      .then(res => {
        setProjectName(res.data.project?.name ?? 'Project');
        setInitialData(res.data.canvasJson ?? undefined);
        setReady(true);
      })
      .catch(err => {
        const s = err?.response?.status;
        if (s === 404) setError('This AutoCAD portal link is invalid or has been removed.');
        else if (s === 410) setError('This AutoCAD portal link has been disabled.');
        else setError('Unable to load project. Please try again later.');
      });
  }, [token]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e', fontFamily: 'Consolas, monospace' }}>
        <div style={{ textAlign: 'center', color: '#ccc' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <p style={{ fontSize: 15, color: '#888' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e' }}>
        <div style={{ textAlign: 'center', color: '#ccc', fontFamily: 'Consolas, monospace' }}>
          <div style={spinner} />
          <p style={{ marginTop: 16, fontSize: 13 }}>Loading project…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  async function handleSave(json: string) {
    await client.put(`/public/autocad/${token}/canvas`, { canvasJson: json });
  }

  return (
    <CADEditor
      token={token}
      projectName={projectName}
      initialData={initialData}
      onSave={handleSave}
    />
  );
}
