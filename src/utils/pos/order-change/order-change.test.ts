import { describe, it, expect } from "vitest";
import { runOrderChange, type OrderChangeStep } from ".";

const boom = new Error("boom");

/** A return as the backend actually rolls back (verified on staging). */
const returnSteps = (calls: string[], failAt?: string, failUndo?: string): OrderChangeStep[] => {
  const call = (name: string, fail?: string) => async () => {
    calls.push(name);
    if (name === fail) throw boom;
  };
  return [
    { key: "initiateRequest", run: call("initiateRequest", failAt), undo: call("cancelRequest", failUndo) },
    { key: "addReturnItem", run: call("addReturnItem", failAt) },
    { key: "confirmRequest", run: call("confirmRequest", failAt), undo: call("cancel", failUndo), replacesUndo: true },
    { key: "initiateReceive", run: call("initiateReceive", failAt), undo: call("cancelReceive", failUndo) },
    { key: "receiveItems", run: call("receiveItems", failAt) },
    { key: "confirmReceive", run: call("confirmReceive", failAt) },
  ];
};

describe("runOrderChange", () => {
  it("runs every step in order and reports applied", async () => {
    const calls: string[] = [];
    const seen: string[] = [];
    const outcome = await runOrderChange(returnSteps(calls), (key) => seen.push(key));

    expect(outcome).toEqual({ status: "applied" });
    expect(calls).toEqual([
      "initiateRequest", "addReturnItem", "confirmRequest",
      "initiateReceive", "receiveItems", "confirmReceive",
    ]);
    expect(seen).toEqual(calls);
  });

  it("applies nothing and undoes nothing when the first step fails", async () => {
    const calls: string[] = [];
    const outcome = await runOrderChange(returnSteps(calls, "initiateRequest"));

    expect(outcome).toEqual({ status: "rolled_back", failedStep: "initiateRequest", error: boom });
    expect(calls).toEqual(["initiateRequest"]);
  });

  it("cancels the request when a step before confirmRequest fails", async () => {
    const calls: string[] = [];
    const outcome = await runOrderChange(returnSteps(calls, "addReturnItem"));

    expect(outcome.status).toBe("rolled_back");
    expect(calls.slice(-1)).toEqual(["cancelRequest"]);
  });

  it("uses cancel, not cancelRequest, once confirmRequest has run", async () => {
    const calls: string[] = [];
    await runOrderChange(returnSteps(calls, "initiateReceive"));

    expect(calls.slice(-1)).toEqual(["cancel"]);
    expect(calls).not.toContain("cancelRequest");
  });

  it("cancels the receive before the return when receiving fails", async () => {
    const calls: string[] = [];
    const outcome = await runOrderChange(returnSteps(calls, "receiveItems"));

    expect(outcome).toMatchObject({ status: "rolled_back", failedStep: "receiveItems" });
    expect(calls.slice(-2)).toEqual(["cancelReceive", "cancel"]);
  });

  it("reports stranded, and stops, when an undo fails", async () => {
    const calls: string[] = [];
    const outcome = await runOrderChange(returnSteps(calls, "confirmReceive", "cancelReceive"));

    expect(outcome).toEqual({
      status: "stranded",
      failedStep: "confirmReceive",
      error: boom,
      undoError: boom,
    });
    expect(calls.slice(-1)).toEqual(["cancelReceive"]);
  });
});
