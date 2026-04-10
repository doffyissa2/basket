import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export interface RequestContext {
  userId: string
  accessToken: string
  postcode: string | null
  dept: string | null
}

/**
 * Extracts userId, accessToken, postcode, and dept from a parsed request body.
 * Returns a NextResponse on auth failure, or a RequestContext on success.
 * The caller is responsible for parsing the body before calling this.
 */
export async function getRequestContextWithBody(
  request: NextRequest,
  body: Record<string, unknown>
): Promise<RequestContext | NextResponse> {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const accessToken =
    request.headers.get('authorization')?.replace('Bearer ', '').trim() ?? ''
  const postcode = (body?.postcode as string) ?? null
  const dept = postcode && postcode.length >= 2 ? postcode.slice(0, 2) : null

  return { userId: authResult.userId, accessToken, postcode, dept }
}
