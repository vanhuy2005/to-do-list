import React, { useState, useEffect, useRef } from "react";
import { Rocket, CalendarDays, FileText, FileDown } from "lucide-react";
import api from "@/lib/axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import AdminSidebarNav from "./AdminSidebarNav";
import UserAvatar from "@/components/UserAvatar";

// ─────────────────────────────────────────────────────────────────────────────
// Header Component
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsHeader = () => (
  <header
    className="h-20.25 md:h-27.5 bg-[#FFD60A] border-b-4 md:border-b-5 border-[#111111] flex items-center justify-between px-4 md:px-12 shrink-0"
    style={{ boxShadow: "0 4px 0 #111111" }}
  >
    {/* Logo */}
    <div
      className="w-11 md:w-16 h-11 md:h-16 bg-[#FFFDF7] border-4 md:border-5 border-[#111111] rounded-xl flex items-center justify-center shrink-0"
      style={{
        transform: "rotate(3deg)",
        boxShadow: "3px 3px 0 #111111",
      }}
    >
      <Rocket
        width={24}
        height={24}
        className="text-[#FF2D55] md:w-8 md:h-8"
        style={{ transform: "rotate(3deg)" }}
      />
    </div>

    {/* Title */}
    <div className="flex-1 flex items-center gap-2 md:gap-4 ml-3">
      <span
        className="font-black text-xl md:text-3xl text-[#111111] border-2 md:border-4 border-[#111111] px-1 md:px-3 py-0 md:py-1"
        style={{ letterSpacing: "3px", fontFamily: "Segoe UI" }}
      >
        PHÂN
      </span>
      <div
        className="bg-[#FF2D55] border-4 md:border-5 border-[#111111] px-2 md:px-4 py-0 md:py-1 rounded text-white font-black text-xl md:text-2xl"
        style={{
          fontFamily: "Anton",
          transform: "rotate(-2deg)",
        }}
      >
        TÍCH
      </div>
    </div>
  </header>
);

