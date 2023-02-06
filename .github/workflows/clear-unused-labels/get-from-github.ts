import * as https from "https";

export async function getFromGitHub(path: string, token: string) {
  const labelsResponse = await new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      port: 443,
      path: path,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "MyApp/1.0.0",
      },
    };

    const request = https
      .get(options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed with status code ${res.statusCode}`));
          return;
        }

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(JSON.parse(data));
        });
      })
      .on("error", (error) => {
        reject(error);
      });

    request.on("error", (e) => {
      console.error(e);
    });
    request.end();
  });

  return labelsResponse;
}
