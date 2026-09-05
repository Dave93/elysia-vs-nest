import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { Echo, CpuQuery } from '../schemas.js';

export function sha256Loop(n: number): string {
  let h = 'elysia-vs-nest';
  for (let i = 0; i < n; i++) h = createHash('sha256').update(h).digest('hex');
  return h;
}

@Controller()
export class SystemController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post('echo')
  @HttpCode(200)
  echo(@Body({ schema: Echo }) body: Echo) {
    return body;
  }

  @Get('cpu')
  cpu(@Query({ schema: CpuQuery }) q: z.infer<typeof CpuQuery>) {
    return { n: q.n, hash: sha256Loop(q.n) };
  }
}
