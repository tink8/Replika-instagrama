import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { Navbar } from "./Navbar"; // Named import based on your component
import * as AuthContext from "../context/AuthContext";

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

describe("Navbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when user is not logged in", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: null,
      logout: vi.fn(),
    } as any);

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    // The component returns null, so the container should be empty
    expect(container.firstChild).toBeNull();
  });

  it("renders navbar when user is logged in", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: { username: "testuser" },
      logout: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByText("INSTA")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("calls logout and navigates to login when logout button is clicked", () => {
    const mockLogout = vi.fn();
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: { username: "testuser" },
      logout: mockLogout,
    } as any);

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    // Find the logout button. Since it only contains an icon, we can grab all buttons
    // and select the last one (which corresponds to the LogOut icon in your component).
    const buttons = screen.getAllByRole("button");
    const logoutButton = buttons[buttons.length - 1];

    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
