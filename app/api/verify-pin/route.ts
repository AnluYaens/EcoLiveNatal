import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PinSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const parsed = PinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const accessPin = process.env.ACCESS_PIN;
  if (!accessPin || parsed.data.pin !== accessPin) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
