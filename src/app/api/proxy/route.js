import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { url, options = {} } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Default to GET if not provided
    const fetchOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (options.body && fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
      fetchOptions.body = typeof options.body === 'object' ? JSON.stringify(options.body) : options.body;
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(url, fetchOptions);
    
    // Read response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return NextResponse.json({ 
      data, 
      status: response.status,
      ok: response.ok
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Proxy request failed', details: error.message }, { status: 500 });
  }
}
