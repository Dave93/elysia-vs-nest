import { HttpFactory } from "@dunx/http";
import { AppModule } from "./app.module.js";
import { errorMapper } from "./errors.js";

// Both reference apps run with their loggers off, so request logging is off here
// too: it is dunx's only default middleware, and one structured entry per request
// would be measuring the logger.
const app = await HttpFactory.create(AppModule, {
  requestLogging: false,
  bootLogging: false,
  onError: errorMapper,
});

await app.listen(Number(process.env.PORT ?? 3000));
if (process.env.BOOT_MARK) console.error(`boot ${Date.now()}`);
