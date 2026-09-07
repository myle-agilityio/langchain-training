import "@testing-library/jest-dom/vitest";
import { setProjectAnnotations } from "@storybook/react-vite";
import { beforeAll } from "vitest";

import preview from "./.storybook/preview";

// Stories pulled into a test with composeStories get the same decorators the canvas applies.
const annotations = setProjectAnnotations([preview]);

beforeAll(annotations.beforeAll);
