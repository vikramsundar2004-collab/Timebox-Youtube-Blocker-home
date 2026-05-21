require("dotenv").config();

const { createApp } = require("./src/app");
const { readConfig } = require("./src/config");

const config = readConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  console.log(`Timebox YouTube Blocker home running at http://localhost:${config.port}`);
});
