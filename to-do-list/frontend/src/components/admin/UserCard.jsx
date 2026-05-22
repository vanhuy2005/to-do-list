import React from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Gets a random pastel color based on the user's name (deterministic)
 */
function getAvatarColor(name) {
  const colors = [
    "bg-pink-200",
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-purple-200",
    "bg-indigo-200",
    "bg-rose-200",
    "bg-cyan-200",
  ];
  const hash = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return colors[hash % colors.length];
}

/**
 * Gets user initials from their name
 */
function getInitials(name) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * UserCard Component
 * @param {Object} props
 * @param {string} props.id - User ID
 * @param {string} props.name - User full name
 * @param {string} [props.avatarUrl] - Avatar image URL
 * @param {'ADMIN' | 'USER'} props.role - User role
 * @param {number} props.completedTasks - Number of completed tasks
 * @param {boolean} props.isOnline - Online status
 * @param {boolean} [props.isSelected] - Selected state
 * @param {Function} [props.onClick] - Click handler
 */
export const UserCard = ({
  id,
  name,
  avatarUrl,
  role,
  completedTasks,
  isOnline,
  isSelected = false,
  onClick,
}) => {
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(name);
  const onlineDotColor = isOnline ? "bg-green-500" : "bg-gray-400";
  const roleBgColor = role === "ADMIN" ? "bg-pink-500" : "bg-cyan-500";

  return (
    <div
      onClick={onClick}
      className={`
        relative
        p-6
        bg-white
        border-2
        border-black
        rounded-2xl
        shadow-md
        transition-all
        duration-200
        cursor-pointer
        hover:shadow-lg
        ${isSelected ? "bg-blue-50" : ""}
        ${onClick ? "hover:bg-gray-50" : ""}
      `}
      style={{
        boxShadow: isSelected
          ? "0px 0px 0px 3px #3b82f6, 4px 4px 0px #111"
          : "4px 4px 0px #111",
      }}
    >
      {/* Avatar Section */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-16 h-16 rounded-full object-cover border-2 border-black"
            />
          ) : (
            <div
              className={`
                w-16
                h-16
                rounded-full
                ${avatarColor}
                border-2
                border-black
                flex
                items-center
                justify-center
                font-bold
                text-lg
                text-gray-700
              `}
            >
              {initials}
            </div>
          )}

          {/* Online Indicator Dot */}
          <div
            className={`
              absolute
              bottom-0
              right-0
              w-5
              h-5
              rounded-full
              border-2
              border-white
              ${onlineDotColor}
            `}
          />
        </div>

        {/* Name and Role */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900 truncate">{name}</h3>
          <span
            className={`
              inline-block
              mt-2
              px-3
              py-1
              text-xs
              font-bold
              text-white
              rounded-full
              ${roleBgColor}
            `}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Completed Tasks */}
      <div className="flex items-center gap-2 text-gray-700">
        <CheckCircle2 size={18} className="text-green-500" />
        <span className="text-sm font-medium">
          {completedTasks} tác vụ hoàn thành
        </span>
      </div>
    </div>
  );
};
