import { NextRequest, NextResponse } from 'next/server';

const NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const { path } = await params;
    const pathString = path.join('/');

    const response = await fetch(`${NEXT_PUBLIC_BACKEND_URL}/api/files/${pathString}`, {
      method: 'GET',
      headers: {
        'x-source': 'external',
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    // Get the array buffer and content type
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching file via proxy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}
