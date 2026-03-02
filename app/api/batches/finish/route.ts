import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

// POST: 배치 종료 (결과 데이터 + 세척 데이터 포함)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Convert camelCase to snake_case for backend
        const backendBody = {
            tank_id: body.tankId,
            batch_id: body.batchId,
            final_cabbage_salinity: body.finalCabbageSalinity,
            bend_test: body.bendTest,
            // Wash data - 1차, 3차 세척만 (단일 염도)
            wash_tank1_salinity: body.wash1Salinity,
            wash_tank1_water_temp: body.wash1WaterTemp,
            wash_tank3_salinity: body.wash3Salinity,
            wash_tank3_water_temp: body.wash3WaterTemp,
        };

        const res = await fetch(`${API_BASE}/api/batches/finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendBody),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json({ success: true, batch: data });
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}
