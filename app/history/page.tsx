"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Calendar, Clock, Droplets, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

// 품종 ID를 이름으로 변환
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
    id: string;
    tankId: number;
    startTime: string;
    endTime?: string;
    cultivar: string;
    cabbageSize?: string;
    avgWeight: number;
    firmness: number;
    leafThickness: number;
    roomTemp: number;
    outdoorTemp?: number;
    season: string;
    initialSalinity: number;
    finalCabbageSalinity?: number;
    bendTest?: number;
    notes?: string;
}

interface Measurement {
    id: string;
    timestamp: string;
    elapsedMinutes: number;
    salinityTop?: number;
    salinityBottom?: number;
    waterTemp?: number;
    addedSalt?: boolean;
    addedSaltAmount?: number;
    memo?: string;
}

export default function HistoryPage() {
    const router = useRouter();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
    const [measurements, setMeasurements] = useState<Record<string, Measurement[]>>({});
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [filterDay, setFilterDay] = useState<string>('');

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const res = await fetch('/api/batches/completed');
                if (res.ok) {
                    const data = await res.json();
                    setBatches(data);
                }
            } catch (error) {
                console.error('Failed to fetch batches:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);

    const fetchMeasurements = async (batchId: string) => {
        if (measurements[batchId]) return;
        try {
            const res = await fetch(`/api/measurements?batchId=${batchId}`);
            if (res.ok) {
                const data = await res.json();
                setMeasurements(prev => ({ ...prev, [batchId]: data }));
            }
        } catch (error) {
            console.error('Failed to fetch measurements:', error);
        }
    };

    const toggleExpand = (batchId: string) => {
        if (expandedBatch === batchId) {
            setExpandedBatch(null);
        } else {
            setExpandedBatch(batchId);
            fetchMeasurements(batchId);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    const getDuration = (start: string, end?: string) => {
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date();
        const diff = endTime.getTime() - startTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${mins}분`;
    };

    const getBendTestLabel = (level?: number) => {
        if (!level) return '-';
        const labels: Record<number, string> = {
            1: '1 (부러짐)',
            2: '2 (약간 부러짐)',
            3: '3 (보통)',
            4: '4 (잘 휘어짐)',
            5: '5 (완벽)'
        };
        return labels[level] || String(level);
    };

    const handleExport = (type: 'batches' | 'measurements' | 'ml') => {
        window.location.href = `/api/export?type=${type}`;
    };

    const availableYears = Array.from(new Set(batches.map(b => new Date(b.startTime).getFullYear()))).sort((a, b) => b - a);

    const filteredBatches = batches.filter(b => {
        const d = new Date(b.startTime);
        if (filterYear && d.getFullYear() !== Number(filterYear)) return false;
        if (filterMonth && d.getMonth() + 1 !== Number(filterMonth)) return false;
        if (filterDay && d.getDate() !== Number(filterDay)) return false;
        return true;
    });

    if (loading) {
        return <div className="h-screen flex items-center justify-center text-2xl">로딩중...</div>;
    }

    return (
        <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-indigo-600 text-white px-8 py-4 flex justify-between items-center flex-shrink-0">
                <button
                    onClick={() => router.push('/')}
                    className="p-3 hover:bg-indigo-700 rounded-xl"
                >
                    <ArrowLeft className="w-8 h-8" />
                </button>
                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-3xl font-bold">완료된 공정 기록</h1>
                    <div className="flex items-center gap-2">
                        <select
                            value={filterYear}
                            onChange={e => { setFilterYear(e.target.value); setFilterMonth(''); setFilterDay(''); }}
                            className="bg-indigo-700 text-white rounded-lg px-3 py-1 text-lg font-bold border border-indigo-400 focus:outline-none"
                        >
                            <option value="">전체 년도</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}년</option>
                            ))}
                        </select>
                        <select
                            value={filterMonth}
                            onChange={e => { setFilterMonth(e.target.value); setFilterDay(''); }}
                            className="bg-indigo-700 text-white rounded-lg px-3 py-1 text-lg font-bold border border-indigo-400 focus:outline-none"
                            disabled={!filterYear}
                        >
                            <option value="">전체 월</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{m}월</option>
                            ))}
                        </select>
                        <select
                            value={filterDay}
                            onChange={e => setFilterDay(e.target.value)}
                            className="bg-indigo-700 text-white rounded-lg px-3 py-1 text-lg font-bold border border-indigo-400 focus:outline-none"
                            disabled={!filterMonth}
                        >
                            <option value="">전체 일</option>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>{d}일</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleExport('batches')}
                        className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-xl text-lg font-bold"
                    >
                        <Download className="w-5 h-5" />
                        배치 CSV
                    </button>
                    <button
                        onClick={() => handleExport('ml')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-lg font-bold"
                    >
                        <Download className="w-5 h-5" />
                        ML용 CSV
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-5 overflow-y-auto">
                {filteredBatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <Calendar className="w-20 h-20 mb-4" />
                        <p className="text-2xl">완료된 공정 기록이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredBatches.map(batch => (
                            <div
                                key={batch.id}
                                className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden"
                            >
                                {/* Batch Header - Clickable */}
                                <button
                                    onClick={() => toggleExpand(batch.id)}
                                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold text-xl">
                                            {batch.tankId}번 조
                                        </div>
                                        <div>
                                            <div className="font-bold text-xl text-left">
                                                {CULTIVAR_NAMES[batch.cultivar] || batch.cultivar}
                                                {batch.cabbageSize && (
                                                    <span className="ml-2 text-slate-500">({batch.cabbageSize})</span>
                                                )}
                                            </div>
                                            <div className="text-slate-500 text-lg text-left">
                                                {formatDate(batch.startTime)} {formatTime(batch.startTime)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Clock className="w-5 h-5" />
                                                <span className="font-bold text-lg">
                                                    {getDuration(batch.startTime, batch.endTime)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className={clsx(
                                                "px-4 py-2 rounded-xl font-bold text-lg",
                                                batch.finalCabbageSalinity && batch.finalCabbageSalinity >= 1.5 && batch.finalCabbageSalinity <= 2
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-amber-100 text-amber-700"
                                            )}>
                                                <Droplets className="w-5 h-5 inline mr-1" />
                                                {batch.finalCabbageSalinity?.toFixed(1) || '-'}%
                                            </div>

                                            <div className={clsx(
                                                "px-4 py-2 rounded-xl font-bold text-lg",
                                                batch.bendTest && batch.bendTest >= 4
                                                    ? "bg-green-100 text-green-700"
                                                    : batch.bendTest === 3
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-red-100 text-red-700"
                                            )}>
                                                <Star className="w-5 h-5 inline mr-1" />
                                                {batch.bendTest || '-'}등급
                                            </div>
                                        </div>

                                        {expandedBatch === batch.id ? (
                                            <ChevronUp className="w-8 h-8 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-8 h-8 text-slate-400" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {expandedBatch === batch.id && (
                                    <div className="border-t-2 border-slate-200 p-5 bg-slate-50">
                                        <div className="grid grid-cols-3 gap-6">
                                            {/* 배추 정보 */}
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-700 mb-3">배추 정보</h3>
                                                <div className="space-y-2 text-lg">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">평균 무게:</span>
                                                        <span className="font-bold">{batch.avgWeight}kg</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">단단함:</span>
                                                        <span className="font-bold">{batch.firmness}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">잎 두께:</span>
                                                        <span className="font-bold">{batch.leafThickness}/5</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 환경/공정 조건 */}
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-700 mb-3">공정 조건</h3>
                                                <div className="space-y-2 text-lg">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">계절:</span>
                                                        <span className="font-bold">{batch.season}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">실내온도:</span>
                                                        <span className="font-bold">{batch.roomTemp}°C</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">초기 염도:</span>
                                                        <span className="font-bold text-blue-600">{batch.initialSalinity}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 결과 */}
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-700 mb-3">결과</h3>
                                                <div className="space-y-2 text-lg">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">최종 염도:</span>
                                                        <span className="font-bold text-green-600">
                                                            {batch.finalCabbageSalinity?.toFixed(1) || '-'}%
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">휘어짐:</span>
                                                        <span className="font-bold">{getBendTestLabel(batch.bendTest)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 측정 기록 */}
                                        {measurements[batch.id] && measurements[batch.id].length > 0 && (
                                            <div className="mt-6">
                                                <h3 className="font-bold text-lg text-slate-700 mb-3">측정 기록</h3>
                                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                    <table className="w-full text-lg">
                                                        <thead className="bg-slate-100">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left">경과시간</th>
                                                                <th className="px-4 py-3 text-center">상단염도</th>
                                                                <th className="px-4 py-3 text-center">하단염도</th>
                                                                <th className="px-4 py-3 text-center">수온</th>
                                                                <th className="px-4 py-3 text-center">웃소금</th>
                                                                <th className="px-4 py-3 text-left">메모</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {measurements[batch.id].map((m, idx) => (
                                                                <tr key={m.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                                    <td className="px-4 py-3">
                                                                        {Math.floor(m.elapsedMinutes / 60)}시간 {m.elapsedMinutes % 60}분
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {m.salinityTop?.toFixed(1) || '-'}%
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {m.salinityBottom?.toFixed(1) || '-'}%
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {m.waterTemp || '-'}°C
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {m.addedSalt ? (
                                                                            <span className="text-amber-600 font-bold">
                                                                                +{m.addedSaltAmount || 0}kg
                                                                            </span>
                                                                        ) : '-'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-500">
                                                                        {m.memo || '-'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* 특이사항 */}
                                        {batch.notes && (
                                            <div className="mt-6">
                                                <h3 className="font-bold text-lg text-slate-700 mb-2">특이사항</h3>
                                                <p className="text-lg text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
                                                    {batch.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
