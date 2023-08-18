import { jsonResponse } from "../utils/jsonResponse";

export const onRequestGet: PagesFunction<{}> = async ({ request, env }) => {
  return jsonResponse({
    time: new Date(),
  });
};
