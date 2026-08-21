import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RoleBadge from "../RoleBadge";

describe("RoleBadge", () => {
  it("renders a known role's friendly label", () => {
    render(<RoleBadge role="director_finance" isExec={false} />);
    expect(screen.getByText(/FINANCE DIRECTOR/)).toBeInTheDocument();
  });

  it("appends ALL SECTIONS when isExec is true", () => {
    render(<RoleBadge role="exec" isExec={true} />);
    expect(screen.getByText(/ALL SECTIONS/)).toBeInTheDocument();
  });

  it("does not append ALL SECTIONS for a regular director", () => {
    render(<RoleBadge role="director_events" isExec={false} />);
    expect(screen.queryByText(/ALL SECTIONS/)).not.toBeInTheDocument();
  });

  it("falls back to the raw role string for an unrecognized role", () => {
    render(<RoleBadge role="mystery_role" isExec={false} />);
    expect(screen.getByText(/MYSTERY_ROLE/)).toBeInTheDocument();
  });
});
