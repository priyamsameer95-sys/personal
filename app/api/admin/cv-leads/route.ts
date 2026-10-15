import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { cvInterestsCSV, listCVInterests } from '@/lib/cv-leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: NextRequest) {
  if (!await isAdminAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  try {
    const exporting = request.nextUrl.searchParams.get('format') === 'csv';
    const result = await listCVInterests(exporting ? 10000 : 200);
    if (exporting) return new NextResponse(cvInterestsCSV(result.leads), { headers: {
      ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="cv-interests.csv"',
    } });
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ error: 'CV interests could not be loaded. Please try again.' }, { status: 503, headers });
  }
}
