import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SecretaryPage from "../pages/SecretaryPage";

vi.mock("../apiClient", () => ({
  portalApi: { pendingMembers: vi.fn(), updateMemberRole: vi.fn() },
  asList: (data) => (Array.isArray(data) ? data : data?.results || []),
}));

import { portalApi } from "../apiClient";

const PENDING = [
  { id: 1, username: "newmember1", first_name: "New", last_name: "Member", email: "nm1@sac.test" },
  { id: 2, username: "newmember2", first_name: "", last_name: "", email: "nm2@sac.test" },
];

describe("SecretaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state, then the pending members table", async () => {
    portalApi.pendingMembers.mockResolvedValue(PENDING);
    render(<SecretaryPage />);

    expect(screen.getByText(/loading pending members/i)).toBeInTheDocument();
    expect(await screen.findByText("newmember1")).toBeInTheDocument();
    expect(screen.getByText("newmember2")).toBeInTheDocument();
  });

  it("falls back to an em dash when first/last name are both blank", async () => {
    portalApi.pendingMembers.mockResolvedValue(PENDING);
    render(<SecretaryPage />);
    await screen.findByText("newmember2");

    const row = screen.getByText("newmember2").closest("tr");
    expect(row).toHaveTextContent("—");
  });

  it("shows an empty-state message when nobody is pending", async () => {
    portalApi.pendingMembers.mockResolvedValue([]);
    render(<SecretaryPage />);
    expect(await screen.findByText(/nobody's waiting/i)).toBeInTheDocument();
  });

  it("approving a member sends the selected role and is_approved:true, then removes them from the list", async () => {
    portalApi.pendingMembers.mockResolvedValue(PENDING);
    portalApi.updateMemberRole.mockResolvedValue({});
    render(<SecretaryPage />);

    await screen.findByText("newmember1");

    const row = screen.getByText("newmember1").closest("tr");
    const select = row.querySelector("select");
    fireEvent.change(select, { target: { value: "director_finance" } });

    const approveButton = row.querySelector("button");
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(portalApi.updateMemberRole).toHaveBeenCalledWith(1, {
        role: "director_finance",
        is_approved: true,
      });
    });

    // Approved member should disappear from the pending list.
    await waitFor(() => {
      expect(screen.queryByText("newmember1")).not.toBeInTheDocument();
    });
    // The other pending member should be unaffected.
    expect(screen.getByText("newmember2")).toBeInTheDocument();
  });

  it("defaults to role=member if the Secretary never touches the dropdown", async () => {
    portalApi.pendingMembers.mockResolvedValue([PENDING[0]]);
    portalApi.updateMemberRole.mockResolvedValue({});
    render(<SecretaryPage />);

    await screen.findByText("newmember1");
    const row = screen.getByText("newmember1").closest("tr");
    fireEvent.click(row.querySelector("button"));

    await waitFor(() => {
      expect(portalApi.updateMemberRole).toHaveBeenCalledWith(1, {
        role: "member",
        is_approved: true,
      });
    });
  });

  it("shows an error and keeps the member in the list if the approval request fails", async () => {
    portalApi.pendingMembers.mockResolvedValue([PENDING[0]]);
    portalApi.updateMemberRole.mockRejectedValue(new Error("server error"));
    render(<SecretaryPage />);

    await screen.findByText("newmember1");
    fireEvent.click(screen.getByText("newmember1").closest("tr").querySelector("button"));

    expect(await screen.findByText(/couldn't update newmember1/i)).toBeInTheDocument();
    expect(screen.getByText("newmember1")).toBeInTheDocument();
  });
});
