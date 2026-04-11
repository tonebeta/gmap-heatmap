import { geocodeAddress } from "@/lib/geocode";

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  mockFetch.mockReset();
  delete process.env.GOOGLE_GEOCODING_API_KEY;
});

describe("geocodeAddress", () => {
  it("returns coordinates from Nominatim on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: "25.0330", lon: "121.5654" }],
    } as Response);

    const result = await geocodeAddress("台北市信義區");
    expect(result).toEqual({ lat: 25.033, lng: 121.5654 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("nominatim.openstreetmap.org");
  });

  it("retries with simplified address when full address fails", async () => {
    // Full address fails, simplified (without 號) succeeds
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: "25.0314", lon: "121.4784" }],
    } as Response);

    const result = await geocodeAddress("220新北市板橋區懷德街181巷42號");
    expect(result).toEqual({ lat: 25.0314, lng: 121.4784 });
    // First call: full address (without postal code), second: without 號
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries up to street level when alley also fails", async () => {
    // Full fails, without 號 fails, without 巷 succeeds
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: "25.0314", lon: "121.4784" }],
    } as Response);

    const result = await geocodeAddress("新北市板橋區懷德街181巷42號");
    expect(result).toEqual({ lat: 25.0314, lng: 121.4784 });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("falls back to Google when all Nominatim variants fail", async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = "test-key";
    // All Nominatim variants fail
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    // Override last call for Google success
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{ geometry: { location: { lat: 25.033, lng: 121.5654 } } }],
      }),
    } as Response);

    const result = await geocodeAddress("新北市板橋區懷德街181巷42號");
    expect(result).toEqual({ lat: 25.033, lng: 121.5654 });
  });

  it("throws when all Nominatim variants and Google fail", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    await expect(geocodeAddress("不存在的地址xyz")).rejects.toThrow("無法解析地址");
  });
});
