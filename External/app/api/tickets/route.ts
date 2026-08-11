import { NextRequest, NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization') || '';

    const payload: Record<string, any> = { limit: 500 };
    searchParams.forEach((value, key) => {
      try {
        payload[key] = JSON.parse(value);
      } catch {
        payload[key] = value;
      }
    });

    // Proxy to the backend's generic populate endpoint
    const response = await fetch(`${NEXT_PUBLIC_BACKEND_URL}/api/populate/read/tickets`, {
      method: 'POST', // Backend populate read endpoint accepts POST
      headers: {
        'Content-Type': 'application/json',
        'x-source': 'external',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend failed with status ${response.status}:`, errorText);
      throw new Error(`Failed to fetch tickets: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data.data || []); // Return the array of tickets directly
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const authHeader = request.headers.get('authorization') || '';

    const response = await fetch(`${NEXT_PUBLIC_BACKEND_URL}/api/populate/create/tickets`, {
      method: 'POST',
      headers: {
        'x-source': 'external',
        'Authorization': authHeader
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend failed with status ${response.status}:`, errorText);
      throw new Error(`Failed to create ticket: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}