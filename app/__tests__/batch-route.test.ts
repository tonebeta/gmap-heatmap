import { POST } from "@/api/entries/batch/route";
import * as kvModule from "@/lib/kv";
import * as geocodeModule from "@/lib/geocode";

jest.mock("@/lib/kv");
jest.mock("@/lib/geocode");

const mockAddEntries = kvModule.addEntries as jest.MockedFunction<typeof kvModule.addEntries>;
const mockGeocode = geocodeModule.geocodeAddress as jest.MockedFunction<typeof geocodeModule.geocodeAddress>;

beforeEach(() => {
  jest.resetAllMocks();
  process.env.ENTRY_PASSWORD = "test123";
});

describe("POST /api/entries/batch", () => {
  function createCsvRequest(csv: string, password = "test123") {
    const formData = new FormData();
    formData.append("file", new Blob([csv], { type: "text/csv" }), "data.csv");
    return new Request("http://localhost/api/entries/batch", {
      method: "POST",
      headers: { "x-entry-password": password },
      body: formData,
    });
  }

  it("processes valid CSV", async () => {
    mockGeocode
      .mockResolvedValueOnce({ lat: 25.03, lng: 121.56 })
      .mockResolvedValueOnce({ lat: 25.01, lng: 121.47 });
    mockAddEntries.mockResolvedValue(undefined);

    const csv = `暱稱,地址,標籤\n小明,台北市,朋友\n小華,新北市,同事`;
    const response = await POST(createCsvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(2);
    expect(data.failed).toHaveLength(0);
    expect(mockAddEntries).toHaveBeenCalledTimes(1);
  }, 10000);

  it("reports geocoding failures per row", async () => {
    mockGeocode
      .mockResolvedValueOnce({ lat: 25.03, lng: 121.56 })
      .mockRejectedValueOnce(new Error("無法解析地址"));
    mockAddEntries.mockResolvedValue(undefined);

    const csv = `暱稱,地址,標籤\n小明,台北市,朋友\n小華,不存在地址,同事`;
    const response = await POST(createCsvRequest(csv));
    const data = await response.json();

    expect(data.success).toBe(1);
    expect(data.failed).toHaveLength(1);
    expect(data.failed[0].row).toBe(2);
    expect(data.failed[0].address).toBe("不存在地址");
  }, 10000);

  it("rejects wrong password", async () => {
    const response = await POST(createCsvRequest("暱稱,地址,標籤\n小明,台北市,朋友", "wrong"));
    expect(response.status).toBe(401);
  });

  it("rejects CSV exceeding 50 rows", async () => {
    const header = "暱稱,地址,標籤";
    const rows = Array.from({ length: 51 }, (_, i) => `user${i},台北市,tag`).join("\n");
    const csv = `${header}\n${rows}`;

    const response = await POST(createCsvRequest(csv));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toContain("超過上限");
  });

  it("returns 500 when KV addEntries fails", async () => {
    mockGeocode.mockResolvedValue({ lat: 25.03, lng: 121.56 });
    mockAddEntries.mockRejectedValue(new Error("KV write failed"));

    const csv = `暱稱,地址,標籤\n小明,台北市,朋友`;
    const response = await POST(createCsvRequest(csv));
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error).toBe("儲存失敗");
  });
});
