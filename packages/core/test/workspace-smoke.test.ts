import { describe, expect, it } from "vitest";
import { CORE_PACKAGE_NAME } from "../src/index";

describe("core package", () => {
  it("exports its package name", () => {
    expect(CORE_PACKAGE_NAME).toBe("@htmleditor/core");
  });
});
