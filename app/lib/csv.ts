import Papa from "papaparse";
import { CsvRow } from "./types";

const HEADER_MAP: Record<string, keyof CsvRow> = {
  暱稱: "nickname",
  nickname: "nickname",
  地址: "address",
  address: "address",
  標籤: "tag",
  tag: "tag",
};

export function parseCsv(csvString: string): CsvRow[] {
  const { data, errors } = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length && !data.length) {
    throw new Error(`CSV 解析錯誤: ${errors[0].message}`);
  }

  return data
    .map((row) => {
      const mapped: Partial<CsvRow> = {};
      for (const [key, value] of Object.entries(row)) {
        const field = HEADER_MAP[key.trim()];
        if (field) {
          mapped[field] = (value ?? "").trim();
        }
      }
      return {
        nickname: mapped.nickname ?? "",
        address: mapped.address ?? "",
        tag: mapped.tag ?? "",
      };
    })
    .filter((row) => row.nickname !== "" && row.address !== "");
}
