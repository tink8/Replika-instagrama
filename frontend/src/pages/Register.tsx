import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../utils/apiClient";

const USERNAME_REGEX = /^[a-z0-9._]*$/;

const sanitizeUsername = (raw: string): string => {
  // Lowercase, strip anything not allowed, cap at 30 chars
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 30);
};

const validateUsername = (value: string): string | null => {
  if (!value) return null;
  if (value.startsWith(".")) return "Username cannot start with a period.";
  if (!USERNAME_REGEX.test(value))
    return "Only letters, numbers, periods and underscores allowed.";
  if (value.length > 30) return "Username must be 30 characters or fewer.";
  return null;
};

export default function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameHint, setUsernameHint] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeUsername(e.target.value);
    setUsername(cleaned);
    const hint = validateUsername(cleaned);
    setUsernameHint(hint || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validations
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await register({ name, username, email, password }, isPrivate);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during registration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-column auth-column-wide">
        <section className="auth-card">
          <div className="auth-intro">
            <h1 className="auth-logo">Instagram</h1>
            <p className="auth-subtitle">
              Sign up to see photos and videos from your friends.
            </p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form className="form-stack" onSubmit={handleSubmit}>
            <label
              className="field"
              style={{ width: "100%", marginBottom: "8px" }}
            >
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="text-input"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label
              className="field"
              style={{ width: "100%", marginBottom: "8px" }}
            >
              <input
                type="text"
                name="name"
                autoComplete="name"
                required
                className="text-input"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label
              className="field"
              style={{ width: "100%", marginBottom: "8px" }}
            >
              <input
                type="text"
                name="username"
                autoComplete="username"
                required
                maxLength={30}
                className="text-input"
                placeholder="Username"
                value={username}
                onChange={handleUsernameChange}
              />
              {usernameHint && (
                <span className="field-hint field-hint-error">
                  {usernameHint}
                </span>
              )}
            </label>

            <label
              className="field"
              style={{ width: "100%", marginBottom: "8px" }}
            >
              <input
                type="password"
                required
                minLength={8}
                className="text-input"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label
              className="field"
              style={{ width: "100%", marginBottom: "8px" }}
            >
              <input
                type="password"
                required
                minLength={8}
                className={`text-input ${
                  confirmPassword && confirmPassword !== password
                    ? "text-input-error"
                    : ""
                }`}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && confirmPassword !== password && (
                <span className="field-hint field-hint-error">
                  Passwords do not match.
                </span>
              )}
            </label>

            <div className="auth-toggle-row">
              <span className="field-label">Private profile</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <span className="switch-track" />
              </label>
            </div>

            <button
              type="submit"
              disabled={
                isLoading || (!!confirmPassword && confirmPassword !== password)
              }
              className="button button-primary"
              style={{ width: "100%" }}
            >
              {isLoading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
        </section>

        <section className="auth-card auth-card-secondary">
          <p className="auth-footnote">
            Already have an account?
            <Link to="/login" className="inline-link">
              Log in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
