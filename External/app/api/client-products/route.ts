import { NextRequest, NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Validate that agentId is a valid 24-character hex string (MongoDB ObjectId)
    const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
    if (!OBJECT_ID_REGEX.test(agentId)) {
      return NextResponse.json(
        { error: 'Invalid Agent ID format' },
        { status: 400 }
      );
    }

    const response = await fetch(`${NEXT_PUBLIC_BACKEND_URL}/api/populate/read/agents/${agentId}?clientProducts=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-source': 'external',
        'Authorization': `Bearer temp-external-token`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch client products');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching client products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client products' },
      { status: 500 }
    );
  }
}