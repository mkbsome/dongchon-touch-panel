import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

// GET: 특정 배치의 측정 기록 조회
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batchId');

        if (!batchId) {
            return NextResponse.json(
                { error: 'Missing batchId parameter' },
                { status: 400 }
            );
        }

        const res = await fetch(`${API_BASE}/api/measurements?batch_id=${batchId}`);
        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // Convert snake_case to camelCase for frontend compatibility
        const frontendData = data.map((m: Record<string, unknown>) => ({
            id: String(m.id),
            batchId: String(m.batch_id),
            timestamp: m.timestamp,
            elapsedMinutes: m.elapsed_minutes,
            salinityTop: m.salinity_top,
            salinityBottom: m.salinity_bottom,
            waterTemp: m.water_temp,
            ph: m.ph,
            addedSalt: m.added_salt,
            addedSaltAmount: m.added_salt_amount,
            memo: m.memo,
            // Derived variables
            salinityAvg: m.salinity_avg,
            salinityDiff: m.salinity_diff,
            osmoticPressureIndex: m.osmotic_pressure_index,
            accumulatedTemp: m.accumulated_temp,
        }));

        return NextResponse.json(frontendData);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}

// POST: 측정 기록 (염도, 수온, pH 등 - 파생변수는 백엔드에서 자동 계산)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Convert camelCase to snake_case for backend
        const backendBody = {
            tank_id: body.tankId,
            salinity_top: body.salinityTop ?? body.topSalinity,
            salinity_bottom: body.salinityBottom ?? body.bottomSalinity,
            water_temp: body.waterTemp ?? body.temperature,
            ph: body.ph,
            added_salt: body.addedSalt,
            added_salt_amount: body.addedSaltAmount,
            memo: body.memo,
        };

        const res = await fetch(`${API_BASE}/api/measurements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendBody),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // Convert snake_case to camelCase (including derived variables)
        const frontendData = {
            id: String(data.id),
            batchId: String(data.batch_id),
            timestamp: data.timestamp,
            elapsedMinutes: data.elapsed_minutes,
            salinityTop: data.salinity_top,
            salinityBottom: data.salinity_bottom,
            waterTemp: data.water_temp,
            ph: data.ph,
            addedSalt: data.added_salt,
            addedSaltAmount: data.added_salt_amount,
            memo: data.memo,
            // Derived variables (calculated by backend)
            salinityAvg: data.salinity_avg,
            salinityDiff: data.salinity_diff,
            osmoticPressureIndex: data.osmotic_pressure_index,
            accumulatedTemp: data.accumulated_temp,
        };

        return NextResponse.json(frontendData);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}
