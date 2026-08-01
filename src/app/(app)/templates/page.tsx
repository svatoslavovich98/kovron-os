"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

const CATALOG_URL = "https://lekalakovron.netlify.app/";

export default function TemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  const reload = () => {
    setLoading(true);
    setKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-full min-h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-border shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight">Каталог лекал</h1>
          <p className="text-xs text-muted-foreground">
            156 марок • 5723 лекала
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={reload}
            title="Обновить"
            className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <a
            href={CATALOG_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Открыть в новой вкладке"
            className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Catalog */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Загрузка каталога…</p>
            </div>
          </div>
        )}
        <iframe
          key={key}
          src={CATALOG_URL}
          title="Каталог лекал KOVRON"
          onLoad={() => setLoading(false)}
          className="w-full h-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
