import { Link } from "react-router-dom";
import type { User } from "../types/api";

interface UserCardProps {
  user: User;
}

export default function UserCard({ user }: UserCardProps) {
  return (
    <Link
      to={`/profile/${user.username}`}
      className="flex items-center p-3 hover:bg-gray-50 transition-colors duration-150 rounded-sm"
    >
      <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold text-lg">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="ml-4 flex flex-col">
        <span className="font-semibold text-sm text-gray-900">
          {user.username}
        </span>
        <span className="text-sm text-gray-500">{user.name}</span>
      </div>
    </Link>
  );
}
