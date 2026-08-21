import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DirectorPortalNavLink from "../DirectorPortalNavLink";

vi.mock("../../shared/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../shared/AuthContext";

describe("DirectorPortalNavLink", () => {
  it("renders nothing at all for a non-director — not disabled, not hidden, absent from the DOM", () => {
    useAuth.mockReturnValue({ user: { is_director: false } });
    const { container } = render(
      <MemoryRouter>
        <DirectorPortalNavLink />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there's no user at all (logged out)", () => {
    useAuth.mockReturnValue({ user: null });
    const { container } = render(
      <MemoryRouter>
        <DirectorPortalNavLink />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a link to /portal for a director", () => {
    useAuth.mockReturnValue({ user: { is_director: true } });
    render(
      <MemoryRouter>
        <DirectorPortalNavLink />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: "Director Portal" });
    expect(link).toHaveAttribute("href", "/portal");
  });

  it("accepts a custom className so it can match the co-director's navbar styling", () => {
    useAuth.mockReturnValue({ user: { is_director: true } });
    render(
      <MemoryRouter>
        <DirectorPortalNavLink className="their-custom-nav-class" />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Director Portal" })).toHaveClass("their-custom-nav-class");
  });

  it("accepts custom children text", () => {
    useAuth.mockReturnValue({ user: { is_director: true } });
    render(
      <MemoryRouter>
        <DirectorPortalNavLink>Leadership Tools</DirectorPortalNavLink>
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Leadership Tools" })).toBeInTheDocument();
  });
});
