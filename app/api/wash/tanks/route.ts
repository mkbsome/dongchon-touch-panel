import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

// GET: 세척조 상태 조회
export async function GET() {
    try {
        const res = await fetch(`${API_BASE}/api/wash/tanks`);
        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // Convert snake_case to camelCase for frontend
        const convertedData: Record<string, unknown> = {};
        for (const [tankNum, tankStatus] of Object.entries(data)) {
            const status = tankStatus as Record<string, unknown>;
            convertedData[tankNum] = {
                id: status.id,
                tankNumber: status.tank_number,
                name: status.name,
                currentBatchId: status.current_batch_id,
                lastWashTime: status.last_wash_time,
            };
        }

        return NextResponse.json(convertedData);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}
