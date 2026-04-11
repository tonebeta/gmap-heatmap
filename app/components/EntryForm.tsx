"use client";

import { useState } from "react";
import PasswordModal from "./PasswordModal";

interface EntryFormProps {
  onEntryAdded: () => void;
}

export default function EntryForm({ onEntryAdded }: EntryFormProps) {
  const [nickname, setNickname] = useState("");
  const [address, setAddress] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  function getPassword(): string | null {
    return localStorage.getItem("entry-password");
  }

  async function submitEntry(password: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-entry-password": password },
        body: JSON.stringify({ nickname, address, tag }),
      });

      if (res.status === 401) {
        localStorage.removeItem("entry-password");
        setError("密碼錯誤");
        setShowPasswordModal(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "新增失敗");
        return;
      }

      localStorage.setItem("entry-password", password);
      setNickname("");
      setAddress("");
      setTag("");
      onEntryAdded();
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || !address.trim()) return;

    const savedPassword = getPassword();
    if (savedPassword) {
      submitEntry(savedPassword);
    } else {
      setShowPasswordModal(true);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">📍 新增標記</h3>
        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
          placeholder="暱稱" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none" required />
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="地址" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none" required />
        <input type="text" value={tag} onChange={(e) => setTag(e.target.value)}
          placeholder="標籤（選填）" className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none" />
        <button type="submit" disabled={loading || !nickname.trim() || !address.trim()}
          className="w-full rounded bg-blue-600 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "處理中..." : "送出"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>

      {showPasswordModal && (
        <PasswordModal
          onSubmit={(pw) => { setShowPasswordModal(false); submitEntry(pw); }}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}
    </>
  );
}
