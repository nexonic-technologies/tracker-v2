import { NextRequest, NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3000';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const body = await request.json();

    const response = await fetch(`${NEXT_PUBLIC_BACKEND_URL}/api/populate/read/status_configss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-source': 'external',
        'Authorization': authHeader
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch status configs');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching status configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status configs' },
      { status: 500 }
    );
  }
}
