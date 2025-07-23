import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Log API requests for debugging
    if (request.nextUrl.pathname.startsWith('/api/')) {
        console.log(`🌐 API Request: ${request.method} ${request.nextUrl.pathname}`, {
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent'),
            origin: request.headers.get('origin'),
            contentType: request.headers.get('content-type')
        });
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*'
}; 