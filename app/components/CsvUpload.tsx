"use client";

import { useCallback, useState } from "react";
import PasswordModal from "./PasswordModal";
import { BatchResult } from "@/lib/types";

interface CsvUploadProps {
  onUploaded: () => void;
}

export default function CsvUpload({ onUploaded }: CsvUploadProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File, password: string) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/entries/batch", {
        method: "POST",
        headers: { "x-entry-password": password },
        body: formData,
      });

      if (res.status === 401) {
        localStorage.removeItem("entry-password");
        setError("密碼錯誤");
        setPendingFile(file);
        setShowPasswordModal(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "上傳失敗");
        return;
      }

      localStorage.setItem("entry-password", password);
      const data: BatchResult = await res.json();
      setResult(data);
      onUploaded();
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  function handleFile(file: File) {
    const savedPassword = localStorage.getItem("entry-password");
    if (savedPassword) {
      uploadFile(file, savedPassword);
    } else {
      setPendingFile(file);
      setShowPasswordModal(true);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">📂 上傳 CSV</h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-4 text-center transition-colors ${
            dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          {loading ? (
            <p className="text-sm text-gray-500">處理中...</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">拖放 CSV 檔案或點擊選擇</p>
              <p className="mt-1 text-xs text-gray-400">格式：暱稱, 地址, 標籤</p>
            </>
          )}
        </div>

        {result && (
          <div className="rounded bg-gray-50 p-2 text-xs">
            <p className="text-green-600">成功：{result.success} 筆</p>
            {result.failed.length > 0 && (
              <>
                <p className="text-red-500">失敗：{result.failed.length} 筆</p>
                <ul className="mt-1 text-gray-500">
                  {result.failed.map((f, i) => (
                    <li key={i}>第 {f.row} 行：{f.address}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {showPasswordModal && (
        <PasswordModal
          onSubmit={(pw) => {
            setShowPasswordModal(false);
            if (pendingFile) { uploadFile(pendingFile, pw); setPendingFile(null); }
          }}
          onCancel={() => { setShowPasswordModal(false); setPendingFile(null); }}
        />
      )}
    </>
  );
}
