import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`TailorSend backend listening on http://localhost:${config.port}`);
  console.log(`CORS allowed for: ${config.frontendUrl}`);
});
