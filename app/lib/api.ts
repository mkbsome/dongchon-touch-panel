// API client for FastAPI backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchApi<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

// API functions
export const api = {
    // Batches
    getTankStatus: () => fetchApi<Record<number, TankStatus>>('/api/batches'),

    createBatch: (data: BatchCreateData) =>
        fetchApi<BatchResponse>('/api/batches', {
            method: 'POST',
            body: JSON.stringify({
                tank_id: data.tankId,
                cultivar: data.cultivar,
                avg_weight: data.avgWeight,
                firmness: data.firmness,
                leaf_thickness: data.leafThickness,
                total_quantity: data.totalQuantity,
                room_temp: data.roomTemp,
                season: data.season,
                initial_salinity: data.initialSalinity,
            }),
        }),

    finishBatch: (data: BatchFinishData) =>
        fetchApi<BatchResponse>('/api/batches/finish', {
            method: 'POST',
            body: JSON.stringify({
                tank_id: data.tankId,
                final_cabbage_salinity: data.finalCabbageSalinity,
                washing_salinity: data.washingSalinity,
                bend_test: data.bendTest,
                spiciness: data.spiciness,
                output_quantity: data.outputQuantity,
                quality_grade: data.qualityGrade,
                notes: data.notes,
            }),
        }),

    getCompletedBatches: () =>
        fetchApi<BatchResponse[]>('/api/batches/completed'),

    // Measurements
    getMeasurements: (batchId: number) =>
        fetchApi<MeasurementResponse[]>(`/api/measurements?batch_id=${batchId}`),

    addMeasurement: (data: MeasurementCreateData) =>
        fetchApi<MeasurementResponse>('/api/measurements', {
            method: 'POST',
            body: JSON.stringify({
                tank_id: data.tankId,
                salinity_top: data.salinityTop,
                salinity_bottom: data.salinityBottom,
                water_temp: data.waterTemp,
                added_salt: data.addedSalt,
                added_salt_amount: data.addedSaltAmount,
                memo: data.memo,
            }),
        }),

    // Export
    exportCsv: (type: 'batches' | 'measurements' | 'ml' = 'batches') =>
        `${API_BASE}/api/export?type=${type}`,
};

// Types
export interface TankStatus {
    active: boolean;
    cultivar?: string;
    start_time?: string;
    batch_id?: number;
    avg_weight?: number;
    total_quantity?: number;
}

export interface BatchCreateData {
    tankId: number;
    cultivar: string;
    avgWeight?: number;
    firmness?: number;
    leafThickness?: number;
    totalQuantity?: number;
    roomTemp?: number;
    season?: string;
    initialSalinity?: number;
}

export interface BatchFinishData {
    tankId: number;
    finalCabbageSalinity?: number;
    washingSalinity?: number;
    bendTest?: number;
    spiciness?: number;
    outputQuantity?: number;
    qualityGrade?: string;
    notes?: string;
}

export interface BatchResponse {
    id: number;
    tank_id: number;
    status: string;
    start_time: string;
    end_time?: string;
    cultivar: string;
    avg_weight: number;
    firmness: number;
    leaf_thickness: number;
    cabbage_size?: string;
    total_quantity: number;
    room_temp: number;
    outdoor_temp?: number;
    season: string;
    initial_salinity: number;
    final_cabbage_salinity?: number;
    washing_salinity?: number;
    bend_test?: number;
    spiciness?: number;
    output_quantity?: number;
    quality_grade?: string;
    notes?: string;
}

export interface MeasurementCreateData {
    tankId: number;
    salinityTop?: number;
    salinityBottom?: number;
    waterTemp?: number;
    addedSalt?: boolean;
    addedSaltAmount?: number;
    memo?: string;
}

export interface MeasurementResponse {
    id: number;
    batch_id: number;
    timestamp: string;
    elapsed_minutes: number;
    salinity_top?: number;
    salinity_bottom?: number;
    water_temp?: number;
    added_salt: boolean;
    added_salt_amount?: number;
    memo?: string;
}
