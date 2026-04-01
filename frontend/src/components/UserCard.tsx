import { Link } from "react-router-dom";
import type { UserSummary } from "../types/api";

interface UserCardProps {
  user: UserSummary;
}

export default function UserCard({ user }: UserCardProps) {
  return (
    <Link to={`/profile/${user.id}`} className="user-card">
      <div className="avatar avatar-medium">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="avatar-image"
          />
        ) : (
          <div className="avatar-fallback">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="user-card-copy">
        <span className="user-card-title">{user.username}</span>
        <span className="user-card-subtitle">{user.name}</span>
      </div>
    </Link>
  );
}
