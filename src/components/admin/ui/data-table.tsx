"use client";

import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T | ((item: T) => string);
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  actions?: React.ReactNode;
  rowKey: (item: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Ara...",
  pageSize = 12,
  emptyMessage = "Henüz kayıt bulunmuyor.",
  emptyAction,
  actions,
  rowKey,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim() || !searchKey) return data;
    const term = searchTerm.toLowerCase();

    return data.filter((item) => {
      let val = "";
      if (typeof searchKey === "function") {
        val = searchKey(item);
      } else {
        val = String(item[searchKey] || "");
      }
      return val.toLowerCase().includes(term);
    });
  }, [data, searchTerm, searchKey]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      {(searchKey || actions) && (
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          {searchKey ? (
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          ) : (
            <div />
          )}

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 ${col.className || ""} ${
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr
                  key={rowKey(item)}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? "");

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-slate-700 ${col.className || ""} ${
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">{emptyMessage}</p>
                    {emptyAction && <div className="mt-3">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
          <div>
            Toplam <span className="font-bold text-slate-700">{filteredData.length}</span> kayıt (Sayfa {currentPage} / {totalPages})
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
