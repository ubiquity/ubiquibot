import probot from "@probot/adapter-github-actions";
import main from "../src/index";

probot.run(main).catch((error: Error) => {
  console.error(`Error happening... name: ${error.name}, message: ${error.message}`);
  process.exit(1);
});
