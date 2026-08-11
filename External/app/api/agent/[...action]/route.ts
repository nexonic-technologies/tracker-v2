import { NextRequest, NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3000';

async function handleProxy(
  request: NextRequest,
  params: { action: string[] }
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { action } = params;
    const actionPath = action.join('/');
    const method = request.method;

    let body = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = JSON.stringify(await request.json());
      } catch (e) {
        // Body might be empty or invalid
      }
    }

    const headers: Record<string, string> = {
      'x-source': 'external',
      'Authorization': authHeader
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${NEXT_PUBLIC_BACKEND_URL}/api/agent/${actionPath}`, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend agent proxy failed with status ${response.status}:`, errorText);
      throw new Error(`Backend failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in agent proxy route:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string[] }> }
) {
  return handleProxy(request, await params);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string[] }> }
) {
  return handleProxy(request, await params);
}
