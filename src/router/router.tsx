import { createHashRouter } from "react-router-dom";
import { routes } from "./route-tree";

// Hash history: Tauri serves files from disk, with no server to answer deep links on reload.
const router = createHashRouter(routes);

export default router;
