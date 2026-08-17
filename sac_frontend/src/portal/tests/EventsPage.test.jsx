import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EventsPage from "../pages/EventsPage";

vi.mock("../apiClient", () => ({
  portalApi: { listEvents: vi.fn(), createEvent: vi.fn() },
  asList: (data) => (Array.isArray(data) ? data : data?.results || []),
}));
vi.mock("../../shared/apiClient", () => ({
  ApiError: class ApiError extends Error {
    constructor(status, data) {
      super("mock api error");
      this.status = status;
      this.data = data;
    }
  },
}));

import { portalApi } from "../apiClient";
import { ApiError } from "../../shared/apiClient";

const EVENTS = [
  { id: 1, name: "Trivia Night", date: "2026-09-01", start_time: "19:00:00", registration_count: 4, capacity: 10 },
];

describe("EventsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the calendar list once loaded", async () => {
    portalApi.listEvents.mockResolvedValue(EVENTS);
    render(<EventsPage />);

    expect(await screen.findByText("Trivia Night")).toBeInTheDocument();
    expect(screen.getByText("4 / 10")).toBeInTheDocument();
  });

  it("shows an empty state when there are no events", async () => {
    portalApi.listEvents.mockResolvedValue([]);
    render(<EventsPage />);
    expect(await screen.findByText(/no events on the calendar/i)).toBeInTheDocument();
  });

  it("submits the new-event form and reloads the list on success", async () => {
    portalApi.listEvents.mockResolvedValue([]);
    portalApi.createEvent.mockResolvedValue({ id: 2 });
    render(<EventsPage />);
    await screen.findByText(/no events on the calendar/i);

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "New Event" } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: "18:00" } });
    fireEvent.click(screen.getByRole("button", { name: /create event/i }));

    await waitFor(() => {
      expect(portalApi.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Event", date: "2026-10-01", start_time: "18:00" })
      );
    });
    // Should reload the list after a successful create.
    expect(portalApi.listEvents).toHaveBeenCalledTimes(2);
  });

  it("omits capacity from the payload entirely when left blank, rather than sending an empty string", async () => {
    portalApi.listEvents.mockResolvedValue([]);
    portalApi.createEvent.mockResolvedValue({ id: 2 });
    render(<EventsPage />);
    await screen.findByText(/no events on the calendar/i);

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "No Capacity Event" } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: "18:00" } });
    fireEvent.click(screen.getByRole("button", { name: /create event/i }));

    await waitFor(() => expect(portalApi.createEvent).toHaveBeenCalled());
    const payload = portalApi.createEvent.mock.calls[0][0];
    expect(payload).not.toHaveProperty("capacity");
  });

  it("renders field-level validation errors from the backend without crashing", async () => {
    portalApi.listEvents.mockResolvedValue([]);
    // All HTML5-required fields are filled in below — this must be a
    // rejection the backend can catch but the browser's native
    // `required`/`min` constraint validation can't (e.g. a uniqueness
    // check). If any required field were left blank instead, jsdom's
    // own constraint validation would block the submit event before
    // this code path ever ran, and the test would be exercising the
    // wrong thing entirely.
    portalApi.createEvent.mockRejectedValue(
      new ApiError(400, { name: ["An event with this name already exists."] })
    );
    render(<EventsPage />);
    await screen.findByText(/no events on the calendar/i);

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Duplicate Event" } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: "18:00" } });
    fireEvent.click(screen.getByRole("button", { name: /create event/i }));

    expect(await screen.findByText("An event with this name already exists.")).toBeInTheDocument();
  });
});
