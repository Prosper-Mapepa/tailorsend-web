import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, "0.0.0.0", () => {
  console.log(`TailorSend backend listening on port ${config.port}`);
  console.log(`CORS allowed for: ${config.frontendUrl}`);
});
