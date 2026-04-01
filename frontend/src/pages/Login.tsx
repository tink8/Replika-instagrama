import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../utils/apiClient";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ login: identifier, password });
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-column">
        <section className="auth-card">
          <div className="auth-intro">
            <h1 className="auth-logo">Instagram</h1>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form className="form-stack" onSubmit={handleSubmit}>
            <label
              className="field"
              style={{ width: "100%", marginBottom: "8px" }}
            >
              <input
                type="text"
                required
                className="text-input"
                placeholder="Username or email address"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </label>

            <label
              className="field"
              style={{ width: "100%", marginBottom: "8px" }}
            >
              <input
                type="password"
                required
                className="text-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="button button-primary"
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>
          </form>
        </section>

        <section className="auth-card auth-card-secondary">
          <p className="auth-footnote">
            Don&apos;t have an account?
            <Link to="/register" className="inline-link">
              Sign up
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
