"use client";

import { useState } from "react";
import { Entry } from "@/lib/types";
import EntryForm from "./EntryForm";
import CsvUpload from "./CsvUpload";
import StatsPanel from "./StatsPanel";

interface SidebarProps {
  entries: Entry[];
  onDataChanged: () => void;
}

export default function Sidebar({ entries, onDataChanged }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute left-2 top-2 z-10 rounded bg-white p-2 shadow-md hover:bg-gray-50"
        title="展開側欄"
      >
        ☰
      </button>
    );
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-bold text-gray-800">🗺️ 地址熱點圖</h2>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="收合側欄"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <EntryForm onEntryAdded={onDataChanged} />
        <hr className="border-gray-200" />
        <CsvUpload onUploaded={onDataChanged} />
        <hr className="border-gray-200" />
        <StatsPanel entries={entries} />
      </div>
    </div>
  );
}
