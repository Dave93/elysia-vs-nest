import { Controller, Get, Post, type Input } from "@dunx/http";
import { sha256Loop } from "./cpu.js";
import { cpu, echo, type Echo } from "./schemas.js";

@Controller()
export class SystemController {
  @Get("/health")
  health(): { status: string } {
    return { status: "ok" };
  }

  // `Input<typeof echo>` has to be written out: a standard method decorator can
  // check a parameter's type but cannot contextually type an unannotated one.
  @Post("/echo", echo)
  echo({ body }: Input<typeof echo>): Echo {
    return body;
  }

  @Get("/cpu", cpu)
  cpu({ query }: Input<typeof cpu>): { n: number; hash: string } {
    return { n: query.n, hash: sha256Loop(query.n) };
  }
}
