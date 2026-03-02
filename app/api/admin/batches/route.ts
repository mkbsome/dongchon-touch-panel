import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET() {
    try {
        const res = await fetch(`${API_BASE}/admin/batches`);
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch batches:', error);
        return NextResponse.json([], { status: 500 });
    }
}
