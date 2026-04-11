import { geocodeAddress } from "@/lib/geocode";

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  mockFetch.mockReset();
  delete process.env.GOOGLE_GEOCODING_API_KEY;
});

function nominatimResult(lat: string, lon: string, state = "臺北市") {
  return {
    lat,
    lon,
    display_name: `某處, ${state}, 臺灣`,
    address: { state },
  };
}

describe("geocodeAddress", () => {
  it("returns coordinates and region from Nominatim", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [nominatimResult("25.0330", "121.5654", "臺北市")],
    } as Response);

    const result = await geocodeAddress("台北市信義區");
    expect(result).toEqual({ lat: 25.033, lng: 121.5654, region: "臺北市" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries with simplified address when full address fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [nominatimResult("25.0314", "121.4784", "新北市")],
    } as Response);

    const result = await geocodeAddress("220新北市板橋區懷德街181巷42號");
    expect(result).toEqual({ lat: 25.0314, lng: 121.4784, region: "新北市" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries up to street level when alley also fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [nominatimResult("25.0314", "121.4784", "新北市")],
    } as Response);

    const result = await geocodeAddress("新北市板橋區懷德街181巷42號");
    expect(result).toEqual({ lat: 25.0314, lng: 121.4784, region: "新北市" });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("falls back to Google when all Nominatim variants fail", async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = "test-key";
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{
          geometry: { location: { lat: 25.033, lng: 121.5654 } },
          address_components: [{ long_name: "新北市", types: ["administrative_area_level_1"] }],
        }],
      }),
    } as Response);

    const result = await geocodeAddress("新北市板橋區懷德街181巷42號");
    expect(result).toEqual({ lat: 25.033, lng: 121.5654, region: "新北市" });
  });

  it("throws when all variants and Google fail", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    await expect(geocodeAddress("不存在的地址xyz")).rejects.toThrow("無法解析地址");
  });

  it("simplifies English address with No. prefix", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [nominatimResult("25.0330", "121.5654", "臺北市")],
    } as Response);

    const result = await geocodeAddress("No. 7, Section 5, Xinyi Road, Taipei");
    expect(result.lat).toBe(25.033);
    expect(result.region).toBe("臺北市");
  });

  it("simplifies English address with leading house number", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        lat: "40.7128", lon: "-74.0060",
        display_name: "Main Street, New York, United States",
        address: { state: "New York" },
      }],
    } as Response);

    const result = await geocodeAddress("123, Main Street, New York");
    expect(result).toEqual({ lat: 40.7128, lng: -74.006, region: "New York" });
  });
});
