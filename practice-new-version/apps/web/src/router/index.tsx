import { createBrowserRouter } from "react-router-dom";
import { Root } from "@/app/Root";

// Single route today; router is in place so a second page doesn't require replumbing providers.
export const router = createBrowserRouter([{ path: "/", element: <Root /> }]);
