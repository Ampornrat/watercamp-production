// Docker-only Vite config. NOT used by Lovable deployment.
// Forces Nitro on with the node-server preset so the build emits
// .output/server/index.mjs that we can run inside a container.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
  },
});
