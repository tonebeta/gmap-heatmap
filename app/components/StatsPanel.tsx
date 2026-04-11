"use client";

import { useMemo } from "react";
import { Entry } from "@/lib/types";

function extractCity(address: string): string {
  const match = address.match(
    /^(臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/
  );
  return match ? match[1] : "其他";
}

interface StatsPanelProps {
  entries: Entry[];
}

export default function StatsPanel({ entries }: StatsPanelProps) {
  const stats = useMemo(() => {
    const byTag: Record<string, number> = {};
    const byCity: Record<string, number> = {};

    for (const entry of entries) {
      const tag = entry.tag || "(無標籤)";
      byTag[tag] = (byTag[tag] || 0) + 1;

      const city = extractCity(entry.address);
      byCity[city] = (byCity[city] || 0) + 1;
    }

    const citySorted = Object.entries(byCity).sort((a, b) => b[1] - a[1]);
    const maxCityCount = citySorted.length > 0 ? citySorted[0][1] : 0;

    return { byTag, citySorted, maxCityCount };
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
          {stats.citySorted.map(([city, count]) => (
            <div key={city} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-right text-gray-600">{city}</span>
              <div className="h-4 flex-1 rounded bg-gray-100">
                <div
                  className="h-full rounded bg-blue-500 transition-all"
                  style={{ width: `${(count / stats.maxCityCount) * 100}%` }}
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
