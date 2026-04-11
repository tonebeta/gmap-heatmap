"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface PasswordModalProps {
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordModal({ onSubmit, onCancel }: PasswordModalProps) {
  const [password, setPassword] = useState("");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">請輸入密碼</h3>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && password) onSubmit(password); }}
          placeholder="共用密碼"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-gray-800 focus:border-blue-500 focus:outline-none"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100">取消</button>
          <button
            onClick={() => password && onSubmit(password)}
            disabled={!password}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >確認</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
