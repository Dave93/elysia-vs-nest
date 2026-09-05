import { app } from "./app";

app.listen(Number(process.env.PORT ?? 3000));
if (process.env.BOOT_MARK) console.error(`boot ${Date.now()}`);
