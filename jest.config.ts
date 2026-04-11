import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1",
    "^uuid$": "<rootDir>/__mocks__/uuid.js",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
};

export default config;
