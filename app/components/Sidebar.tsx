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

const NAV_ITEMS = [
  { id: "form", icon: "📍", label: "新增標記" },
  { id: "csv", icon: "📂", label: "上傳 CSV" },
  { id: "stats", icon: "📊", label: "統計" },
] as const;

export default function Sidebar({ entries, onDataChanged }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
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
        setShowResetModal(true);
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
      setConfirmingReset(false);
    }
  }

  function onResetClick() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      setResetError("");
      return;
    }

    const savedPassword = localStorage.getItem("entry-password");
    if (savedPassword) {
      handleReset(savedPassword);
    } else {
      setShowResetModal(true);
      setConfirmingReset(false);
    }
  }

  function handleIconClick() {
    if (collapsed) {
      setCollapsed(false);
    }
  }

  return (
    <>
      <div
        className="flex h-full shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out"
        style={{ width: collapsed ? 56 : 320 }}
      >
        {/* Header */}
        <div className="flex items-center border-b border-gray-200 px-3 py-3">
          {!collapsed && (
            <h2 className="flex-1 truncate text-base font-bold text-gray-800">
              🗺️ 地址熱點圖
            </h2>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={collapsed ? "展開側欄" : "收合側欄"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            >
              <path
                d="M11.25 3.75L5.75 9L11.25 14.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Collapsed: Icon rail */}
        {collapsed && (
          <div className="flex flex-1 flex-col items-center gap-1 py-3">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleIconClick()}
                className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-lg hover:bg-gray-100"
                title={item.label}
              >
                {item.icon}
                {/* Tooltip */}
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {item.label}
                </span>
              </button>
            ))}
            {entries.length > 0 && (
              <>
                <div className="my-1 w-6 border-t border-gray-200" />
                <button
                  onClick={() => handleIconClick()}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-lg hover:bg-red-50"
                  title="清除所有資料"
                >
                  🗑️
                  <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    清除所有資料
                  </span>
                </button>
              </>
            )}
            {/* Entry count badge */}
            {entries.length > 0 && (
              <div className="mt-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {entries.length}
              </div>
            )}
          </div>
        )}

        {/* Expanded: Full content */}
        {!collapsed && (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div id="section-form">
              <EntryForm onEntryAdded={onDataChanged} />
            </div>
            <hr className="border-gray-200" />
            <div id="section-csv">
              <CsvUpload onUploaded={onDataChanged} />
            </div>
            <hr className="border-gray-200" />
            <div id="section-stats">
              <StatsPanel entries={entries} />
            </div>
            {entries.length > 0 && (
              <>
                <hr className="border-gray-200" />
                <div className="flex gap-2">
                  <button
                    onClick={onResetClick}
                    disabled={resetting}
                    className={`flex-1 rounded py-2 text-sm disabled:opacity-50 ${
                      confirmingReset
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "border border-red-300 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {resetting
                      ? "清除中..."
                      : confirmingReset
                        ? "確定清除？"
                        : "清除所有資料"}
                  </button>
                  {confirmingReset && (
                    <button
                      onClick={() => setConfirmingReset(false)}
                      className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      取消
                    </button>
                  )}
                </div>
                {resetError && (
                  <p className="text-xs text-red-500">{resetError}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showResetModal && (
        <PasswordModal
          onSubmit={(pw) => {
            setShowResetModal(false);
            handleReset(pw);
          }}
          onCancel={() => setShowResetModal(false)}
        />
      )}
    </>
  );
}
