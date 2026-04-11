import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses valid CSV with headers", () => {
    const csv = `暱稱,地址,標籤\n小明,台北市信義區,同事\n小華,新北市板橋區,朋友`;
    const result = parseCsv(csv);
    expect(result).toEqual([
      { nickname: "小明", address: "台北市信義區", tag: "同事" },
      { nickname: "小華", address: "新北市板橋區", tag: "朋友" },
    ]);
  });

  it("handles English headers", () => {
    const csv = `nickname,address,tag\nAlice,台北市,friend`;
    const result = parseCsv(csv);
    expect(result).toEqual([{ nickname: "Alice", address: "台北市", tag: "friend" }]);
  });

  it("trims whitespace", () => {
    const csv = `暱稱, 地址, 標籤\n  小明 , 台北市 , 同事 `;
    const result = parseCsv(csv);
    expect(result[0].nickname).toBe("小明");
    expect(result[0].address).toBe("台北市");
    expect(result[0].tag).toBe("同事");
  });

  it("skips rows with empty nickname or address", () => {
    const csv = `暱稱,地址,標籤\n小明,台北市,同事\n,新北市,朋友\n小華,,同學`;
    const result = parseCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0].nickname).toBe("小明");
  });

  it("defaults tag to empty string when missing", () => {
    const csv = `暱稱,地址,標籤\n小明,台北市,`;
    const result = parseCsv(csv);
    expect(result[0].tag).toBe("");
  });
});
