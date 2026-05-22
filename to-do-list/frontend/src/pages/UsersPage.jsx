import React, { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { UserCard } from "../components/admin/UserCard";
import { useUsers } from "../hooks/useUsers";

/**
 * Debounce hook to delay function execution
 */
function useDebouncedValue(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState(""); // '' = Tất cả, 'ADMIN', 'USER'

  // Debounce search input
  const debouncedSearch = useDebouncedValue(rawSearch, 400);

  // Reset to page 1 when search or role changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedRole]);

  // Fetch data
  const {
    data: response = {
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    },
    isLoading,
    error,
  } = useUsers({
    page,
    search: debouncedSearch,
    role: selectedRole,
    limit: 10,
  });

  const users = response.data || [];
  const meta = response.meta || {};
  const totalPages = meta.totalPages || 1;

  // Handle role filter change
  const handleRoleChange = (role) => {
    setSelectedRole(role);
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý người dùng
          </h1>
          <p className="text-gray-600">
            Xem và quản lý tất cả người dùng trong hệ thống
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm siêu anh hùng..."
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              className="
                w-full
                pl-10
                pr-4
                py-3
                border-2
                border-gray-300
                rounded-lg
                font-semibold
                focus:outline-none
                focus:border-red-500
                focus:ring-2
                focus:ring-red-200
                transition-colors
              "
            />
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="mb-8 flex gap-3 flex-wrap">
          {[
            { label: "Tất cả", value: "" },
            { label: "Admin", value: "ADMIN" },
            { label: "User", value: "USER" },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleRoleChange(value)}
              className={`
                px-6
                py-2
                rounded-full
                font-bold
                text-sm
                transition-all
                duration-200
                border-2
                ${
                  selectedRole === value
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mb-4" />
              <p className="text-gray-600 font-semibold">Đang tải...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-semibold">Lỗi: {error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && users.length === 0 && (
          <div className="text-center py-12 bg-white border-2 border-gray-200 rounded-lg">
            <p className="text-gray-600 font-semibold">
              {rawSearch || selectedRole
                ? "Không tìm thấy người dùng phù hợp"
                : "Chưa có người dùng nào"}
            </p>
          </div>
        )}

        {/* Users Grid */}
        {!isLoading && users.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  id={user.id}
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  role={user.role}
                  completedTasks={user.completedTasks}
                  isOnline={user.isOnline}
                  onClick={() => {
                    // TODO: Navigate to user detail or open user edit modal
                    console.log("Selected user:", user.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            {/* Previous Button */}
            <button
              onClick={handlePreviousPage}
              disabled={page === 1}
              className={`
                p-2
                rounded-lg
                border-2
                transition-all
                duration-200
                ${
                  page === 1
                    ? "border-gray-300 text-gray-400 cursor-not-allowed"
                    : "border-red-500 text-red-500 hover:bg-red-50"
                }
              `}
            >
              <ChevronLeft size={20} />
            </button>

            {/* Page Numbers */}
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`
                    w-10
                    h-10
                    rounded-lg
                    font-bold
                    transition-all
                    duration-200
                    border-2
                    ${
                      pageNum === page
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }
                  `}
                  >
                    {pageNum}
                  </button>
                ),
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={handleNextPage}
              disabled={page === totalPages}
              className={`
                p-2
                rounded-lg
                border-2
                transition-all
                duration-200
                ${
                  page === totalPages
                    ? "border-gray-300 text-gray-400 cursor-not-allowed"
                    : "border-red-500 text-red-500 hover:bg-red-50"
                }
              `}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Results Info */}
        {!isLoading && users.length > 0 && (
          <div className="text-center mt-8 text-gray-600 text-sm">
            Hiển thị {(page - 1) * 10 + 1} đến {Math.min(page * 10, meta.total)}{" "}
            trong số {meta.total} người dùng
          </div>
        )}
      </div>
    </div>
  );
}
