// import { useEffect, useState } from "react";
// import { LogOutIcon, MailIcon, MapPinIcon, Rocket } from "lucide-react";
// import { toast } from "sonner";

// import { Button } from "@/components/ui/button";
// import { Skeleton } from "@/components/ui/skeleton";
// import api from "@/lib/axios";
// import authService from "@/services/authService";
// import AdminSidebarNav from "./AdminSidebarNav";

// const formatDate = (value) => {
//   if (!value) {
//     return "Chưa cập nhật";
//   }

//   return new Date(value).toLocaleDateString("vi-VN", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//   });
// };

// function AdminProfileSkeleton() {
//   return (
//     <section className="relative space-y-4 pb-24">
//       <Skeleton className="h-56 rounded-none" />
//       <div className="px-4 space-y-4 -mt-10">
//         <Skeleton className="h-32 rounded-2xl" />
//         <Skeleton className="h-56 rounded-[1.6rem]" />
//       </div>
//     </section>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Admin Header
// // ─────────────────────────────────────────────────────────────────────────────
// const AdminHeader = () => (
//   <header
//     className="h-20.25 md:h-27.5 bg-[#FFD60A] border-b-4 md:border-b-5 border-[#111111] flex items-center justify-between px-4 md:px-8 shrink-0"
//     style={{ boxShadow: "0 4px 0 #111111" }}
//   >
//     {/* Logo */}
//     <div
//       className="w-11 md:w-16 h-11 md:h-16 bg-[#FFFDF7] border-4 md:border-5 border-[#111111] rounded-xl flex items-center justify-center shrink-0"
//       style={{
//         transform: "rotate(3deg)",
//         boxShadow: "3px 3px 0 #111111",
//       }}
//     >
//       <Rocket
//         width={24}
//         height={24}
//         className="text-[#FF2D55] md:w-8 md:h-8"
//         style={{ transform: "rotate(3deg)" }}
//       />
//     </div>

//     {/* Title */}
//     <div className="flex-1 flex items-center gap-2 md:gap-4 ml-3">
//       <span
//         className="font-black text-2xl md:text-4xl text-[#111111] border-2 md:border-4 border-[#111111] px-1 md:px-3 py-0 md:py-1"
//         style={{ letterSpacing: "3px", fontFamily: "Segoe UI" }}
//       >
//         ADMIN
//       </span>
//       <div
//         className="bg-[#FF2D55] border-4 md:border-5 border-[#111111] px-2 md:px-4 py-0 md:py-1 rounded text-white font-black text-2xl md:text-3xl"
//         style={{
//           fontFamily: "Anton",
//           transform: "rotate(-2deg)",
//         }}
//       >
//         CÁ NHÂN
//       </div>
//     </div>
//   </header>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // Mobile Bottom Navigation Component
// // ─────────────────────────────────────────────────────────────────────────────
// const AdminBottomNav = ({ activeTab, setActiveTab }) => {
//   const NAV_ITEMS = [
//     { id: "home", label: "Trang chủ", icon: "🏠" },
//     { id: "analytics", label: "Phân tích", icon: "📊" },
//     { id: "users", label: "Người dùng", icon: "👥" },
//     { id: "profile", label: "Cá nhân", icon: "👤" },
//   ];

//   return (
//     <nav
//       className="lg:hidden fixed bottom-0 left-0 right-0 h-24 bg-[#FFFDF7] border-t-4 border-[#111111] flex items-center justify-around px-4 shrink-0"
//       style={{ boxShadow: "0 -4px 0 #111111" }}
//     >
//       {NAV_ITEMS.map(({ id, label }) => (
//         <button
//           key={id}
//           onClick={() => setActiveTab(id)}
//           className={`flex flex-col items-center gap-2 focus:outline-none transition text-xs font-bold uppercase`}
//         >
//           <span className="text-xl">
//             {NAV_ITEMS.find((item) => item.id === id)?.icon}
//           </span>
//           <span
//             className={activeTab === id ? "text-[#FF2E54]" : "text-[#64748B]"}
//             style={{
//               letterSpacing: "0.5px",
//               fontFamily: "Segoe UI",
//             }}
//           >
//             {label}
//           </span>
//         </button>
//       ))}
//     </nav>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Main Admin Profile Content Component
// // ─────────────────────────────────────────────────────────────────────────────
// export default function AdminProfileContent({ activeTab, setActiveTab }) {
//   const [admin, setAdmin] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchAdminProfile = async () => {
//       try {
//         const response = await api.get("/admin/profile");
//         if (response.success) {
//           setAdmin(response.data);
//         }
//       } catch {
//         console.error("Failed to fetch admin profile");
//         toast.error("Không thể tải thông tin cá nhân");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAdminProfile();
//   }, []);

