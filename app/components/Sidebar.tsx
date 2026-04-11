"use client";

import { useState } from "react";
import { Entry } from "@/lib/types";
import EntryForm from "./EntryForm";
import CsvUpload from "./CsvUpload";
import StatsPanel from "./StatsPanel";
import PasswordModal from "./PasswordModal";

interface SidebarProps {
  entries: Entry[];
  onDataChanged: () => void;
}

export default function Sidebar({ entries, onDataChanged }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  async function handleReset(password: string) {
    setResetting(true);
    setResetError("");

    try {
      const res = await fetch("/api/entries", {
        method: "DELETE",
        headers: { "x-entry-password": password },
      });

      if (res.status === 401) {
        localStorage.removeItem("entry-password");
        setResetError("密碼錯誤");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setResetError(data.error || "清除失敗");
        return;
      }

      localStorage.setItem("entry-password", password);
      onDataChanged();
    } catch {
      setResetError("網路錯誤");
    } finally {
      setResetting(false);
      setShowResetModal(false);
    }
  }

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
        {entries.length > 0 && (
          <>
            <hr className="border-gray-200" />
            <button
              onClick={() => {
                const savedPassword = localStorage.getItem("entry-password");
                if (savedPassword) {
                  if (confirm("確定要清除所有資料嗎？")) {
                    handleReset(savedPassword);
                  }
                } else {
                  setShowResetModal(true);
                }
              }}
              disabled={resetting}
              className="w-full rounded border border-red-300 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {resetting ? "清除中..." : "清除所有資料"}
            </button>
            {resetError && <p className="text-xs text-red-500">{resetError}</p>}
          </>
        )}
      </div>

      {showResetModal && (
        <PasswordModal
          onSubmit={(pw) => {
            setShowResetModal(false);
            if (confirm("確定要清除所有資料嗎？")) {
              handleReset(pw);
            }
          }}
          onCancel={() => setShowResetModal(false)}
        />
      )}
    </div>
  );
}
