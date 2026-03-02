import { NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8000';

// GET: 완료된 배치 목록 조회 (최신순)
export async function GET() {
    try {
        const res = await fetch(`${API_BASE}/api/batches/completed`);
        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // Convert snake_case to camelCase for frontend compatibility
        const frontendData = data.map((batch: Record<string, unknown>) => ({
            id: String(batch.id),
            tankId: batch.tank_id,
            status: batch.status,
            startTime: batch.start_time,
            endTime: batch.end_time,
            cultivar: batch.cultivar,
            avgWeight: batch.avg_weight,
            firmness: batch.firmness,
            leafThickness: batch.leaf_thickness,
            cabbageSize: batch.cabbage_size,
            totalQuantity: batch.total_quantity,
            roomTemp: batch.room_temp,
            outdoorTemp: batch.outdoor_temp,
            season: batch.season,
            initialSalinity: batch.initial_salinity,
            finalCabbageSalinity: batch.final_cabbage_salinity,
            washingSalinity: batch.washing_salinity,
            bendTest: batch.bend_test,
            spiciness: batch.spiciness,
            outputQuantity: batch.output_quantity,
            qualityGrade: batch.quality_grade,
            notes: batch.notes,
        }));

        return NextResponse.json(frontendData);
    } catch (error) {
        console.error('Backend error:', error);
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }
}
