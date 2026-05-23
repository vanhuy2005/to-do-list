import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { UserCard } from "./UserCard";
import { useUsers } from "@/hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";
import { disableUser, softDeleteUser } from "../../services/users.api";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

/**
 * UsersList Component - Displays users in AdminDashboard
 * Compact version compared to full UsersPage
 */
export const UsersList = () => {
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const queryClient = useQueryClient();

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

  const handleDisable = async (userId) => {
    if (window.confirm("Bạn có chắc chắn muốn vô hiệu hóa tài khoản này?")) {
      try {
        await disableUser(userId);
        queryClient.invalidateQueries(["users"]);
      } catch (err) {
        alert(err.response?.data?.error?.message || err.message || "Không thể vô hiệu hóa tài khoản");
      }
    }
  };

  const handleSoftDelete = async (userId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tài khoản này và đưa vào thùng rác?")) {
      try {
        await softDeleteUser(userId);
        queryClient.invalidateQueries(["users"]);
      } catch (err) {
        alert(err.response?.data?.error?.message || err.message || "Không thể xóa tài khoản");
      }
    }
  };

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
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 z-10 text-gray-400 size-5" />
          <Input
            type="text"
            placeholder="Tìm kiếm siêu anh hùng..."
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            className="pl-11"
          />
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex gap-3 flex-wrap mb-4">
        {[
          { label: "Tất cả", value: "" },
          { label: "Admin", value: "ADMIN" },
          { label: "User", value: "USER" },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleRoleChange(value)}
            className={`h-10 px-6 border-[3px] border-black rounded-lg font-bold uppercase text-xs flex items-center justify-center shrink-0 transition-all ${
              selectedRole === value
                ? "bg-[#FF2D55] text-white"
                : "bg-white text-[#0F172A] hover:bg-gray-50"
            }`}
            style={{
              fontFamily: "Plus Jakarta Sans",
              letterSpacing: "1px",
              boxShadow: selectedRole === value ? "3px 3px 0 #111" : "1.5px 1.5px 0 #111",
            }}
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
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
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
        <div>
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
                  console.log("Selected user:", user.id);
                }}
                actions={
                  user.role !== "ADMIN" && (
                    <>
                      <button
                        onClick={() => handleDisable(user.id)}
                        className="px-3 py-1 bg-[#FFD60A] border-2 border-black rounded font-black text-xs uppercase shadow-[1px_1px_0px_#000] hover:translate-y-[1px] hover:shadow-none transition-all"
                      >
                        Vô hiệu hóa
                      </button>
                      <button
                        onClick={() => handleSoftDelete(user.id)}
                        className="px-3 py-1 bg-[#FF2D55] text-white border-2 border-black rounded font-black text-xs uppercase shadow-[1px_1px_0px_#000] hover:translate-y-[1px] hover:shadow-none transition-all"
                      >
                        Xóa
                      </button>
                    </>
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={handlePreviousPage}
                disabled={page === 1}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  isActive={pageNum === page}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={handleNextPage}
                disabled={page === totalPages}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Results Info */}
      {!isLoading && users.length > 0 && (
        <div className="text-center text-gray-600 text-sm">
          Hiển thị {(page - 1) * 10 + 1} đến {Math.min(page * 10, meta.total)}{" "}
          trong số {meta.total} người dùng
        </div>
      )}
    </div>
  );
};
