import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Register from "./Register";
import * as AuthContext from "../context/AuthContext";
import { ApiError } from "../utils/apiClient";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

describe("Register Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders registration form correctly", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      register: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Full Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Password (min 8 characters)"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up/i }),
    ).toBeInTheDocument();
  });

  it("handles successful registration", async () => {
    const mockRegister = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      register: mockRegister,
    } as any);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Email address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Password (min 8 characters)"),
      { target: { value: "password123" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error when passwords do not match", async () => {
    const mockRegister = vi.fn();
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      register: mockRegister,
    } as any);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Email address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Password (min 8 characters)"),
      { target: { value: "password123" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "differentpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("shows error for unexpected registration error", async () => {
    const mockRegister = vi
      .fn()
      .mockRejectedValue(new Error("Network failure"));
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      register: mockRegister,
    } as any);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Email address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Password (min 8 characters)"),
      { target: { value: "password123" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "An unexpected error occurred during registration.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("displays ApiError message on failed registration", async () => {
    const mockRegister = vi
      .fn()
      .mockRejectedValue(
        new ApiError("USERNAME_TAKEN", "This username is already in use."),
      );
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      register: mockRegister,
    } as any);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Email address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Password (min 8 characters)"),
      { target: { value: "password123" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(
        screen.getByText("This username is already in use."),
      ).toBeInTheDocument();
    });
  });

  it("sanitizes username input to lowercase", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      register: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    const usernameInput = screen.getByPlaceholderText("Username");
    fireEvent.change(usernameInput, { target: { value: "TestUser123" } });

    expect(usernameInput).toHaveValue("testuser123");
  });

  it("shows link to login page", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      register: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByText("Log in")).toBeInTheDocument();
  });
});
