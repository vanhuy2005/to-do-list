import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Rocket, FileText, Settings, Trash2 } from "lucide-react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import AdminSidebarNav from "./AdminSidebarNav";
import { UsersList } from "./UsersList";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";

// ─────────────────────────────────────────────────────────────────────────────
// Header Component
// ─────────────────────────────────────────────────────────────────────────────
const AdminHeader = () => (
  <header
    className="h-20.25 md:h-27.5 bg-[#FFD60A] border-b-4 md:border-b-5 border-[#111111] flex items-center justify-between px-4 md:px-8 shrink-0"
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
        className="font-black text-2xl md:text-4xl text-[#111111] border-2 md:border-4 border-[#111111] px-1 md:px-3 py-0 md:py-1"
        style={{ letterSpacing: "3px", fontFamily: "Segoe UI" }}
      >
        ADMIN
      </span>
      <div
        className="bg-[#FF2D55] border-4 md:border-5 border-[#111111] px-2 md:px-4 py-0 md:py-1 rounded text-white font-black text-2xl md:text-3xl"
        style={{
          fontFamily: "Anton",
          transform: "rotate(-2deg)",
        }}
      >
        PANEL
      </div>
    </div>
  </header>
);

// ─────────────────────────────────────────────────────────────────────────────
// Stat card component
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, badge, rotateDir = "left" }) => (
  <div
    className="bg-white border-4 md:border-5 border-[#111111] rounded-3xl p-4 md:p-6 flex flex-col justify-between h-40 md:h-52"
    style={{
      transform: rotateDir === "left" ? "rotate(-1deg)" : "rotate(1deg)",
      boxShadow: "8px 8px 0 #111111",
    }}
  >
    <div
      className="text-xs md:text-sm font-semibold text-[#111111] opacity-60 uppercase tracking-wide"
      style={{ fontFamily: "Plus Jakarta Sans" }}
    >
      {label}
    </div>
    <div
      className="text-4xl md:text-5xl font-black text-[#111111]"
      style={{
        letterSpacing: "-1.5px",
        fontFamily: "Segoe UI",
      }}
    >
      {value}
    </div>
    <div className="bg-[#4ADE80] border-2 md:border-3 border-[#111111] rounded px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-bold text-[#111111] w-fit">
      {badge}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// System card component
// ─────────────────────────────────────────────────────────────────────────────
const SystemCard = ({
  label,
  icon: Icon,
  bgColor,
  textColor,
  iconBgColor,
  iconColor,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`${bgColor} border-4 md:border-5 border-[#111111] rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center gap-4 md:gap-5 h-40 md:h-52 ${onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
    style={{
      boxShadow: "4px 4px 0 #111111",
    }}
  >
    <div
      className={`w-16 md:w-20 h-16 md:h-20 ${iconBgColor} border-4 md:border-5 border-[#111111] rounded-full flex items-center justify-center`}
    >
      <Icon width={28} height={28} className={`${iconColor} md:scale-125`} />
    </div>
    <div
      className={`text-sm md:text-base font-black uppercase ${textColor} text-center tracking-wide`}
      style={{ fontFamily: "Plus Jakarta Sans" }}
    >
      {label}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Home Content Component
// ─────────────────────────────────────────────────────────────────────────────
const HomeContent = ({ setActiveTab }) => (
  <main className="flex-1 w-full px-4 md:px-8 pt-8 md:pt-12 pb-32 md:pb-12 bg-[#FFFDF7] overflow-y-auto">
    <div className="space-y-8 md:space-y-12 w-full md:max-w-4xl mx-auto">
      {/* CHỈ SỐ QUAN TRỌNG Section */}
      <section>
        <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="w-2 h-8 md:h-10 bg-[#FF2D55] border-2 md:border-3 border-[#111111]"></div>
          <h2
            className="text-xl md:text-2xl font-black text-[#111111] uppercase"
            style={{ letterSpacing: "2px", fontFamily: "Segoe UI" }}
          >
            Chỉ Số Quan Trọng
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <StatCard
            label="NGƯỜI DÙNG MỚI"
            value="1,250"
            badge="+12%"
            rotateDir="left"
          />
          <StatCard
            label="LƯỢT TRUY CẬP"
            value="45.8K"
            badge="+5%"
            rotateDir="right"
          />
        </div>
      </section>

      {/* QUẢN LÝ HỆ THỐNG Section */}
      <section>
        <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="w-2 h-8 md:h-10 bg-[#00C2FF] border-2 md:border-3 border-[#111111]"></div>
          <h2
            className="text-xl md:text-2xl font-black text-[#111111] uppercase"
            style={{ letterSpacing: "2px", fontFamily: "Segoe UI" }}
          >
            Quản Lý Hệ Thống
          </h2>
        </div>

        {/* Audit Log - Full Width */}
        <div
          className="w-full bg-[#00C2FF] border-4 md:border-5 border-[#111111] rounded-3xl py-4 md:py-6 px-4 md:px-6 flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 md:gap-5 mb-4 md:mb-6"
          style={{
            boxShadow: "4px 4px 0 #111111",
            minHeight: "140px",
          }}
        >
          <div className="w-16 md:w-20 h-16 md:h-20 bg-[#FFFDF7] border-4 md:border-5 border-[#111111] rounded-full flex items-center justify-center shrink-0">
            <FileText
              width={28}
              height={28}
              className="text-[#111111] md:scale-125"
            />
          </div>
          <div
            className="text-sm md:text-base font-bold text-white uppercase text-center md:text-left"
            style={{ fontFamily: "Plus Jakarta Sans", letterSpacing: "1px" }}
          >
            AUDIT LOG
          </div>
        </div>

        {/* System Cards Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <SystemCard
            label="CÀI ĐẶT"
            icon={Settings}
            bgColor="bg-[#FFD60A]"
            textColor="text-[#111111]"
            iconBgColor="bg-[#FFFDF7]"
            iconColor="text-[#111111]"
            onClick={() => setActiveTab("settings")}
          />
          <SystemCard
            label="THÙNG RÁC"
            icon={Trash2}
            bgColor="bg-[#FFFDF7]"
            textColor="text-[#111111]"
            iconBgColor="bg-[#111111]"
            iconColor="text-[#FFFDF7]"
          />
        </div>
      </section>
    </div>
  </main>
);

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Bottom Navigation
// ─────────────────────────────────────────────────────────────────────────────
const AdminBottomNav = ({ activeTab, setActiveTab }) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Admin Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Profile Content Component
// ─────────────────────────────────────────────────────────────────────────────
const ProfileContent = () => (
  <main className="flex-1 w-full px-4 md:px-8 pt-8 md:pt-5 pb-32 md:pb-5 bg-[#FFFDF7] overflow-y-auto">
    <div className="w-full mx-auto">
      <ProfilePage isAdmin={true} />
    </div>
  </main>
);

// ─────────────────────────────────────────────────────────────────────────────
// Users Content Component
// ─────────────────────────────────────────────────────────────────────────────
const UsersContent = () => (
  <main className="flex-1 w-full px-4 md:px-8 pt-8 md:pt-5 pb-32 md:pb-5 bg-[#FFFDF7] overflow-y-auto">
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quản lý người dùng
        </h1>
        <p className="text-gray-600">
          Xem và quản lý tất cả người dùng trong hệ thống
        </p>
      </div>
      <UsersList />
    </div>
  </main>
);

// ─────────────────────────────────────────────────────────────────────────────
// Settings Content Component
// ─────────────────────────────────────────────────────────────────────────────
const SettingsContent = ({ setActiveTab }) => (
  <main className="flex-1 w-full bg-[#FFFDF7] overflow-y-auto">
    <div className="w-full">
      <SettingsPage setActiveTab={setActiveTab} />
    </div>
  </main>
);

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "home";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync state with URL params
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  // Sync URL params with state when URL changes
  useEffect(() => {
    const tab = searchParams.get("tab") || "home";
    setActiveTab(tab);
  }, [searchParams]);

  // Show Analytics Dashboard when analytics tab is active
  if (activeTab === "analytics") {
    return (
      <AnalyticsDashboard activeTab={activeTab} setActiveTab={setActiveTab} />
    );
  }

  // Determine which content to show
  const getMainContent = () => {
    if (activeTab === "profile") {
      return <ProfileContent />;
    }
    if (activeTab === "users") {
      return <UsersContent />;
    }
    if (activeTab === "settings") {
      return <SettingsContent setActiveTab={setActiveTab} />;
    }
    return <HomeContent setActiveTab={setActiveTab} />;
  };

  return (
    <div className="w-screen min-h-screen bg-[#FFFDF7] flex flex-col lg:flex-row">
      {/* Sidebar - Desktop only, narrow */}
      <AdminSidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Header - Mobile only */}
      <div className="lg:hidden w-full order-first">
        <AdminHeader />
      </div>

      {/* Main Column Container */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-auto">
        {/* Header - Desktop only */}
        <div className="hidden lg:block">
          <AdminHeader />
        </div>

        {/* Main Content */}
        {getMainContent()}
      </div>

      {/* Mobile Bottom Nav - Mobile only */}
      <AdminBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
