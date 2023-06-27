import { run } from "../handlers/wildcard/weekly/action";

run()
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  });