// ─────────────────────────────────────────────────────────────────────────────
// Export Buttons Component (Simple clean floating buttons, no container section)
// ─────────────────────────────────────────────────────────────────────────────
const ExportButtons = ({ onExportCSV, onExportPDF }) => {
  if (!onExportCSV || !onExportPDF) return null;
  return (
    <div className="flex items-center justify-end gap-3 mb-6">
      <button
        onClick={onExportCSV}
        className="h-10 px-5 border-3 border-[#111111] bg-white hover:bg-gray-50 rounded-2xl font-black uppercase text-[11px] md:text-xs flex items-center gap-2 text-[#0F172A] shadow-[2px_2px_0px_#111111] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
      >
        <FileText width={14} height={14} />
        <span>Xuất CSV</span>
      </button>

      <button
        onClick={onExportPDF}
        className="h-10 px-5 border-3 border-[#111111] bg-[#FF2E54] hover:bg-[#FF1D45] rounded-2xl font-black uppercase text-[11px] md:text-xs flex items-center gap-2 text-white shadow-[2px_2px_0px_#111111] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
      >
        <FileDown width={14} height={14} />
        <span>Xuất PDF</span>
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Bottom Navigation Component
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsBottomNav = ({ activeTab, setActiveTab }) => {
  const NAV_ITEMS = [
    { id: "home", label: "Trang chủ" },
    { id: "analytics", label: "Phân tích" },
    { id: "users", label: "Người dùng" },
    { id: "profile", label: "Cá nhân" },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 h-24 bg-[#FFFDF7] border-t-4 border-[#111111] flex items-center justify-around px-4 shrink-0"
      style={{ boxShadow: "0 -4px 0 #111111" }}
    >
      {NAV_ITEMS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className="flex flex-col items-center gap-2 focus:outline-none transition text-xs font-bold uppercase"
        >
          <span
            className={activeTab === id ? "text-[#FF2E54]" : "text-[#64748B]"}
            style={{
              letterSpacing: "0.5px",
              fontFamily: "Segoe UI",
            }}
          >
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
};

// User Growth Bar Chart Card
const UserGrowthCard = ({ data = [], timeRange, setTimeRange }) => {
  const values = (data || []).map((item) =>
    typeof item === "object" ? item.value : item
  );
  const maxValue = Math.max(...values, 1);

  // Create chart data with proper heights (scale to 180px max)
  const chartData = (data || []).map((item, idx) => {
    const count = typeof item === "object" ? item.value : item;
    const label = typeof item === "object" ? item.label : `N${idx + 1}`;
    const height = Math.max(10, (count / maxValue) * 180);

    let color = "rgba(255, 46, 84, 0.2)";
    if (idx % 7 === 4) color = "#FF2D55"; // Pink
    else if (idx % 7 === 5) color = "#FFD60A"; // Yellow
    else if (idx % 7 === 6) color = "#00C2FF"; // Sky Blue
    else if (idx % 7 === 3) color = "#10B981"; // Green
    else color = "rgba(255, 46, 84, 0.5)";

    return { label, height, color, count };
  });

  const barWidth = chartData.length > 30 ? "6px" : chartData.length > 7 ? "16px" : "40px";
  const gapClass = chartData.length > 30 ? "gap-1" : chartData.length > 7 ? "gap-2" : "gap-4";

  return (
    <div
      className="w-full bg-white border-4 md:border-5 border-[#111111] rounded-3xl p-4 md:p-6"
      style={{ boxShadow: "4px 4px 0 #111111" }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <h3
            className="text-lg md:text-xl font-black text-[#0F172A] uppercase"
            style={{ letterSpacing: "2px", fontFamily: "Segoe UI" }}
          >
            Tăng Trưởng Người Dùng
          </h3>
          <div
            className="bg-[#FF2E54] border-4 border-[#111111] px-3 py-1 rounded text-white font-bold text-xs uppercase"
            style={{ fontFamily: "Plus Jakarta Sans", letterSpacing: "1px" }}
          >
            LIVE
          </div>
        </div>

        {/* Segmented Time Range Toggles inside card header */}
        {timeRange && setTimeRange && (
          <div className="flex items-center gap-1.5 bg-[#FFFDF7] border-3 border-black rounded-2xl p-1 shadow-[2px_2px_0px_#000] w-fit shrink-0">
            {[
              { id: "7days", label: "7 ngày" },
              { id: "30days", label: "30 ngày" },
              { id: "90days", label: "90 ngày" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTimeRange(item.id)}
                className={`h-8 px-3 rounded-xl font-black uppercase text-[10px] transition-all duration-200 cursor-pointer ${
                  timeRange === item.id
                    ? "bg-[#FF2D55] text-white shadow-[1px_1px_0px_#000]"
                    : "bg-transparent text-gray-700 hover:bg-black/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="bg-[#F8FAFC] border-2 md:border-3 border-dashed border-[#CBD5E1] p-3 md:p-4 rounded-xl overflow-x-auto">
        {/* Bars Container - using flex for perfect layout */}
        <div
          className={`flex h-48 md:h-56 mb-4 items-end justify-center ${gapClass}`}
        >
          {chartData.map((item, idx) => (
            <div
              key={idx}
              title={`${item.label}: ${item.count} người dùng`}
              className="transition-all hover:opacity-80"
              style={{
                height: `${item.height}px`,
                width: barWidth,
                backgroundColor: item.color,
                border: "2px solid #111111",
                borderRadius: "2px",
              }}
            />
          ))}
        </div>

        {/* X-axis Labels */}
        <div
          className={`flex justify-center ${gapClass}`}
        >
          {chartData.map((item, idx) => (
            <div
              key={idx}
              className="text-[9px] md:text-xs font-bold text-[#94A3B8] uppercase text-center truncate shrink-0"
              style={{
                fontFamily: "Plus Jakarta Sans",
                width: barWidth,
              }}
            >
              {chartData.length <= 7 || idx % Math.ceil(chartData.length / 7) === 0 ? item.label : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Task Status Donut Card
const TaskStatusCard = ({ data = {} }) => {
  const doneCount = data.done || 0;
  const doingCount = data.doing || 0;
  const todoCount = data.todo || 0;
  const total = doneCount + doingCount + todoCount;
  const donePercentage = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div
      className="w-full bg-white border-4 md:border-5 border-[#111111] rounded-3xl p-4 md:p-6"
      style={{ boxShadow: "4px 4px 0 #111111" }}
    >
      {/* Header */}
      <h3
        className="text-lg md:text-xl font-black text-[#0F172A] uppercase mb-6 md:mb-8"
        style={{ letterSpacing: "2px", fontFamily: "Segoe UI" }}
      >
        Trạng Thái Nhiệm Vụ
      </h3>

      {/* Chart + Legend */}
      <div className="flex items-center gap-6 md:gap-8">
        {/* Donut Chart */}
        <div className="shrink-0">
          <div
            className="relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center"
            style={{
              border: "8px solid #FF2E54",
              background:
                "conic-gradient(#FF2E54 0deg 270deg, #FFD60A 270deg 360deg)",
            }}
          >
            {/* Inner circle to create donut */}
            <div
              className="absolute w-24 h-24 md:w-32 md:h-32 bg-white rounded-full"
              style={{
                border: "3px solid #111111",
              }}
            />
            {/* Percentage text */}
            <div
              className="absolute font-black text-3xl md:text-4xl text-[#0F172A] text-center"
              style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 700 }}
            >
              {donePercentage}%
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 md:gap-4">
          {[
            { color: "#FF2E54", label: "ĐÃ XONG", count: doneCount },
            { color: "#FFD60A", label: "ĐANG LÀM", count: doingCount },
            { color: "#000000", label: "ĐÃ HỦY", count: todoCount },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 md:gap-3">
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: item.color,
                  border: "3px solid #111111",
                }}
              />
              <span
                className="font-bold text-sm md:text-base text-[#0F172A] uppercase"
                style={{ fontFamily: "Segoe UI" }}
              >
                {item.label}: {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Top Users Card
const TopUsersCard = ({ users = [] }) => {
  const defaultUsers = [
    { displayName: "Nguyễn Văn A", taskCount: 342, color: "#FF2E54" },
    { displayName: "Lê Thị B", taskCount: 289, color: "#000000" },
    { displayName: "Trần Văn C", taskCount: 156, color: "#CBD5E1" },
  ];

  const displayUsers = users.length > 0 ? users : defaultUsers;

  return (
    <div
      className="w-full bg-[#FFD60A] border-4 md:border-5 border-[#111111] rounded-3xl p-4 md:p-6 gap-4 flex flex-col"
      style={{ boxShadow: "4px 4px 0 #111111" }}
    >
      {/* Header */}
      <h3
        className="text-lg md:text-xl font-black text-[#000000] uppercase"
        style={{ letterSpacing: "2px", fontFamily: "Plus Jakarta Sans" }}
      >
        Top Người Dùng
      </h3>

      {/* User Rows */}
      <div className="flex flex-col gap-3 md:gap-4">
        {displayUsers.map((user, idx) => (
          <div
            key={idx}
            className="bg-white border-4 border-[#111111] px-3 md:px-4 py-2 md:py-3 rounded flex items-center justify-between"
            style={{ boxShadow: "2px 2px 0 #111111" }}
          >
            {/* Left side - Avatar + Name */}
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              {/* Avatar */}
              <UserAvatar
                avatarUrl={user.avatarUrl}
                displayName={user.displayName}
                sizeClassName="size-8 md:size-10"
                textClassName="text-xs font-black uppercase tracking-tight"
              />
              {/* Name */}
              <div className="flex flex-col gap-1 flex-1">
                <div
                  className="font-bold text-sm md:text-base text-[#0F172A]"
                  style={{ fontFamily: "Segoe UI" }}
                >
                  {user.displayName}
                </div>
                <div
                  className="font-bold text-xs md:text-sm text-[#64748B] uppercase"
                  style={{
                    fontFamily: "Plus Jakarta Sans",
                    letterSpacing: "0.5px",
                  }}
                >
                  {user.taskCount} NHIỆM VỤ
                </div>
              </div>
            </div>

            {/* Right side - Task count */}
            <div
              className="text-lg md:text-2xl font-black text-[#0F172A] ml-2"
              style={{ fontFamily: "Segoe UI" }}
            >
              {user.taskCount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AnalyticsDashboard({ activeTab, setActiveTab }) {
  const [analyticsData, setAnalyticsData] = useState({
    userGrowthTrend: [],
    taskDistribution: {},
    topUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("7days");
  const contentRef = useRef(null);

  // ─── Export CSV ────────────────────────────────────────────────
  const handleExportCSV = () => {
    const {
      userGrowthTrend = [],
      taskDistribution = {},
      topUsers = [],
    } = analyticsData;
    const days = ["TH2", "TH3", "TH4", "TH5", "TH6", "TH7", "CN"];

    const rows = [
      ["Loại", "Nhãn / Tên", "Giá trị"],
      ...userGrowthTrend.map((count, i) => [
        "Tăng trưởng người dùng",
        days[i] ?? `Ngày ${i + 1}`,
        count,
      ]),
      ["Trạng thái nhiệm vụ", "Đã xong", taskDistribution.done ?? 0],
      ["Trạng thái nhiệm vụ", "Đang làm", taskDistribution.doing ?? 0],
      ["Trạng thái nhiệm vụ", "Đã hủy", taskDistribution.todo ?? 0],
      ...topUsers.map((u) => ["Top người dùng", u.displayName, u.taskCount]),
    ];

    const csvContent =
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export PDF ────────────────────────────────────────────────
  const handleExportPDF = async () => {
    const node = contentRef.current;
    if (!node) return;

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFDF7",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;

      let yPos = 0;
      while (yPos < imgH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yPos, pageW, imgH);
        yPos += pageH;
      }

      pdf.save(`analytics_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const result = await api.get(`/admin/analytics?range=${timeRange}`);
        if (result.success && result.data) {
          setAnalyticsData(result.data);
        }
        setError(null);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError(err.message || "Failed to fetch analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  if (error) {
    return (
      <div className="w-screen min-h-screen bg-[#FFFDF7] flex flex-col">
        {/* Top Header - spans 100% width */}
        <AnalyticsHeader />

        {/* Main container underneath header */}
        <div className="flex-1 flex flex-row min-h-0 relative">
          {/* Sidebar - Desktop only */}
          <AdminSidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Right Column: Error Message */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <main className="flex-1 px-4 lg:px-8 pt-6 lg:pt-8 pb-32 lg:pb-8 flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-red-600 font-bold text-lg mb-4">Lỗi: {error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 border-3 border-black bg-primary text-white font-black uppercase text-xs rounded-xl shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            </main>
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <AnalyticsBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-[#FFFDF7] flex flex-col">
      {/* Top Header - spans 100% width */}
      <AnalyticsHeader />

      {/* Main container underneath header */}
      <div className="flex-1 flex flex-row min-h-0 relative">
        {/* Sidebar - Desktop only */}
        <AdminSidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area Column */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Main Content */}
          <main
            ref={contentRef}
            className="flex-1 px-4 lg:px-8 pt-6 lg:pt-8 pb-32 lg:pb-8"
          >
            {/* Simple Floating Export Buttons (Integrated directly without a section box) */}
            <ExportButtons
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
            />
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <p className="text-lg font-bold text-[#0F172A]">
                  Đang tải dữ liệu...
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: Single column */}
                <div className="lg:hidden space-y-6">
                  <UserGrowthCard
                    data={analyticsData.userGrowthTrend || []}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                  />
                  <TaskStatusCard data={analyticsData.taskDistribution || {}} />
                  <TopUsersCard users={analyticsData.topUsers || []} />
                </div>

                {/* Desktop: 3-column grid */}
                <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
                  {/* Left Column - 2 columns wide */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <UserGrowthCard
                      data={analyticsData.userGrowthTrend || []}
                      timeRange={timeRange}
                      setTimeRange={setTimeRange}
                    />
                    <TaskStatusCard data={analyticsData.taskDistribution || {}} />
                  </div>

                  {/* Right Column - 1 column */}
                  <div>
                    <TopUsersCard users={analyticsData.topUsers || []} />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <AnalyticsBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
