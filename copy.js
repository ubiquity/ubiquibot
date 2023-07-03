const fs = require("fs");

fs.cp("src/assets/images", "lib/assets/images", { recursive: true }, (err) => {
  if (err) {
    throw new Error(err);
  } else {
    console.log("successfully copied files");
  }
});
