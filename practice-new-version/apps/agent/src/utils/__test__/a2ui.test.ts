import { describe, expect, it } from "vitest";

import { A2UI_OPERATIONS_KEY, BASIC_CATALOG_ID } from "@/constants";
import {
  createSurface,
  render,
  updateComponents,
  updateDataModel,
} from "@/utils";

describe("createSurface", () => {
  it("defaults to the basic catalog", () => {
    expect(createSurface("s1")).toEqual({
      version: "v0.9",
      createSurface: { surfaceId: "s1", catalogId: BASIC_CATALOG_ID },
    });
  });

  it("takes an explicit catalog id", () => {
    expect(createSurface("s1", "copilotkit://custom")).toEqual({
      version: "v0.9",
      createSurface: { surfaceId: "s1", catalogId: "copilotkit://custom" },
    });
  });
});

describe("updateComponents", () => {
  it("nests the components under the surface id", () => {
    const components = [{ id: "root", componentProperties: {} }];

    expect(updateComponents("s1", components)).toEqual({
      version: "v0.9",
      updateComponents: { surfaceId: "s1", components },
    });
  });
});

describe("updateDataModel", () => {
  it("defaults the path to the document root", () => {
    expect(updateDataModel("s1", { draft: "hi" })).toEqual({
      version: "v0.9",
      updateDataModel: { surfaceId: "s1", path: "/", value: { draft: "hi" } },
    });
  });

  it("takes an explicit path", () => {
    expect(updateDataModel("s1", "hi", "/draft/body")).toEqual({
      version: "v0.9",
      updateDataModel: { surfaceId: "s1", path: "/draft/body", value: "hi" },
    });
  });
});

describe("render", () => {
  it("serializes the operations under the wire key the client reads", () => {
    const operations = [createSurface("s1")];

    expect(JSON.parse(render(operations))).toEqual({
      [A2UI_OPERATIONS_KEY]: operations,
    });
  });

  it("serializes an empty run to an empty operations array", () => {
    expect(JSON.parse(render([]))).toEqual({ [A2UI_OPERATIONS_KEY]: [] });
  });
});
