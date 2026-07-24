
export const A2UI_OPERATIONS_KEY = "a2ui_operations";
export const BASIC_CATALOG_ID = "copilotkit://basic-catalog";

export type A2UIOperation = Record<string, unknown>;

export function createSurface(
  surfaceId: string,
  catalogId: string = BASIC_CATALOG_ID,
): A2UIOperation {
  return {
    version: "v0.9",
    createSurface: { surfaceId, catalogId },
  };
}

export function updateComponents(
  surfaceId: string,
  components: unknown[],
): A2UIOperation {
  return {
    version: "v0.9",
    updateComponents: { surfaceId, components },
  };
}

export function updateDataModel(
  surfaceId: string,
  value: unknown,
  p: string = "/",
): A2UIOperation {
  return {
    version: "v0.9",
    updateDataModel: { surfaceId, path: p, value },
  };
}

export function render(operations: A2UIOperation[]): string {
  return JSON.stringify({ [A2UI_OPERATIONS_KEY]: operations });
}
