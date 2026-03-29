import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Login from "./Login";
import * as AuthContext from "../context/AuthContext";
import { ApiError } from "../utils/apiClient";

// Mock the AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// FIX: Update the mock to accept two arguments (code and message) to match your real ApiError
vi.mock("../utils/apiClient", () => {
  class MockApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "ApiError";
      this.code = code;
    }
  }
  return {
    ApiError: MockApiError,
  };
});

describe("Login Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form correctly", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      login: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(
      screen.getByPlaceholderText("Username or email address"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("handles successful login", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      login: mockLogin,
    } as any);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Username or email address"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(mockLogin).toHaveBeenCalledWith({
      login: "testuser",
      password: "password123",
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("displays ApiError message on failed login", async () => {
    // FIX: Pass two arguments to ApiError (a dummy code like "AUTH_ERROR", and the message)
    const mockLogin = vi
      .fn()
      .mockRejectedValue(
        new ApiError("AUTH_ERROR", "Invalid credentials provided"),
      );
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      login: mockLogin,
    } as any);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Username or email address"), {
      target: { value: "wronguser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid credentials provided"),
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("displays generic error message on unexpected error", async () => {
    const mockLogin = vi
      .fn()
      .mockRejectedValue(new Error("Some random server crash"));
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      login: mockLogin,
    } as any);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Username or email address"), {
      target: { value: "wronguser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(
        screen.getByText("An unexpected error occurred."),
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
