import { GET, POST, DELETE } from "@/api/entries/route";
import * as kvModule from "@/lib/kv";
import * as geocodeModule from "@/lib/geocode";

jest.mock("@/lib/kv");
jest.mock("@/lib/geocode");

const mockGetEntries = kvModule.getEntries as jest.MockedFunction<typeof kvModule.getEntries>;
const mockAddEntry = kvModule.addEntry as jest.MockedFunction<typeof kvModule.addEntry>;
const mockClearEntries = kvModule.clearEntries as jest.MockedFunction<typeof kvModule.clearEntries>;
const mockGeocode = geocodeModule.geocodeAddress as jest.MockedFunction<typeof geocodeModule.geocodeAddress>;

beforeEach(() => {
  jest.resetAllMocks();
  process.env.ENTRY_PASSWORD = "test123";
});

describe("GET /api/entries", () => {
  it("returns all entries", async () => {
    const entries = [{
      id: "1", nickname: "小明", address: "台北市", tag: "朋友",
      lat: 25.03, lng: 121.56, createdAt: "2026-04-11T00:00:00Z",
    }];
    mockGetEntries.mockResolvedValue(entries);

    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual(entries);
  });

  it("returns 500 when KV fails", async () => {
    mockGetEntries.mockRejectedValue(new Error("KV unavailable"));

    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error).toBe("無法讀取資料");
  });
});

describe("POST /api/entries", () => {
  it("creates entry with valid password", async () => {
    mockGeocode.mockResolvedValue({ lat: 25.03, lng: 121.56, region: "臺北市" });
    mockAddEntry.mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "小明", address: "台北市信義區", tag: "朋友" }),
    });

    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.nickname).toBe("小明");
    expect(data.lat).toBe(25.03);
    expect(data.lng).toBe(121.56);
    expect(mockAddEntry).toHaveBeenCalledTimes(1);
  });


  it("rejects missing nickname or address", async () => {
    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "", address: "台北市", tag: "" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 500 when KV addEntry fails", async () => {
    mockGeocode.mockResolvedValue({ lat: 25.03, lng: 121.56, region: "臺北市" });
    mockAddEntry.mockRejectedValue(new Error("KV write failed"));

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "小明", address: "台北市", tag: "" }),
    });

    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error).toBe("儲存失敗");
  });
});

describe("DELETE /api/entries", () => {
  function makeDeleteRequest(password: string) {
    return new Request("http://localhost/api/entries", {
      method: "DELETE",
      headers: { "x-entry-password": password },
    });
  }

  it("clears all entries with valid password", async () => {
    mockClearEntries.mockResolvedValue(undefined);

    const response = await DELETE(makeDeleteRequest("test123"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.message).toBe("已清除所有資料");
    expect(mockClearEntries).toHaveBeenCalledTimes(1);
  });

  it("rejects wrong password", async () => {
    const response = await DELETE(makeDeleteRequest("wrong"));
    expect(response.status).toBe(401);
  });

  it("returns 500 when KV clearEntries fails", async () => {
    mockClearEntries.mockRejectedValue(new Error("KV delete failed"));

    const response = await DELETE(makeDeleteRequest("test123"));
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error).toBe("清除失敗");
  });
});
