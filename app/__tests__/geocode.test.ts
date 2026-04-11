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

  it("falls back to Google when Nominatim returns empty", async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = "test-key";
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{ geometry: { location: { lat: 25.033, lng: 121.5654 } } }],
      }),
    } as Response);

    const result = await geocodeAddress("台北市信義區");
    expect(result).toEqual({ lat: 25.033, lng: 121.5654 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws when both Nominatim and Google fail", async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = "test-key";
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true, json: async () => ({ status: "ZERO_RESULTS", results: [] }),
    } as Response);

    await expect(geocodeAddress("不存在的地址xyz")).rejects.toThrow("無法解析地址");
  });

  it("throws when Nominatim fails and no Google key configured", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    await expect(geocodeAddress("不存在的地址xyz")).rejects.toThrow("無法解析地址");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
