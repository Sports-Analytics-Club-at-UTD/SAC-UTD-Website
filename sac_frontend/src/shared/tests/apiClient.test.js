import { describe, it, expect } from "vitest";
import { asList } from "../apiClient";

describe("asList", () => {
  it("unwraps DRF's paginated {results: [...]} shape", () => {
    const paginated = { count: 2, next: null, previous: null, results: [{ id: 1 }, { id: 2 }] };
    expect(asList(paginated)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("passes a bare array through unchanged", () => {
    expect(asList([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("returns an empty array for null or undefined", () => {
    expect(asList(null)).toEqual([]);
    expect(asList(undefined)).toEqual([]);
  });

  it("returns an empty array for an object with no results key", () => {
    expect(asList({ balance: 100, total_income: 500 })).toEqual([]);
  });
});
