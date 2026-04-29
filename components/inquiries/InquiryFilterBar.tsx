"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { STATUS_LABELS } from "@/lib/inquiries/labels";
import { STATUS_VALUES } from "@/lib/inquiries/types";

export function InquiryFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const keyword = searchParams.get("keyword") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "createdAt_desc";

  // IME 未確定中は URL を更新しないため、入力値をローカル管理する
  const [keywordInput, setKeywordInput] = useState(keyword);
  const isComposingRef = useRef(false);

  // URL 側 (戻る/進む等) で keyword が変化した場合にローカル入力へ反映
  useEffect(() => {
    if (!isComposingRef.current) {
      setKeywordInput(keyword);
    }
  }, [keyword]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`);
  };

  const handleKeywordChange = (value: string) => {
    setKeywordInput(value);
    if (!isComposingRef.current) {
      updateFilter("keyword", value);
    }
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    isComposingRef.current = false;
    const value = e.currentTarget.value;
    setKeywordInput(value);
    updateFilter("keyword", value);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="keyword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            キーワード検索
          </label>
          <input
            type="text"
            id="keyword"
            value={keywordInput}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={handleCompositionEnd}
            placeholder="タイトルまたは本文で検索"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ステータス
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="sort"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            並び順
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => updateFilter("sort", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt_desc">登録日時（新しい順）</option>
            <option value="createdAt_asc">登録日時（古い順）</option>
          </select>
        </div>
      </div>
    </div>
  );
}
