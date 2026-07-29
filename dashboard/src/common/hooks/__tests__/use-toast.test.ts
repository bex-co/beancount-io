import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useToast } from "../use-toast";

const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (msg: string) => mockSuccess(msg),
    error: (msg: string) => mockError(msg),
  },
}));

describe("useToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a toast function", () => {
    const { result } = renderHook(() => useToast());
    expect(typeof result.current.toast).toBe("function");
  });

  it("should call sonner toast.success for default variant", () => {
    const { result } = renderHook(() => useToast());
    result.current.toast({ title: "Saved successfully" });
    expect(mockSuccess).toHaveBeenCalledWith("Saved successfully");
    expect(mockError).not.toHaveBeenCalled();
  });

  it("should call sonner toast.success when variant is 'default'", () => {
    const { result } = renderHook(() => useToast());
    result.current.toast({ title: "Done", variant: "default" });
    expect(mockSuccess).toHaveBeenCalledWith("Done");
    expect(mockError).not.toHaveBeenCalled();
  });

  it("should call sonner toast.error for destructive variant", () => {
    const { result } = renderHook(() => useToast());
    result.current.toast({
      title: "Something went wrong",
      variant: "destructive",
    });
    expect(mockError).toHaveBeenCalledWith("Something went wrong");
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("should include description in message when provided", () => {
    const { result } = renderHook(() => useToast());
    result.current.toast({
      title: "Error",
      description: "File not found",
      variant: "destructive",
    });
    expect(mockError).toHaveBeenCalledWith("Error: File not found");
  });

  it("should use only title when description is not provided", () => {
    const { result } = renderHook(() => useToast());
    result.current.toast({ title: "Success" });
    expect(mockSuccess).toHaveBeenCalledWith("Success");
  });

  it("should combine title and description with colon separator", () => {
    const { result } = renderHook(() => useToast());
    result.current.toast({
      title: "Ledger saved",
      description: "Changes committed",
    });
    expect(mockSuccess).toHaveBeenCalledWith("Ledger saved: Changes committed");
  });

  it("should handle empty description as falsy and not append it", () => {
    const { result } = renderHook(() => useToast());
    result.current.toast({ title: "Info", description: "" });
    // Empty string is falsy, so no colon+description is appended
    expect(mockSuccess).toHaveBeenCalledWith("Info");
  });
});
