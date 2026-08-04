/**
 * Dev-Tools gate. In production builds (pnpm build) import.meta.env.DEV is
 * statically false and Vite tree-shakes everything that is guarded by it.
 * The localStorage opt-in lets a developer enable the tools in any served
 * bundle without having to ship a dedicated dev build.
 */
export const DEV_TOOLS_ENABLED: boolean =
  import.meta.env.DEV || localStorage.getItem("hf_devtools") === "1";
