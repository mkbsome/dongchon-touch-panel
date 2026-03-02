import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.json');

// 배치 정보 (배치 시작 시 입력)
export interface Batch {
    id: string;
    tankId: number;                    // 절임조 번호 (1-3)
    status: 'active' | 'completed';

    // 시간 정보
    startTime: string;                 // 시작 시간 (자동)
    endTime?: string;                  // 종료 시간 (자동)

    // 배추 특성 (수동 입력) - X: 조절 불가
    cultivar: string;                  // 품종
    avgWeight: number;                 // 평균 무게 (kg)
    firmness: number;                  // 단단함 (센서값)
    leafThickness: number;             // 잎 두께 (1-5)
    cabbageSize?: string;              // 배추 크기 (S/M/L/XL)
    totalQuantity: number;             // 입고량 (kg)

    // 환경 정보 (수동 입력) - X': 일부 조절 가능
    roomTemp: number;                  // 실내온도 (°C)
    outdoorTemp?: number;              // 외부온도 (°C)
    season: string;                    // 계절 (봄/여름/가을/겨울)
    initialSalinity: number;           // 초기 염도 (%) - Z: 조절 가능!

    // 종료 시 입력 - Y: 결과 변수
    finalCabbageSalinity?: number;     // 최종 배추 염도 (%)
    washingSalinity?: number;          // 세척조 염도 (%) - 탈염 모니터링
    bendTest?: number;                 // 관능평가 - 휘어짐 (1-5)
    spiciness?: number;                // 매운맛 (SHU 또는 측정값)
    outputQuantity?: number;           // 출하량 (kg)
    qualityGrade?: string;             // 품질등급 (상/중/하)
    notes?: string;                    // 비고
}

// 측정 기록 (수동 트리거 - 공정 중 데이터)
export interface Measurement {
    id: string;
    batchId: string;
    timestamp: string;                 // 측정 시점 (자동)
    elapsedMinutes: number;            // 시작 후 경과 시간 (분)

    // 염도 측정값 (모니터링용)
    salinityTop?: number;              // 상단 염도 (%)
    salinityBottom?: number;           // 하단 염도 (%)

    // 수온 (모니터링용)
    waterTemp?: number;                // 수온 (°C)

    // 웃소금 - Z: 조절 가능 변수 (핵심!)
    addedSalt?: boolean;               // 웃소금 추가 여부
    addedSaltAmount?: number;          // 웃소금 투입량 (kg)

    memo?: string;                     // 메모 (선택)
}

interface Database {
    batches: Batch[];
    measurements: Measurement[];
}

function readDb(): Database {
    if (!fs.existsSync(DB_PATH)) {
        return { batches: [], measurements: [] };
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("Error parsing DB:", error);
        return { batches: [], measurements: [] };
    }
}

function writeDb(data: Database) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// 현재 계절 자동 판단
function getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    return '겨울';
}

// 계절별 기본 염도
function getDefaultSalinity(season: string): number {
    switch (season) {
        case '봄':
        case '가을':
            return 11.5;
        case '여름':
            return 10.5;
        case '겨울':
            return 13.5;
        default:
            return 12.0;
    }
}

export const db = {
    // 모든 배치 조회
    getBatches: () => readDb().batches,

    // 완료된 배치만 조회
    getCompletedBatches: () => {
        const { batches } = readDb();
        return batches.filter(b => b.status === 'completed');
    },

    // 활성 배치 조회 (특정 탱크)
    getActiveBatch: (tankId: number) => {
        const { batches } = readDb();
        return batches.find(b => b.tankId === Number(tankId) && b.status === 'active');
    },

    // 모든 활성 배치 조회
    getActiveBatches: () => {
        const { batches } = readDb();
        return batches.filter(b => b.status === 'active');
    },

    // 새 배치 생성
    createBatch: (batch: Omit<Batch, 'id' | 'startTime' | 'status'>) => {
        const data = readDb();

        // 해당 탱크의 기존 활성 배치 종료
        data.batches.forEach(b => {
            if (b.tankId === batch.tankId && b.status === 'active') {
                b.status = 'completed';
                b.endTime = new Date().toISOString();
            }
        });

        const newBatch: Batch = {
            ...batch,
            id: Date.now().toString(),
            startTime: new Date().toISOString(),
            status: 'active'
        };

        data.batches.push(newBatch);
        writeDb(data);
        return newBatch;
    },

    // 배치 종료 (결과 데이터 포함)
    finishBatch: (tankId: number, finishData: {
        finalCabbageSalinity?: number;
        washingSalinity?: number;
        bendTest?: number;
        spiciness?: number;
        outputQuantity?: number;
        qualityGrade?: string;
        notes?: string;
    }) => {
        const data = readDb();
        const batch = data.batches.find(b => b.tankId === Number(tankId) && b.status === 'active');

        if (batch) {
            batch.status = 'completed';
            batch.endTime = new Date().toISOString();
            batch.finalCabbageSalinity = finishData.finalCabbageSalinity;
            batch.washingSalinity = finishData.washingSalinity;
            batch.bendTest = finishData.bendTest;
            batch.spiciness = finishData.spiciness;
            batch.outputQuantity = finishData.outputQuantity;
            batch.qualityGrade = finishData.qualityGrade;
            batch.notes = finishData.notes;
            writeDb(data);
            return batch;
        }
        return null;
    },

    // 측정 기록 추가 (염도, 수온, 웃소금 포함)
    addMeasurement: (tankId: number, measurementData: {
        salinityTop?: number;
        salinityBottom?: number;
        waterTemp?: number;
        addedSalt?: boolean;
        addedSaltAmount?: number;
        memo?: string;
    }) => {
        const data = readDb();
        const activeBatch = data.batches.find(b => b.tankId === Number(tankId) && b.status === 'active');

        if (!activeBatch) {
            return null;
        }

        // 경과 시간 계산 (분)
        const startTime = new Date(activeBatch.startTime);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));

        const newMeasurement: Measurement = {
            id: Date.now().toString(),
            batchId: activeBatch.id,
            timestamp: now.toISOString(),
            elapsedMinutes,
            salinityTop: measurementData.salinityTop,
            salinityBottom: measurementData.salinityBottom,
            waterTemp: measurementData.waterTemp,
            addedSalt: measurementData.addedSalt,
            addedSaltAmount: measurementData.addedSaltAmount,
            memo: measurementData.memo
        };

        data.measurements.push(newMeasurement);
        writeDb(data);
        return newMeasurement;
    },

    // 특정 배치의 측정 기록 조회
    getMeasurements: (batchId: string) => {
        const { measurements } = readDb();
        return measurements.filter(m => m.batchId === batchId);
    },

    // 모든 측정 기록 조회
    getAllMeasurements: () => {
        return readDb().measurements;
    },

    // 유틸리티
    getCurrentSeason,
    getDefaultSalinity
};
