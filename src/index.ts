import probot from "@probot/adapter-github-actions";
import main from "./main";

probot.run(main).catch((error: Error) => {
  console.error(error);
  process.exit(1);
});

console.trace();
