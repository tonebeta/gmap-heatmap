"use client";

import { useMemo } from "react";
import { Entry } from "@/lib/types";

interface StatsPanelProps {
  entries: Entry[];
}

export default function StatsPanel({ entries }: StatsPanelProps) {
  const stats = useMemo(() => {
    const byTag: Record<string, number> = {};
    const byRegion: Record<string, number> = {};

    for (const entry of entries) {
      const tag = entry.tag || "(無標籤)";
      byTag[tag] = (byTag[tag] || 0) + 1;

      const region = entry.region || "未知";
      byRegion[region] = (byRegion[region] || 0) + 1;
    }

    const regionSorted = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);
    const maxRegionCount = regionSorted.length > 0 ? regionSorted[0][1] : 0;

    return { byTag, regionSorted, maxRegionCount };
  }, [entries]);

  if (entries.length === 0) {
    return <div className="text-sm text-gray-400">尚無資料</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">📊 統計</h3>

      <div className="text-sm text-gray-600">
        總人數：<span className="font-bold text-gray-800">{entries.length}</span>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">依標籤</p>
        <div className="space-y-1">
          {Object.entries(stats.byTag).map(([tag, count]) => (
            <div key={tag} className="flex justify-between text-xs">
              <span className="text-gray-600">{tag}</span>
              <span className="font-medium text-gray-800">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-500">區域分布</p>
        <div className="space-y-1">
          {stats.regionSorted.map(([region, count]) => (
            <div key={region} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 truncate text-right text-gray-600" title={region}>
                {region}
              </span>
              <div className="h-4 flex-1 rounded bg-gray-100">
                <div
                  className="h-full rounded bg-blue-500 transition-all"
                  style={{ width: `${(count / stats.maxRegionCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right font-medium text-gray-800">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
