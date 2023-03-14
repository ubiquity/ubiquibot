import { createLambdaFunction, createProbot } from "@probot/adapter-aws-lambda-serverless";
import main from "./main";

const lamdaFns = createLambdaFunction(main, {
  probot: createProbot(),
});

export default lamdaFns;
