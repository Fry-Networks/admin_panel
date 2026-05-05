import { useState, useEffect } from 'react';
import { Title } from '@tremor/react';

interface WebUI {
  slug: string;
  label: string;
  proxyPath: string;
  order: number;
}

export default function WebuisPage() {
  const [webuis, setWebuis] = useState<WebUI[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/webuis')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setWebuis(data.webuis || []);
        if (data.webuis?.length > 0) setActive(data.webuis[0].slug);
      })
      .catch((e) => setError(e.message));
  }, []);

  const activeWebui = webuis.find((w) => w.slug === active);

  return (
    <main className="p-4 md:p-10 mx-auto max-w-full bg-gray-950">
      <Title className="text-white">WebUIs</Title>
      {error && <p className="text-red-400 mt-4">{error}</p>}
      <div className="flex gap-2 mt-6 border-b border-gray-700 pb-2">
        {webuis.map((w) => (
          <button
            key={w.slug}
            onClick={() => setActive(w.slug)}
            className={
              active === w.slug
                ? 'px-4 py-2 text-sm font-medium text-white border-b-2 border-red-500'
                : 'px-4 py-2 text-sm font-medium text-gray-400 hover:text-white'
            }
          >
            {w.label}
          </button>
        ))}
      </div>
      {activeWebui && (
        <iframe
          key={activeWebui.slug}
          src={activeWebui.proxyPath}
          className="mt-4 w-full border border-gray-700 rounded"
          style={{ height: 'calc(100vh - 200px)' }}
          title={activeWebui.label}
        />
      )}
    </main>
  );
}
