import axios from "axios";
import { createWriteStream } from "fs";

export const fetchImage = async (url: string): Promise<unknown> => {
  const dir = "../assets/images/webFlat.png";
  const writer = createWriteStream(dir);

  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};
