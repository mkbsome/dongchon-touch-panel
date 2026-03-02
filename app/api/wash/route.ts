import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

// POST: 세척 기록 생성
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Convert camelCase to snake_case for backend
        const backendBody = {
            batch_id: body.batchId,
            wash_tank_id: body.washTankId,
            wash_cycle: body.washCycle,
            salinity_top: body.salinityTop,
            salinity_bottom: body.salinityBottom,
            water_temp: body.waterTemp,
            memo: body.memo,
        };

        const res = await fetch(`${API_BASE}/api/wash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendBody),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // Convert snake_case to camelCase
        const frontendData = {
            id: data.id,
            batchId: data.batch_id,
            tankId: data.tank_id,
            washCycle: data.wash_cycle,
            timestamp: data.timestamp,
            salinityTop: data.salinity_top,
            salinityBottom: data.salinity_bottom,
            waterTemp: data.water_temp,
            salinityAvg: data.salinity_avg,
            salinityDiff: data.salinity_diff,
            memo: data.memo,
        };

        return NextResponse.json(frontendData);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}

// GET: 특정 배치의 세척 기록 조회
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batchId');

        if (!batchId) {
            return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
        }

        const res = await fetch(`${API_BASE}/api/wash/batch/${batchId}`);
        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // Convert snake_case to camelCase
        const frontendData = data.map((r: Record<string, unknown>) => ({
            id: r.id,
            batchId: r.batch_id,
            tankId: r.tank_id,
            washCycle: r.wash_cycle,
            timestamp: r.timestamp,
            salinityTop: r.salinity_top,
            salinityBottom: r.salinity_bottom,
            waterTemp: r.water_temp,
            salinityAvg: r.salinity_avg,
            salinityDiff: r.salinity_diff,
            memo: r.memo,
        }));

        return NextResponse.json(frontendData);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}
