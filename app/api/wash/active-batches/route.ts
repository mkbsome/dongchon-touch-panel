import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET() {
    try {
        const res = await fetch(`${API_BASE}/api/wash/active-batches`);
        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}
