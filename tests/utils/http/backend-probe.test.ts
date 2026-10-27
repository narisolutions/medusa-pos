import { describe, it, expect } from "vitest";
import { emptyTracker, outageAge, recordCheck, withDeviceNetwork, type ProbeResult } from "@/utils/http/backend-probe";

const result = (kind: ProbeResult["kind"]): ProbeResult => ({
  kind,
  status: null,
  answeredBy: null,
  detail: null,
  elapsedMs: 12,
});

describe("withDeviceNetwork", () => {
  it("blames the device when it has no network", () => {
    expect(withDeviceNetwork(result("timed_out"), false).kind).toBe("no_network");
    expect(withDeviceNetwork(result("not_found"), false).kind).toBe("no_network");
  });

  it("keeps the probe's own answer while the device is online, and never overrides a success", () => {
    expect(withDeviceNetwork(result("refused"), true).kind).toBe("refused");
    expect(withDeviceNetwork(result("ok"), false).kind).toBe("ok");
  });
});

describe("outageAge", () => {
  it("says nothing under a minute", () => {
    expect(outageAge(59_999)).toBeNull();
  });

  it("counts whole minutes, then hours", () => {
    expect(outageAge(60_000)).toEqual({ hours: 0, minutes: 1 });
    expect(outageAge(2 * 60_000 + 59_000)).toEqual({ hours: 0, minutes: 2 });
    expect(outageAge(65 * 60_000)).toEqual({ hours: 1, minutes: 5 });
  });
});

describe("recordCheck", () => {
  const URL = "https://shop.example";

  it("counts failures in a row, starting the outage at the first one when nothing ever answered", () => {
    let t = recordCheck(emptyTracker(URL), URL, false, 1_000);
    expect(t).toMatchObject({ failures: 1, lostSince: 1_000, lastAnsweredAt: null });
    t = recordCheck(t, URL, false, 4_000);
    expect(t).toMatchObject({ failures: 2, lostSince: 1_000 });
  });

  it("dates an outage from the last good answer, not from the first miss", () => {
    const answered = recordCheck(emptyTracker(URL), URL, true, 10_000);
    const t = recordCheck(answered, URL, false, 40_000);
    expect(t).toMatchObject({ failures: 1, lostSince: 10_000, lastAnsweredAt: 10_000 });
  });

  it("clears the outage when it answers again", () => {
    const lost = recordCheck(recordCheck(emptyTracker(URL), URL, false, 1_000), URL, false, 2_000);
    expect(recordCheck(lost, URL, true, 9_000)).toEqual({ url: URL, lastAnsweredAt: 9_000, lostSince: null, failures: 0 });
  });

  it("starts over for another backend, so a store switch never inherits an outage", () => {
    const lost = recordCheck(recordCheck(emptyTracker(URL), URL, false, 1_000), URL, false, 2_000);
    const other = recordCheck(lost, "https://other.example", false, 5_000);
    expect(other).toMatchObject({ url: "https://other.example", failures: 1, lostSince: 5_000 });
  });
});