//   const handleLogout = async () => {
//     try {
//       await authService.logout();
//       window.location.href = "/login";
//     } catch {
//       toast.error("Đăng xuất thất bại");
//     }
//   };

//   if (loading) {
//     return (
//       <div className="w-screen min-h-screen bg-[#FFFDF7] flex flex-col lg:flex-row">
//         <AdminSidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />
//         <div className="lg:hidden w-full order-first">
//           <AdminHeader />
//         </div>
//         <div className="flex-1 flex flex-col">
//           <div className="hidden lg:block">
//             <AdminHeader />
//           </div>
//           <AdminProfileSkeleton />
//         </div>
//         <AdminBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
//       </div>
//     );
//   }

//   return (
//     <div className="w-screen min-h-screen bg-[#FFFDF7] flex flex-col lg:flex-row">
//       {/* Sidebar - Desktop only */}
//       <AdminSidebarNav activeTab={activeTab} setActiveTab={setActiveTab} />

//       {/* Header - Mobile only */}
//       <div className="lg:hidden w-full order-first">
//         <AdminHeader />
//       </div>

//       {/* Main Content Area */}
//       <div className="flex-1 flex flex-col min-h-screen lg:min-h-auto">
//         {/* Header - Desktop only */}
//         <div className="hidden lg:block">
//           <AdminHeader />
//         </div>

//         {/* Profile Content */}
//         <main className="flex-1 px-4 md:px-8 pt-6 md:pt-8 pb-32 lg:pb-8 overflow-y-auto">
//           <div className="max-w-2xl mx-auto space-y-6">
//             {/* Admin Avatar Section */}
//             <div className="text-center space-y-4">
//               <div className="flex justify-center">
//                 <div
//                   className="w-32 h-32 md:w-40 md:h-40 bg-[#FFD60A] border-4 md:border-5 border-[#111111] rounded-full flex items-center justify-center"
//                   style={{ boxShadow: "8px 8px 0 #111111" }}
//                 >
//                   <span className="text-6xl md:text-8xl">👨‍💼</span>
//                 </div>
//               </div>

//               <div>
//                 <h2
//                   className="text-2xl md:text-4xl font-black text-[#111111]"
//                   style={{ fontFamily: "Segoe UI" }}
//                 >
//                   {admin?.displayName || "Admin"}
//                 </h2>
//                 <p
//                   className="text-sm md:text-base text-[#64748B] uppercase"
//                   style={{
//                     letterSpacing: "1px",
//                     fontFamily: "Plus Jakarta Sans",
//                   }}
//                 >
//                   Quản Trị Viên Hệ Thống
//                 </p>
//               </div>
//             </div>

//             {/* Info Cards */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {/* Email Card */}
//               <div
//                 className="bg-white border-4 border-[#111111] rounded-3xl p-4 md:p-6 flex items-center gap-4"
//                 style={{ boxShadow: "4px 4px 0 #111111" }}
//               >
//                 <div className="w-12 h-12 md:w-14 md:h-14 bg-[#00C2FF] border-3 border-[#111111] rounded-lg flex items-center justify-center shrink-0">
//                   <MailIcon width={24} height={24} className="text-[#111111]" />
//                 </div>
//                 <div>
//                   <p
//                     className="text-xs md:text-sm text-[#64748B] uppercase"
//                     style={{
//                       letterSpacing: "0.5px",
//                       fontFamily: "Plus Jakarta Sans",
//                     }}
//                   >
//                     Email
//                   </p>
//                   <p
//                     className="font-bold text-sm md:text-base text-[#111111]"
//                     style={{ fontFamily: "Segoe UI" }}
//                   >
//                     {admin?.email || "-"}
//                   </p>
//                 </div>
//               </div>

