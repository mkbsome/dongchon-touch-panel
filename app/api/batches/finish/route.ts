import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

// POST: 배치 종료 (결과 데이터 + 세척 데이터 포함)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Convert camelCase to snake_case for backend
        const backendBody = {
            tank_id: body.tankId,
            final_cabbage_salinity: body.finalCabbageSalinity,
            washing_salinity: body.washingSalinity,
            bend_test: body.bendTest,
            spiciness: body.spiciness,
            output_quantity: body.outputQuantity,
            quality_grade: body.qualityGrade,
            notes: body.notes,
            // Wash data (3 cycles)
            wash1_top_salinity: body.wash1TopSalinity,
            wash1_bottom_salinity: body.wash1BottomSalinity,
            wash1_water_temp: body.wash1WaterTemp,
            wash2_top_salinity: body.wash2TopSalinity,
            wash2_bottom_salinity: body.wash2BottomSalinity,
            wash2_water_temp: body.wash2WaterTemp,
            wash3_top_salinity: body.wash3TopSalinity,
            wash3_bottom_salinity: body.wash3BottomSalinity,
            wash3_water_temp: body.wash3WaterTemp,
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
