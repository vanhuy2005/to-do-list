import React, { useState, useEffect } from "react";
import {
  Scroll,
  Search,
  RotateCcw,
  Calendar,
  ChevronDown,
  ChevronUp,
  User,
  Layers,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { fetchAuditLogs } from "@/services/admin.api";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";

// Technical Action Translation Map to Vietnamese
const ACTION_TRANSLATIONS = {
  "auth.login": "Đăng nhập",
  "auth.logout": "Đăng xuất",
  "task.created": "Đã tạo nhiệm vụ",
  "task.updated": "Đã cập nhật nhiệm vụ",
  "task.deleted": "Đã xóa nhiệm vụ",
  "task.restored": "Đã khôi phục nhiệm vụ",
  "project.created": "Đã tạo dự án",
  "project.updated": "Đã cập nhật dự án",
  "project.deleted": "Đã xóa dự án",
  "member.invited": "Đã mời thành viên",
  "member.removed": "Đã loại bỏ thành viên",
  "user.disabled": "Đã vô hiệu hóa tài khoản",
  "user.enabled": "Đã kích hoạt tài khoản",
  "user.soft_deleted": "Đã xóa mềm tài khoản",
  "user.restored": "Đã khôi phục tài khoản",
};

// Translate Action into Vietnamese or Capitalize action
const translateAction = (action) => {
  return ACTION_TRANSLATIONS[action] || action.replace(/[._]/g, " ").toUpperCase();
};

// Assign pop-art badge styles based on action characteristics
const getActionBadgeStyle = (action) => {
  const lowercaseAction = action.toLowerCase();
  
  if (
    lowercaseAction.includes("delete") ||
    lowercaseAction.includes("disable") ||
    lowercaseAction.includes("remove") ||
    lowercaseAction.includes("soft_deleted")
  ) {
    // Red badge for destructive/warning actions
    return "bg-[#FF3B30] text-white border-2 border-black shadow-[1px_1px_0px_#000]";
  }
  
  if (
    lowercaseAction.includes("create") ||
    lowercaseAction.includes("restore") ||
    lowercaseAction.includes("enable") ||
    lowercaseAction.includes("login")
  ) {
    // Green badge for creation / restoration / success actions
    return "bg-[#4ADE80] text-black border-2 border-black shadow-[1px_1px_0px_#000]";
  }
  
  // Yellow/Blue for updates, invitations, logouts
  return "bg-[#00C2FF] text-black border-2 border-black shadow-[1px_1px_0px_#000]";
};

// Audit Log Card Component
const AuditLogCard = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const actionLabel = translateAction(log.action);
  const badgeClass = getActionBadgeStyle(log.action);
  
  const formattedTime = new Date(log.createdAt).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const hasSummary =
    (log.summaryBefore && Object.keys(log.summaryBefore).length > 0) ||
    (log.summaryAfter && Object.keys(log.summaryAfter).length > 0);

  return (
    <div
      className="bg-white border-4 border-[#111111] rounded-3xl p-4 md:p-6 transition-all hover:shadow-[6px_6px_0px_#111111] flex flex-col gap-4 shadow-[4px_4px_0px_#111111]"
    >
      {/* Top row: Actor profile + badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Actor User Profile */}
        <div className="flex items-center gap-3">
          <UserAvatar
            avatarUrl={log.actor?.avatarUrl}
            displayName={log.actor?.displayName || "Hệ thống"}
            sizeClassName="size-10 md:size-12"
            textClassName="text-sm font-black uppercase tracking-tight"
          />
          <div>
            <h4 className="font-black text-sm md:text-base text-[#111111] leading-tight">
              {log.actor?.displayName || "Hệ thống"}
            </h4>
            <p className="text-xs font-bold text-muted-foreground">
              {log.actor?.email || "system@taskdo.dev"}
            </p>
          </div>
        </div>

        {/* Action Badge & Timestamp */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${badgeClass}`}>
            {log.entityType}
          </span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Main Text Content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 border-t border-gray-100">
        <div className="flex-1">
          <span className="font-extrabold text-sm md:text-base text-[#111111] uppercase tracking-wide">
            {actionLabel}
          </span>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs font-bold text-muted-foreground">
            <span>ID thực thể: <span className="font-black text-[#111111]">{log.entityId}</span></span>
            {log.targetId && (
              <>
                <span className="text-gray-300">|</span>
                <span>Đối tượng tác động: <span className="font-black text-[#111111]">{log.targetId}</span></span>
              </>
            )}
          </div>
        </div>

        {hasSummary && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 self-end md:self-auto px-4 py-2 border-3 border-[#111111] bg-[#FFD60A] hover:bg-[#FFE66D] rounded-2xl font-black text-xs uppercase shadow-[2px_2px_0px_#111111] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none"
          >
            <span>{isExpanded ? "Ẩn chi tiết" : "Xem chi tiết"}</span>
            {isExpanded ? <ChevronUp width={14} height={14} /> : <ChevronDown width={14} height={14} />}
          </button>
        )}
      </div>

      {/* Expandable Changes Card */}
      {isExpanded && hasSummary && (
        <div className="bg-[#F8FAFC] border-3 border-dashed border-[#CBD5E1] p-4 rounded-2xl flex flex-col md:flex-row gap-4 mt-2">
          {/* Summary Before */}
          <div className="flex-1 bg-white border-2 border-[#111111] rounded-xl p-3 shadow-[2px_2px_0px_#111111]">
            <span className="text-[10px] font-black uppercase text-red-600 block mb-2 tracking-wider">
              TRƯỚC KHI THAY ĐỔI
            </span>
            <pre className="text-xs font-bold font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-40">
              {JSON.stringify(log.summaryBefore, null, 2)}
            </pre>
          </div>

          {/* Summary After */}
          <div className="flex-1 bg-white border-2 border-[#111111] rounded-xl p-3 shadow-[2px_2px_0px_#111111]">
            <span className="text-[10px] font-black uppercase text-green-600 block mb-2 tracking-wider">
              SAU KHI THAY ĐỔI
            </span>
            <pre className="text-xs font-bold font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-40">
              {JSON.stringify(log.summaryAfter, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AuditLogPage({ setActiveTab }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogsData = async () => {
    try {
      setLoading(true);
      const result = await fetchAuditLogs({
        page,
        limit: 10,
        search,
        action,
        entityType,
        from,
        to,
      });
      setLogs(result.logs);
      setPagination(result.pagination);
      setError(null);
    } catch (err) {
      console.error("Audit log fetch error:", err);
      setError(err.message || "Không thể tải nhật ký hoạt động");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsData();
  }, [page]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogsData();
  };

  const handleResetFilters = () => {
    setSearch("");
    setAction("");
    setEntityType("");
    setFrom("");
    setTo("");
    setPage(1);
    
    // Reset call directly
    setLoading(true);
    fetchAuditLogs({ page: 1, limit: 10 })
      .then((result) => {
        setLogs(result.logs);
        setPagination(result.pagination);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <main className="flex-1 w-full px-4 md:px-8 pt-8 md:pt-5 pb-32 md:pb-5 bg-[#FFFDF7] overflow-y-auto">
      <div className="w-full mx-auto space-y-6">
        {/* Navigation back triggers */}
        {setActiveTab && (
          <div className="flex items-center">
            <Button
              variant="outline"
              onClick={() => setActiveTab("home")}
              className="group flex items-center gap-2 rounded-xl border-[3px] border-border bg-card font-black uppercase text-foreground comic-shadow active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all hover:bg-black/5"
            >
              <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
              Quay lại
            </Button>
          </div>
        )}

        {/* Header Block */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-wide flex items-center gap-3">
            <Scroll className="text-[#FF2D55] size-8" />
            Audit Log
          </h1>
          <p className="text-gray-600 font-bold">
            Giám sát hoạt động của toàn bộ tài khoản người dùng trong hệ thống
          </p>
        </div>

        {/* Filters Box */}
        <form
          onSubmit={handleFilterSubmit}
          className="bg-white border-4 border-[#111111] rounded-3xl p-5 md:p-6 shadow-[4px_4px_0px_#111111] space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-[#111111] tracking-wide block">
                Tìm kiếm
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nhập email, tên user hoặc hành động..."
                  className="w-full h-11 pl-9 pr-4 rounded-xl border-3 border-black text-xs font-bold uppercase placeholder:lowercase focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#111111]"
                />
              </div>
            </div>

            {/* Action Type filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-[#111111] tracking-wide block">
                Hành động
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border-3 border-black text-xs font-black uppercase bg-white focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#111111] cursor-pointer"
                >
                  <option value="">TẤT CẢ HÀNH ĐỘNG</option>
                  <option value="auth.login">ĐĂNG NHẬP (auth.login)</option>
                  <option value="auth.logout">ĐĂNG XUẤT (auth.logout)</option>
                  <option value="task.created">ĐÃ TẠO NHIỆM VỤ (task.created)</option>
                  <option value="task.updated">ĐÃ CẬP NHẬT NHIỆM VỤ (task.updated)</option>
                  <option value="task.deleted">ĐÃ XÓA NHIỆM VỤ (task.deleted)</option>
                  <option value="task.restored">ĐÃ PHỤC HỒI NHIỆM VỤ (task.restored)</option>
                  <option value="project.created">ĐÃ TẠO DỰ ÁN (project.created)</option>
                  <option value="project.updated">ĐÃ CẬP NHẬT DỰ ÁN (project.updated)</option>
                  <option value="project.deleted">ĐÃ XÓA DỰ ÁN (project.deleted)</option>
                  <option value="member.invited">ĐÃ MỜI THÀNH VIÊN (member.invited)</option>
                  <option value="member.removed">ĐÃ LOẠI THÀNH VIÊN (member.removed)</option>
                  <option value="user.disabled">ĐÃ VÔ HIỆU HÓA USER (user.disabled)</option>
                  <option value="user.enabled">ĐÃ KÍCH HOẠT USER (user.enabled)</option>
                  <option value="user.soft_deleted">ĐÃ XÓA MỀM USER (user.soft_deleted)</option>
                  <option value="user.restored">ĐÃ KHÔI PHỤC USER (user.restored)</option>
                </select>
              </div>
            </div>

            {/* Entity Type filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-[#111111] tracking-wide block">
                Loại thực thể
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border-3 border-black text-xs font-black uppercase bg-white focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#111111] cursor-pointer"
                >
                  <option value="">TẤT CẢ THỰC THỂ</option>
                  <option value="user">NGƯỜI DÙNG (USER)</option>
                  <option value="task">NHIỆM VỤ (TASK)</option>
                  <option value="project">DỰ ÁN (PROJECT)</option>
                  <option value="session">PHIÊN ĐĂNG NHẬP (SESSION)</option>
                  <option value="comment">BÌNH LUẬN (COMMENT)</option>
                </select>
              </div>
            </div>

            {/* Date from filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-[#111111] tracking-wide block">
                Từ ngày
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border-3 border-black text-xs font-bold uppercase focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#111111] cursor-pointer"
                />
              </div>
            </div>

            {/* Date to filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-[#111111] tracking-wide block">
                Đến ngày
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border-3 border-black text-xs font-bold uppercase focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#111111] cursor-pointer"
                />
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex items-end gap-3 justify-end sm:col-span-2 lg:col-span-1 pt-1.5 sm:pt-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-11 px-5 border-3 border-[#111111] bg-white hover:bg-gray-50 rounded-xl font-black uppercase text-xs flex items-center gap-2 text-[#111111] shadow-[2px_2px_0px_#111111] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none"
              >
                <RotateCcw width={14} height={14} />
                <span>Đặt lại</span>
              </button>

              <button
                type="submit"
                className="h-11 px-6 border-3 border-[#111111] bg-[#FF2D55] hover:bg-[#FF1D45] rounded-xl font-black uppercase text-xs flex items-center gap-2 text-white shadow-[2px_2px_0px_#111111] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer select-none"
              >
                <Search width={14} height={14} />
                <span>Tìm kiếm</span>
              </button>
            </div>
          </div>
        </form>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center py-24">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mb-4" />
          </div>
        )}

        {/* Error message */}
        {!loading && error && (
          <div className="bg-red-50 border-3 border-[#FF3B30] rounded-2xl p-4 shadow-[3px_3px_0px_#111111]">
            <p className="text-red-700 font-bold">Lỗi tải nhật ký: {error}</p>
          </div>
        )}

        {/* Empty list state */}
        {!loading && !error && logs.length === 0 && (
          <div className="text-center py-16 bg-white border-4 border-[#111111] rounded-3xl shadow-[4px_4px_0px_#111111]">
            <p className="text-gray-600 font-extrabold text-lg uppercase tracking-wide">
              Không tìm thấy nhật ký hoạt động nào
            </p>
            <p className="text-xs font-bold text-muted-foreground mt-1 lowercase">
              hãy thử thay đổi hoặc đặt lại bộ lọc để tìm kiếm các bản ghi khác.
            </p>
          </div>
        )}

        {/* List of Audit Log Cards */}
        {!loading && !error && logs.length > 0 && (
          <div className="space-y-4">
            {logs.map((log) => (
              <AuditLogCard key={log.id} log={log} />
            ))}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-xs font-black uppercase text-muted-foreground tracking-wide">
                  TRANG {pagination.page} / {pagination.totalPages} ({pagination.total} logs)
                </span>
                
                <div className="flex items-center gap-3">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="h-10 w-10 border-3 border-[#111111] bg-white hover:bg-gray-50 disabled:bg-[#CBD5E1] disabled:text-[#94A3B8] disabled:cursor-not-allowed disabled:shadow-none rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#111111] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    <ChevronLeft width={18} height={18} />
                  </button>

                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-10 w-10 border-3 border-[#111111] bg-white hover:bg-gray-50 disabled:bg-[#CBD5E1] disabled:text-[#94A3B8] disabled:cursor-not-allowed disabled:shadow-none rounded-xl flex items-center justify-center shadow-[2px_2px_0px_#111111] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    <ChevronRight width={18} height={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
