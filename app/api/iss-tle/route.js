import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(
      'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle',
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`CelesTrak returned ${response.status}`);
    }

    const text = await response.text();

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const name =
      lines.find(
        (line) =>
          !line.startsWith('1 ') &&
          !line.startsWith('2 ')
      ) || 'ISS (ZARYA)';

    const line1 = lines.find((line) =>
      line.startsWith('1 ')
    );

    const line2 = lines.find((line) =>
      line.startsWith('2 ')
    );

    if (!line1 || !line2) {
      throw new Error('ISS TLE data not found');
    }

    return NextResponse.json({
      name,
      line1,
      line2,
      noradId: 25544,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          'Unable to acquire ISS orbital data',
      },
      { status: 502 }
    );
  }
}
