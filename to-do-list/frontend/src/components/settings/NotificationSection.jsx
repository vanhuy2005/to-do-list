import { useState, useEffect } from "react";
import { BellIcon, MailIcon, ClockIcon, GlobeIcon, Loader2Icon, AlertTriangleIcon, CheckCircle2Icon, XCircleIcon, HistoryIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/axios";

// A robust set of international IANA timezones grouped by region
const allTimezones = [
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (UTC+07:00 - Việt Nam)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+07:00 - Thái Lan, Campuchia)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+08:00 - Singapore)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+09:00 - Nhật Bản)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (UTC+09:00 - Hàn Quốc)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30 - Ấn Độ)" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta (UTC+07:00 - Indonesia)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00 - UAE)" },
  { value: "Europe/London", label: "Europe/London (UTC+00:00 / +01:00 - Anh Quốc)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+01:00 / +02:00 - Pháp)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+01:00 / +02:00 - Đức)" },
  { value: "Europe/Rome", label: "Europe/Rome (UTC+01:00 / +02:00 - Ý)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+03:00 - Nga)" },
  { value: "America/New_York", label: "America/New_York (UTC-05:00 / -04:00 - Mỹ Đông)" },
  { value: "America/Chicago", label: "America/Chicago (UTC-06:00 / -05:00 - Mỹ Trung)" },
  { value: "America/Denver", label: "America/Denver (UTC-07:00 / -06:00 - Mỹ Núi)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (UTC-08:00 / -07:00 - Mỹ Tây)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (UTC-03:00 - Brazil)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+10:00 / +11:00 - Úc)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (UTC+12:00 / +13:00 - New Zealand)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" }
];

