import { createNodeMiddleware, createProbot } from "probot";
import main from "./main";

const middleware = createNodeMiddleware(main, {
  probot: createProbot(),
  webhooksPath: "/api/github/webhooks",
});

export default middleware;
