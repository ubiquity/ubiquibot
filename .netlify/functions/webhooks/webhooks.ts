import { createLambdaFunction, createProbot } from "@probot/adapter-aws-lambda-serverless";
import appFn from "../../../src/main";

export const handler = createLambdaFunction(appFn, {
  probot: createProbot(),
});
export default handler;