export default function NotificationSection() {
  const [preferences, setPreferences] = useState({
    emailOverdue: true,
    emailDigest: true,
    digestHour: 8,
    timezone: "Asia/Ho_Chi_Minh",
  });
  
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const [isTzFocused, setIsTzFocused] = useState(false);

  // Notification history state
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    fetchPreferences();
    fetchHistory(1);
  }, []);

  async function fetchPreferences() {
    setIsLoadingPrefs(true);
    try {
      const response = await api.get("/profile/notifications/preferences");
      if (response?.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error("Fetch prefs error:", error);
      toast.error("Lỗi kết nối", {
        description: "Không thể tải cấu hình thông báo của bạn.",
      });
    } finally {
      setIsLoadingPrefs(false);
    }
  }

  async function fetchHistory(targetPage) {
    setIsLoadingHistory(true);
    try {
      const response = await api.get(`/profile/notifications/history?page=${targetPage}&limit=5`);
      if (response?.success) {
        setHistory(response.data.logs || []);
        const paging = response.data.pagination;
        setPage(paging.page);
        setTotalPages(paging.totalPages);
        setTotalLogs(paging.total);
      }
    } catch (error) {
      console.error("Fetch history error:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  const handleUpdatePreference = async (key, value) => {
    setIsUpdating(true);
    const updatedPrefs = { ...preferences, [key]: value };
    
    // Optimistic UI update
    setPreferences(updatedPrefs);

    try {
      const response = await api.put("/profile/notifications/preferences", { [key]: value });
      if (response?.success) {
        setPreferences(response.data);
        toast.success("Đã cập nhật tùy chọn", {
          description: "Cấu hình nhận thông báo đã được lưu thành công.",
        });
      }
    } catch (error) {
      console.error("Update preference error:", error);
      toast.error("Cập nhật thất bại", {
        description: error?.response?.data?.error?.message || "Không thể lưu cấu hình của bạn.",
      });
      // Revert on error
      fetchPreferences();
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePageChange = (direction) => {
    const targetPage = direction === "next" ? page + 1 : page - 1;
    if (targetPage >= 1 && targetPage <= totalPages) {
      fetchHistory(targetPage);
    }
  };

  // Filter timezones based on search input
  const filteredTzs = allTimezones.filter((tz) =>
    tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    tz.value.toLowerCase().includes(tzSearch.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 rounded border-[2px] border-border bg-[#10b981] px-2 py-0.5 text-xs font-black text-white shadow-[1px_1px_0px_0px_#000000]">
            <CheckCircle2Icon className="size-3" /> THÀNH CÔNG
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded border-[2px] border-border bg-[#ff3b57] px-2 py-0.5 text-xs font-black text-white shadow-[1px_1px_0px_0px_#000000]">
            <XCircleIcon className="size-3" /> THẤT BẠI
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded border-[2px] border-border bg-[#ffd400] px-2 py-0.5 text-xs font-black text-foreground shadow-[1px_1px_0px_0px_#000000]">
            <ClockIcon className="size-3" /> ĐANG XỬ LÝ
          </span>
        );
      case "abandoned":
        return (
          <span className="inline-flex items-center gap-1 rounded border-[2px] border-border bg-[#6b7280] px-2 py-0.5 text-xs font-black text-white shadow-[1px_1px_0px_0px_#000000]">
            <AlertTriangleIcon className="size-3" /> TỪ BỎ
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoadingPrefs) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-[1.4rem] border-[3px] border-border bg-card comic-shadow min-h-[300px]">
        <Loader2Icon className="size-12 text-[#ffd400] animate-spin" />
        <span className="font-heading text-lg font-black uppercase tracking-tight text-foreground mt-4">
          Đang tải cấu hình...
        </span>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Configuration Box */}
      <div className="rounded-[1.4rem] border-[3px] border-border bg-card p-6 comic-shadow">
        <div className="flex items-center gap-3 border-b-[3px] border-border pb-4 mb-6">
          <BellIcon className="size-7 text-[#ffd400] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" />
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
            Thông báo qua Email
          </h2>
        </div>

        <div className="space-y-6">
          {/* Preference 1: Email Overdue */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label className="font-heading text-base font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                <MailIcon className="size-4 text-[#ff3b57]" /> Báo công việc quá hạn
              </label>
              <p className="text-xs font-bold text-muted-foreground max-w-sm">
                Nhận email cảnh báo riêng biệt trong vòng 15 phút ngay sau khi công việc của bạn bị trễ hạn chót.
              </p>
            </div>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleUpdatePreference("emailOverdue", !preferences.emailOverdue)}
              className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border-[3px] border-border transition-colors ${
                preferences.emailOverdue ? "bg-[#ffd400] shadow-[2px_2px_0px_0px_#000000]" : "bg-muted"
              }`}
            >
              <span className={`size-5 rounded-full border-[3px] border-border bg-foreground transition-transform ${
                preferences.emailOverdue ? "translate-x-8" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {/* Preference 2: Email Digest */}
          <div className="flex items-start justify-between gap-4 border-t-[2px] border-border/10 pt-5">
            <div className="space-y-1">
              <label className="font-heading text-base font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                <ClockIcon className="size-4 text-[#00c2ff]" /> Báo cáo tổng hợp hàng ngày
              </label>
              <p className="text-xs font-bold text-muted-foreground max-w-sm">
                Gộp tất cả công việc đang trễ hạn vào một email tổng hợp, gửi một lần duy nhất vào khung giờ lựa chọn.
              </p>
            </div>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleUpdatePreference("emailDigest", !preferences.emailDigest)}
              className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border-[3px] border-border transition-colors ${
                preferences.emailDigest ? "bg-[#ffd400] shadow-[2px_2px_0px_0px_#000000]" : "bg-muted"
              }`}
            >
              <span className={`size-5 rounded-full border-[3px] border-border bg-foreground transition-transform ${
                preferences.emailDigest ? "translate-x-8" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {/* Daily Digest Hour Picker */}
          {preferences.emailDigest && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-[2px] border-border/10 pt-5">
              <div className="space-y-1">
                <span className="font-heading text-sm font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                  Giờ nhận Daily Digest
                </span>
                <p className="text-xs font-bold text-muted-foreground">
                  Lựa chọn giờ địa phương phù hợp nhất để nhận email gộp hàng ngày.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={String(preferences.digestHour)}
                  onValueChange={(val) => handleUpdatePreference("digestHour", parseInt(val))}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-[120px] border-[3px] border-border shadow-[2px_2px_0px_0px_#000000]">
                    <SelectValue placeholder="Chọn giờ" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] border-[3px] border-border">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {`${String(i).padStart(2, "0")}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Searchable Timezone Selector */}
          <div className="flex flex-col gap-3 border-t-[2px] border-border/10 pt-5 relative">
            <div className="space-y-1">
              <label className="font-heading text-sm font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                <GlobeIcon className="size-4 text-[#10b981]" /> Múi giờ địa phương (IANA)
              </label>
              <p className="text-xs font-bold text-muted-foreground">
                Đảm bảo giờ trễ hạn trong thư và thời điểm gửi Daily Digest khớp chính xác với lịch trình thực tế của bạn.
              </p>
            </div>
            
            <div className="relative w-full max-w-[400px]">
              <Input
                type="text"
                placeholder="Tìm kiếm múi giờ (Ví dụ: Asia/Ho_Chi_Minh)..."
                value={tzSearch || preferences.timezone}
                onFocus={() => {
                  setIsTzFocused(true);
                  setTzSearch(preferences.timezone);
                }}
                onBlur={() => {
                  // Wait to allow clicks on options
                  setTimeout(() => setIsTzFocused(false), 200);
                }}
                onChange={(e) => setTzSearch(e.target.value)}
                disabled={isUpdating}
                className="h-10 border-[3px] border-border bg-background shadow-[2px_2px_0px_0px_#000000] text-sm pr-10 font-bold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground select-none uppercase">
                {preferences.timezone.split("/")[1]?.replace("_", " ") || "Ho Chi Minh"}
              </span>

              {/* Autocomplete List */}
              {isTzFocused && (
                <div className="absolute top-[44px] left-0 right-0 z-50 max-h-[220px] overflow-y-auto border-[3px] border-border bg-popover rounded-md shadow-[4px_4px_0px_0px_#000000] divide-y-[2px] divide-border">
                  {filteredTzs.length > 0 ? (
                    filteredTzs.map((tz) => (
                      <div
                        key={tz.value}
                        onMouseDown={() => {
                          handleUpdatePreference("timezone", tz.value);
                          setTzSearch("");
                        }}
                        className={`px-4 py-2 text-xs font-bold cursor-pointer hover:bg-secondary/30 transition-colors flex items-center justify-between ${
                          preferences.timezone === tz.value ? "bg-secondary/15 text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span>{tz.label}</span>
                        {preferences.timezone === tz.value && (
                          <span className="text-[10px] font-black uppercase text-[#10b981]">Đang chọn</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs font-bold text-muted-foreground text-center">
                      Không tìm thấy múi giờ nào phù hợp.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="rounded-[1.4rem] border-[3px] border-border bg-card p-6 comic-shadow">
        <div className="flex items-center gap-3 border-b-[3px] border-border pb-4 mb-6">
          <HistoryIcon className="size-7 text-[#00c2ff] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" />
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-foreground flex-1">
            Lịch sử Thông báo
          </h2>
          <span className="text-xs font-black uppercase bg-secondary px-2.5 py-1 border-[2px] border-border rounded shadow-[2px_2px_0px_0px_#000000] select-none">
            Tổng cộng: {totalLogs}
          </span>
        </div>

        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center py-10 min-h-[160px]">
            <Loader2Icon className="size-8 text-[#00c2ff] animate-spin" />
            <span className="text-xs font-bold text-muted-foreground mt-2">Đang tải lịch sử...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-[2px] border-dashed border-border/30 bg-[#fffaf0] p-6">
            <MailIcon className="size-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-bold text-muted-foreground">
              Không tìm thấy hoạt động gửi thông báo nào trước đây.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {history.map((log) => {
                const isDigest = log.type === "overdue_digest";
                const localDateStr = new Date(log.createdAt).toLocaleString("vi-VN", {
                  timeZone: preferences.timezone,
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                });

                return (
                  <div
                    key={log._id}
                    className="group border-[3px] border-border rounded-xl bg-background p-4 shadow-[3px_3px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000000] transition-all flex flex-col md:flex-row justify-between md:items-center gap-3"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black border-[2px] border-border shadow-[1px_1px_0px_0px_#000000] ${
                          isDigest ? "bg-[#00c2ff] text-white" : "bg-[#ffd400] text-foreground"
                        }`}>
                          {isDigest ? "BẢN GỘP DAILY DIGEST" : "CẢNH BÁO ĐƠN LẺ"}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          {localDateStr}
                        </span>
                      </div>

                      <h4 className="font-heading text-sm font-black uppercase text-foreground truncate">
                        {isDigest 
                          ? "Báo cáo công việc quá hạn hàng ngày" 
                          : `Quá hạn: ${log.taskSnapshot?.title || "Không có tiêu đề"}`}
                      </h4>

                      {!isDigest && log.taskSnapshot && (
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          Độ ưu tiên: 
                          <span className={`font-black ${
                            log.taskSnapshot.priority === "high" ? "text-[#ff3b57]" : 
                            log.taskSnapshot.priority === "medium" ? "text-[#ffd400]" : "text-[#10b981]"
                          }`}>
                            {log.taskSnapshot.priority === "high" ? "🔴 CAO" : 
                             log.taskSnapshot.priority === "medium" ? "🟡 TRUNG BÌNH" : "🟢 THẤP"}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 border-t-[1px] border-border/10 md:border-t-0 pt-2.5 md:pt-0 shrink-0">
                      {/* Delivery Status Badge */}
                      {getStatusBadge(log.status)}

                      {/* Error details snippet for failure debugging */}
                      {log.status === "failed" && log.error && (
                        <div className="relative group/tooltip">
                          <AlertTriangleIcon className="size-5 text-[#ff3b57] cursor-help" />
                          <div className="absolute right-0 bottom-6 z-50 hidden group-hover/tooltip:block w-64 bg-black/90 text-white text-[10px] font-bold p-3.5 rounded border border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                            <p className="font-black text-[#ff3b57] uppercase mb-1">Mã lỗi hệ thống:</p>
                            <p className="italic">{log.error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4 border-t-[2px] border-border/10">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || isLoadingHistory}
                  onClick={() => handlePageChange("prev")}
                  className="h-8 border-[3px] border-border text-xs font-black shadow-[2px_2px_0px_0px_#000000] px-3.5"
                >
                  <ChevronLeft className="size-4" /> TRANG TRƯỚC
                </Button>
                <span className="text-xs font-black select-none text-foreground uppercase">
                  Trang {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages || isLoadingHistory}
                  onClick={() => handlePageChange("next")}
                  className="h-8 border-[3px] border-border text-xs font-black shadow-[2px_2px_0px_0px_#000000] px-3.5"
                >
                  TRANG SAU <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
