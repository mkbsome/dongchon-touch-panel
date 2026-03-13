import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8001';

// POST: 배치 종료 (결과 데이터 + 세척 데이터 포함)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 프론트엔드에서 이미 snake_case로 전송하므로 그대로 사용
        const backendBody = {
            tank_id: body.tank_id,
            final_cabbage_salinity: body.final_cabbage_salinity,
            bend_test: body.bend_test,
            // Wash data - 1차, 3차 세척
            wash1_top_salinity: body.wash1_top_salinity,
            wash1_water_temp: body.wash1_water_temp,
            wash3_top_salinity: body.wash3_top_salinity,
            wash3_water_temp: body.wash3_water_temp,
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
