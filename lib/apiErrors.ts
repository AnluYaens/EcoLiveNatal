import { NextResponse } from 'next/server';
import messagesEs from '@/messages/es.json';

type ErrorMessages = typeof messagesEs.errors;

export type ApiErrorCode = keyof ErrorMessages;

interface ApiErrorOptions {
  minutes?: number;
}

function getApiErrorMessage(code: ApiErrorCode, options: ApiErrorOptions = {}): string {
  if (code === 'accountLocked') {
    return messagesEs.errors.accountLocked.replace('{minutes}', String(options.minutes ?? 1));
  }

  return messagesEs.errors[code];
}

export function createApiErrorResponse(
  code: ApiErrorCode,
  status: number,
  options: ApiErrorOptions = {},
): NextResponse {
  const body: { error: ApiErrorCode; message: string; minutes?: number } = {
    error: code,
    message: getApiErrorMessage(code, options),
  };

  if (typeof options.minutes === 'number') {
    body.minutes = options.minutes;
  }

  return NextResponse.json(body, { status });
}

export function isApiErrorCode(value: string): value is ApiErrorCode {
  return value in messagesEs.errors;
}
