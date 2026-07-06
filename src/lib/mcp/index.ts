import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import appInfoTool from "./tools/app-info";

export default defineMcp({
  name: "fizjoplan-mcp",
  title: "FizjoPlan MCP",
  version: "0.1.0",
  instructions:
    "Tools for the FizjoPlan appointment planner. Use `app_info` to learn what the app does, and `echo` to verify connectivity.",
  tools: [echoTool, appInfoTool],
});
