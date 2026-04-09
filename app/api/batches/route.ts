import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8001';

export const dynamic = 'force-dynamic';

// GET: 활성 배치 조회 (탱크별 상태)
export async function GET() {
    try {
        const res = await fetch(`${API_BASE}/api/batches`);
        const data = await res.json();

        // Convert snake_case to camelCase for frontend
        const convertedData: Record<string, unknown> = {};
        for (const [tankId, tankStatus] of Object.entries(data)) {
            const status = tankStatus as Record<string, unknown>;
            convertedData[tankId] = {
                active: status.active,
                cultivar: status.cultivar,
                startTime: status.start_time,
                batchId: status.batch_id,
                avgWeight: status.avg_weight,
                totalQuantity: status.total_quantity,
                cabbageSize: status.cabbage_size,
                initialSalinity: status.initial_salinity,
            };
        }

        return NextResponse.json(convertedData);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}

// POST: 새 배치 생성
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Convert camelCase to snake_case for backend
        const backendBody = {
            tank_id: body.tankId,
            cultivar: body.cultivar,
            avg_weight: body.avgWeight,
            cabbage_size: body.cabbageSize,
            firmness: body.firmness,
            leaf_thickness: body.leafThickness,
            total_quantity: body.totalQuantity,
            room_temp: body.roomTemp,
            outdoor_temp: body.outdoorTemp,
            season: body.season,
            initial_salinity: body.initialSalinity,
        };

        const res = await fetch(`${API_BASE}/api/batches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendBody),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // Convert snake_case back to camelCase for frontend compatibility
        const frontendData = {
            id: String(data.id),
            tankId: data.tank_id,
            status: data.status,
            startTime: data.start_time,
            cultivar: data.cultivar,
            avgWeight: data.avg_weight,
            firmness: data.firmness,
            leafThickness: data.leaf_thickness,
            totalQuantity: data.total_quantity,
            roomTemp: data.room_temp,
            season: data.season,
            initialSalinity: data.initial_salinity,
        };

        return NextResponse.json(frontendData);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}
