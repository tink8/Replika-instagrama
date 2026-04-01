import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Search from "./Search";

vi.mock("../utils/apiClient", () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from "../utils/apiClient";
const mockApiClient = vi.mocked(apiClient);

describe("Search Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input and default message", () => {
    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    expect(
      screen.getByText("Recent searches will appear here."),
    ).toBeInTheDocument();
  });

  it("shows search results after typing", async () => {
    mockApiClient.mockResolvedValue({
      users: [
        { id: "u1", name: "John Doe", username: "johndoe", avatarUrl: null },
      ],
      page: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "john" },
    });

    await waitFor(() => {
      expect(screen.getByText("johndoe")).toBeInTheDocument();
    });
  });

  it("shows no results message when search returns empty", async () => {
    mockApiClient.mockResolvedValue({
      users: [],
      page: 1,
      totalPages: 0,
    });

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "nonexistentuser" },
    });

    await waitFor(() => {
      expect(screen.getByText("No results found.")).toBeInTheDocument();
    });
  });
});
