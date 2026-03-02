"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

const CULTIVAR_NAMES: Record<string, string> = {
    'bulam3': '불암3호',
    'bulamplus': '불암플러스',
    'hwiparam': '휘파람골드',
    'hwimori': '휘모리',
    'cheongomabi': '천고마비',
    'giwunchan': '기운찬',
    'cheongmyung': '청명가을',
    'hwanggeumstar': '황금스타',
    'other': '기타',
};

interface Batch {
    id: number;
    tank_id: number;
    cultivar: string;
    status: string;
    start_time: string;
    end_time?: string;
    avg_weight?: number;
    cabbage_size?: string;
    initial_salinity?: number;
    final_cabbage_salinity?: number;
    bend_test?: number;
}

interface Measurement {
    id: number;
    batch_id: number;
    timestamp: string;
    salinity_top?: number;
    salinity_bottom?: number;
    water_temp?: number;
    added_salt?: boolean;
    added_salt_amount?: number;
}

interface WashRecord {
    id: number;
    batch_id: number;
    wash_cycle: number;
    timestamp: string;
    salinity_top?: number;
    salinity_bottom?: number;
    water_temp?: number;
    ph?: number;
}

type TabType = 'batches' | 'measurements' | 'wash';

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('batches');
    const [batches, setBatches] = useState<Batch[]>([]);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);
    const [washRecords, setWashRecords] = useState<WashRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatch, setExpandedBatch] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [batchRes, measRes, washRes] = await Promise.all([
                fetch('/api/admin/batches'),
                fetch('/api/admin/measurements'),
                fetch('/api/admin/wash-records'),
            ]);

            if (batchRes.ok) setBatches(await batchRes.json());
            if (measRes.ok) setMeasurements(await measRes.json());
            if (washRes.ok) setWashRecords(await washRes.json());
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getMeasurementsForBatch = (batchId: number) => {
        return measurements.filter(m => m.batch_id === batchId);
    };

    const getWashRecordsForBatch = (batchId: number) => {
        return washRecords.filter(w => w.batch_id === batchId);
    };

    const tabs = [
        { id: 'batches' as TabType, label: '배치 목록', count: batches.length },
        { id: 'measurements' as TabType, label: '측정 기록', count: measurements.length },
        { id: 'wash' as TabType, label: '세척 기록', count: washRecords.length },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-4 flex justify-between items-center flex-shrink-0 shadow-lg">
                <button
                    onClick={() => router.push('/')}
                    className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all"
                >
                    <ArrowLeft className="w-7 h-7" />
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Database className="w-7 h-7" />
                    관리자 - 데이터 뷰어
                </h1>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all"
                >
                    <RefreshCw className={clsx("w-6 h-6", loading && "animate-spin")} />
                </button>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 px-6">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "px-6 py-4 font-bold text-lg transition-all border-b-4",
                                activeTab === tab.id
                                    ? "border-slate-700 text-slate-800"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {tab.label}
                            <span className={clsx(
                                "ml-2 px-2 py-0.5 rounded-full text-sm",
                                activeTab === tab.id
                                    ? "bg-slate-700 text-white"
                                    : "bg-slate-200 text-slate-500"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 p-6 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-500 text-xl">
                        데이터 로딩중...
                    </div>
                ) : (
                    <>
                        {/* Batches Tab */}
                        {activeTab === 'batches' && (
                            <div className="space-y-4">
                                {batches.length === 0 ? (
                                    <div className="text-center text-slate-400 py-12">배치 데이터가 없습니다.</div>
                                ) : (
                                    batches.map((batch) => (
                                        <div key={batch.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                            <button
                                                onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={clsx(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl",
                                                        batch.status === 'active' ? "bg-blue-500" : "bg-emerald-500"
                                                    )}>
                                                        {batch.tank_id}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-lg text-slate-800">
                                                            {CULTIVAR_NAMES[batch.cultivar] || batch.cultivar}
                                                        </div>
                                                        <div className="text-sm text-slate-500">
                                                            ID: {batch.id} · {formatDateTime(batch.start_time)}
                                                            {batch.end_time && ` ~ ${formatDateTime(batch.end_time)}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={clsx(
                                                        "px-3 py-1 rounded-full text-sm font-bold",
                                                        batch.status === 'active'
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-emerald-100 text-emerald-700"
                                                    )}>
                                                        {batch.status === 'active' ? '진행중' : '완료'}
                                                    </span>
                                                    {expandedBatch === batch.id
                                                        ? <ChevronUp className="w-6 h-6 text-slate-400" />
                                                        : <ChevronDown className="w-6 h-6 text-slate-400" />
                                                    }
                                                </div>
                                            </button>

                                            {expandedBatch === batch.id && (
                                                <div className="px-6 pb-6 border-t border-slate-100">
                                                    <div className="grid grid-cols-4 gap-4 mt-4 mb-6">
                                                        <div className="bg-slate-50 rounded-xl p-3">
                                                            <div className="text-sm text-slate-400">평균 무게</div>
                                                            <div className="font-bold text-slate-700">{batch.avg_weight || '-'} kg</div>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-xl p-3">
                                                            <div className="text-sm text-slate-400">크기</div>
                                                            <div className="font-bold text-slate-700">{batch.cabbage_size || '-'}</div>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-xl p-3">
                                                            <div className="text-sm text-slate-400">초기 염도</div>
                                                            <div className="font-bold text-slate-700">{batch.initial_salinity || '-'}%</div>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-xl p-3">
                                                            <div className="text-sm text-slate-400">최종 염도</div>
                                                            <div className="font-bold text-slate-700">{batch.final_cabbage_salinity || '-'}%</div>
                                                        </div>
                                                    </div>

                                                    {/* Measurements */}
                                                    <div className="mb-4">
                                                        <h3 className="font-bold text-slate-600 mb-2">측정 기록 ({getMeasurementsForBatch(batch.id).length}건)</h3>
                                                        {getMeasurementsForBatch(batch.id).length === 0 ? (
                                                            <div className="text-sm text-slate-400">측정 기록 없음</div>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-slate-100">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left">시간</th>
                                                                            <th className="px-3 py-2 text-center">상단 염도</th>
                                                                            <th className="px-3 py-2 text-center">하단 염도</th>
                                                                            <th className="px-3 py-2 text-center">수온</th>
                                                                            <th className="px-3 py-2 text-center">웃소금</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {getMeasurementsForBatch(batch.id).map((m) => (
                                                                            <tr key={m.id} className="border-b border-slate-100">
                                                                                <td className="px-3 py-2">{formatDateTime(m.timestamp)}</td>
                                                                                <td className="px-3 py-2 text-center">{m.salinity_top}%</td>
                                                                                <td className="px-3 py-2 text-center">{m.salinity_bottom}%</td>
                                                                                <td className="px-3 py-2 text-center">{m.water_temp}°C</td>
                                                                                <td className="px-3 py-2 text-center">
                                                                                    {m.added_salt ? `${m.added_salt_amount}kg` : '-'}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Wash Records */}
                                                    <div>
                                                        <h3 className="font-bold text-slate-600 mb-2">세척 기록 ({getWashRecordsForBatch(batch.id).length}건)</h3>
                                                        {getWashRecordsForBatch(batch.id).length === 0 ? (
                                                            <div className="text-sm text-slate-400">세척 기록 없음</div>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-cyan-50">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left">회차</th>
                                                                            <th className="px-3 py-2 text-left">시간</th>
                                                                            <th className="px-3 py-2 text-center">상단 염도</th>
                                                                            <th className="px-3 py-2 text-center">하단 염도</th>
                                                                            <th className="px-3 py-2 text-center">온도</th>
                                                                            <th className="px-3 py-2 text-center">pH</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {getWashRecordsForBatch(batch.id).map((w) => (
                                                                            <tr key={w.id} className="border-b border-slate-100">
                                                                                <td className="px-3 py-2 font-bold">{w.wash_cycle}회</td>
                                                                                <td className="px-3 py-2">{formatDateTime(w.timestamp)}</td>
                                                                                <td className="px-3 py-2 text-center">{w.salinity_top}%</td>
                                                                                <td className="px-3 py-2 text-center">{w.salinity_bottom}%</td>
                                                                                <td className="px-3 py-2 text-center">{w.water_temp}°C</td>
                                                                                <td className="px-3 py-2 text-center">{w.ph}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Measurements Tab */}
                        {activeTab === 'measurements' && (
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                {measurements.length === 0 ? (
                                    <div className="text-center text-slate-400 py-12">측정 데이터가 없습니다.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold">ID</th>
                                                    <th className="px-4 py-3 text-left font-bold">배치 ID</th>
                                                    <th className="px-4 py-3 text-left font-bold">시간</th>
                                                    <th className="px-4 py-3 text-center font-bold">상단 염도</th>
                                                    <th className="px-4 py-3 text-center font-bold">하단 염도</th>
                                                    <th className="px-4 py-3 text-center font-bold">수온</th>
                                                    <th className="px-4 py-3 text-center font-bold">웃소금</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {measurements.map((m) => (
                                                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-mono text-slate-500">{m.id}</td>
                                                        <td className="px-4 py-3 font-bold">{m.batch_id}</td>
                                                        <td className="px-4 py-3">{formatDateTime(m.timestamp)}</td>
                                                        <td className="px-4 py-3 text-center">{m.salinity_top}%</td>
                                                        <td className="px-4 py-3 text-center">{m.salinity_bottom}%</td>
                                                        <td className="px-4 py-3 text-center">{m.water_temp}°C</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {m.added_salt ? (
                                                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-sm font-bold">
                                                                    {m.added_salt_amount}kg
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Wash Records Tab */}
                        {activeTab === 'wash' && (
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                {washRecords.length === 0 ? (
                                    <div className="text-center text-slate-400 py-12">세척 데이터가 없습니다.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-cyan-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold">ID</th>
                                                    <th className="px-4 py-3 text-left font-bold">배치 ID</th>
                                                    <th className="px-4 py-3 text-center font-bold">회차</th>
                                                    <th className="px-4 py-3 text-left font-bold">시간</th>
                                                    <th className="px-4 py-3 text-center font-bold">상단 염도</th>
                                                    <th className="px-4 py-3 text-center font-bold">하단 염도</th>
                                                    <th className="px-4 py-3 text-center font-bold">온도</th>
                                                    <th className="px-4 py-3 text-center font-bold">pH</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {washRecords.map((w) => (
                                                    <tr key={w.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-mono text-slate-500">{w.id}</td>
                                                        <td className="px-4 py-3 font-bold">{w.batch_id}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full text-sm font-bold">
                                                                {w.wash_cycle}회
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">{formatDateTime(w.timestamp)}</td>
                                                        <td className="px-4 py-3 text-center">{w.salinity_top}%</td>
                                                        <td className="px-4 py-3 text-center">{w.salinity_bottom}%</td>
                                                        <td className="px-4 py-3 text-center">{w.water_temp}°C</td>
                                                        <td className="px-4 py-3 text-center">{w.ph}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
