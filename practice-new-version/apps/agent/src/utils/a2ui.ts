import { A2UI_OPERATIONS_KEY, BASIC_CATALOG_ID } from "@/constants";

export type A2UIOperation = Record<string, unknown>;

export const createSurface = (
  surfaceId: string,
  catalogId: string = BASIC_CATALOG_ID,
): A2UIOperation => {
  return {
    version: "v0.9",
    createSurface: { surfaceId, catalogId },
  };
};

export const updateComponents = (
  surfaceId: string,
  components: unknown[],
): A2UIOperation => {
  return {
    version: "v0.9",
    updateComponents: { surfaceId, components },
  };
};

export const updateDataModel = (
  surfaceId: string,
  value: unknown,
  p: string = "/",
): A2UIOperation => {
  return {
    version: "v0.9",
    updateDataModel: { surfaceId, path: p, value },
  };
};

export const render = (operations: A2UIOperation[]): string => {
  return JSON.stringify({ [A2UI_OPERATIONS_KEY]: operations });
};
