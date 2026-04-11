"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Entry } from "@/lib/types";
import Sidebar from "@/components/Sidebar";

const HeatMap = dynamic(() => import("@/components/HeatMap"), { ssr: false });

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/entries");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      console.error("Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <main className="flex h-screen">
      <Sidebar entries={entries} onDataChanged={fetchEntries} />
      <div className="relative flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            載入中...
          </div>
        ) : (
          <HeatMap entries={entries} />
        )}
      </div>
    </main>
  );
}