//               {/* Location Card */}
//               <div
//                 className="bg-white border-4 border-[#111111] rounded-3xl p-4 md:p-6 flex items-center gap-4"
//                 style={{ boxShadow: "4px 4px 0 #111111" }}
//               >
//                 <div className="w-12 h-12 md:w-14 md:h-14 bg-[#FFD60A] border-3 border-[#111111] rounded-lg flex items-center justify-center shrink-0">
//                   <MapPinIcon
//                     width={24}
//                     height={24}
//                     className="text-[#111111]"
//                   />
//                 </div>
//                 <div>
//                   <p
//                     className="text-xs md:text-sm text-[#64748B] uppercase"
//                     style={{
//                       letterSpacing: "0.5px",
//                       fontFamily: "Plus Jakarta Sans",
//                     }}
//                   >
//                     Vị Trí
//                   </p>
//                   <p
//                     className="font-bold text-sm md:text-base text-[#111111]"
//                     style={{ fontFamily: "Segoe UI" }}
//                   >
//                     {admin?.location || "Chưa cập nhật"}
//                   </p>
//                 </div>
//               </div>
//             </div>

//             {/* Stats Section */}
//             <div className="space-y-3">
//               <h3
//                 className="text-lg md:text-xl font-black text-[#111111] uppercase"
//                 style={{ letterSpacing: "2px", fontFamily: "Segoe UI" }}
//               >
//                 Thông Tin Tài Khoản
//               </h3>

//               <div
//                 className="bg-white border-4 border-[#111111] rounded-3xl p-4 md:p-6 space-y-3"
//                 style={{ boxShadow: "4px 4px 0 #111111" }}
//               >
//                 <div className="flex justify-between items-center pb-3 border-b-2 border-[#E2E8F0]">
//                   <span
//                     className="text-sm md:text-base text-[#64748B] uppercase"
//                     style={{
//                       fontFamily: "Plus Jakarta Sans",
//                       letterSpacing: "0.5px",
//                     }}
//                   >
//                     Ngày Tham Gia
//                   </span>
//                   <span
//                     className="font-bold text-[#111111]"
//                     style={{ fontFamily: "Segoe UI" }}
//                   >
//                     {formatDate(admin?.createdAt)}
//                   </span>
//                 </div>

//                 <div className="flex justify-between items-center pb-3 border-b-2 border-[#E2E8F0]">
//                   <span
//                     className="text-sm md:text-base text-[#64748B] uppercase"
//                     style={{
//                       fontFamily: "Plus Jakarta Sans",
//                       letterSpacing: "0.5px",
//                     }}
//                   >
//                     Cập Nhật Gần Nhất
//                   </span>
//                   <span
//                     className="font-bold text-[#111111]"
//                     style={{ fontFamily: "Segoe UI" }}
//                   >
//                     {formatDate(admin?.updatedAt)}
//                   </span>
//                 </div>

//                 <div className="flex justify-between items-center">
//                   <span
//                     className="text-sm md:text-base text-[#64748B] uppercase"
//                     style={{
//                       fontFamily: "Plus Jakarta Sans",
//                       letterSpacing: "0.5px",
//                     }}
//                   >
//                     Vai Trò
//                   </span>
//                   <span
//                     className="font-bold text-white bg-[#FF2E54] px-3 py-1 rounded"
//                     style={{ fontFamily: "Segoe UI" }}
//                   >
//                     {admin?.role?.toUpperCase() || "ADMIN"}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Logout Button */}
//             <Button
//               onClick={handleLogout}
//               className="w-full h-12 md:h-14 bg-[#FF2D55] border-4 border-[#111111] text-white font-bold uppercase rounded-2xl flex items-center justify-center gap-3 hover:bg-[#FF1D45]"
//               style={{
//                 boxShadow: "4px 4px 0 #111111",
//                 fontFamily: "Plus Jakarta Sans",
//                 letterSpacing: "1px",
//               }}
//             >
//               <LogOutIcon width={20} height={20} />
//               <span>Đăng Xuất</span>
//             </Button>
//           </div>
//         </main>
//       </div>

//       {/* Mobile Bottom Nav */}
//       <AdminBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
//     </div>
//   );
// }
