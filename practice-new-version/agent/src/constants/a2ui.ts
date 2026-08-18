// Key the A2UI wire payload nests its operations array under (render() in utils/a2ui.ts).
export const A2UI_OPERATIONS_KEY = "a2ui_operations";

// Catalog id for createSurface's default — components not tied to a specific catalog.
export const BASIC_CATALOG_ID = "copilotkit://basic-catalog";

// Must match createCatalog's catalogId in src/app/declarative-generative-ui/renderers.tsx —
// the frontend only knows how to render surfaces tagged with this id.
export const CUSTOM_CATALOG_ID = "copilotkit://app-dashboard-catalog";
