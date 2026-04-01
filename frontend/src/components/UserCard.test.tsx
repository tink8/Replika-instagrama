import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import UserCard from "./UserCard";

describe("UserCard Component", () => {
  it("renders user with avatar", () => {
    const user = {
      id: "user-1",
      name: "John Doe",
      username: "johndoe",
      avatarUrl: "http://example.com/avatar.jpg",
    };

    render(
      <MemoryRouter>
        <UserCard user={user} />
      </MemoryRouter>,
    );

    expect(screen.getByText("johndoe")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByAltText("johndoe")).toBeInTheDocument();
  });

  it("renders fallback initial when no avatar", () => {
    const user = {
      id: "user-2",
      name: "Jane Smith",
      username: "janesmith",
      avatarUrl: null,
    };

    render(
      <MemoryRouter>
        <UserCard user={user} />
      </MemoryRouter>,
    );

    expect(screen.getByText("janesmith")).toBeInTheDocument();
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("links to user profile", () => {
    const user = {
      id: "user-3",
      name: "Test User",
      username: "testuser",
      avatarUrl: null,
    };

    render(
      <MemoryRouter>
        <UserCard user={user} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/profile/user-3");
  });
});
