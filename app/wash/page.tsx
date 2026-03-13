"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Waves, Droplets, Thermometer, FlaskConical, Check, Home } from 'lucide-react';
import { clsx } from 'clsx';

interface ActiveBatch {
    batchId: number;
    tankNumber: number;
    tankName: string;
    cultivar: string;
    status: string;
    startTime: string;
    endTime?: string;
    washCount: number;
    nextCycle: number;
}

interface WashRecord {
    id: number;
    batchId: number;
    washCycle: number;
    timestamp: string;
    salinity?: number;
    waterTemp?: number;
    ph?: number;
}

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

function WashContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const washTankId = searchParams.get('tankId') || '1';

    const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<ActiveBatch | null>(null);
    const [washRecords, setWashRecords] = useState<WashRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // 1차, 3차 따로 입력
    const [formData, setFormData] = useState({
        // 1차 세척
        wash1Salinity: 5.0,
        wash1WaterTemp: 15.0,
        wash1Ph: 7.0,
        // 3차 세척
        wash3Salinity: 2.5,
        wash3WaterTemp: 15.0,
        wash3Ph: 7.0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/wash/active-batches');
                if (res.ok) {
                    const data = await res.json();
                    setActiveBatches(data);
                }
            } catch (error) {
                console.error('Failed to fetch active batches:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedBatch) {
            setWashRecords([]);
            return;
        }

        const fetchWashRecords = async () => {
            try {
                const res = await fetch(`/api/wash?batchId=${selectedBatch.batchId}`);
                if (res.ok) {
                    const data = await res.json();
                    setWashRecords(data);
                }
            } catch (error) {
                console.error('Failed to fetch wash records:', error);
            }
        };

        fetchWashRecords();
    }, [selectedBatch]);

    const handleSubmit = async () => {
        if (!selectedBatch) {
            alert('절임조(배치)를 선택해주세요.');
            return;
        }

        setSubmitting(true);

        try {
            // 1차 세척 저장
            await fetch('/api/wash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchId: selectedBatch.batchId,
                    washTankId: Number(washTankId),
                    washCycle: 1,
                    salinity: formData.wash1Salinity,
                    waterTemp: formData.wash1WaterTemp,
                    ph: formData.wash1Ph,
                })
            });

            // 3차 세척 저장
            await fetch('/api/wash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchId: selectedBatch.batchId,
                    washTankId: Number(washTankId),
                    washCycle: 3,
                    salinity: formData.wash3Salinity,
                    waterTemp: formData.wash3WaterTemp,
                    ph: formData.wash3Ph,
                })
            });

            // 기록 새로고침
            const recordsRes = await fetch(`/api/wash?batchId=${selectedBatch.batchId}`);
            if (recordsRes.ok) {
                const data = await recordsRes.json();
                setWashRecords(data);
            }

            const batchesRes = await fetch('/api/wash/active-batches');
            if (batchesRes.ok) {
                const batchesData = await batchesRes.json();
                setActiveBatches(batchesData);
                const updatedBatch = batchesData.find((b: ActiveBatch) => b.batchId === selectedBatch.batchId);
                if (updatedBatch) {
                    setSelectedBatch(updatedBatch);
                }
            }

            alert('1차, 3차 세척 데이터가 저장되었습니다.');
        } catch (error) {
            console.error('Error creating wash record:', error);
            alert('세척 데이터 저장 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (timeStr: string) => {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-2xl text-slate-500">로딩중...</div>;

    return (
        <div className="h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-4 flex justify-between items-center flex-shrink-0 shadow-lg">
                <button
                    onClick={() => router.back()}
                    className="w-14 h-14 flex items-center justify-center hover:bg-white/20 rounded-2xl transition-all"
                >
                    <ArrowLeft className="w-8 h-8" />
                </button>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Waves className="w-8 h-8" />
                    세척 데이터 입력
                </h1>
                <button
                    onClick={() => router.push('/')}
                    className="w-14 h-14 flex items-center justify-center hover:bg-white/20 rounded-2xl transition-all"
                >
                    <Home className="w-7 h-7" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-5 overflow-hidden">
                <div className="h-full grid grid-cols-3 gap-5">
                    {/* Left - Batch Selection & History */}
                    <div className="flex flex-col gap-4 overflow-hidden">
                        {/* Batch Selection */}
                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-slate-700 mb-4">
                                절임조 선택
                            </h2>

                            {activeBatches.length === 0 ? (
                                <div className="text-center text-slate-400 py-8">
                                    진행 중인 절임 공정이 없습니다.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {activeBatches.map((batch) => (
                                        <button
                                            key={batch.batchId}
                                            onClick={() => setSelectedBatch(batch)}
                                            className={clsx(
                                                "p-4 rounded-2xl text-left transition-all",
                                                selectedBatch?.batchId === batch.batchId
                                                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-200"
                                                    : batch.status === 'completed'
                                                        ? "bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                                                        : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                                            )}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className={clsx(
                                                    "text-2xl font-black",
                                                    selectedBatch?.batchId === batch.batchId ? "text-white" : "text-slate-700"
                                                )}>
                                                    {batch.tankNumber}번
                                                </div>
                                                <div className={clsx(
                                                    "text-lg font-bold",
                                                    selectedBatch?.batchId === batch.batchId ? "text-cyan-100" : "text-slate-500"
                                                )}>
                                                    {CULTIVAR_NAMES[batch.cultivar] || batch.cultivar}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Wash History */}
                        <section className="bg-white rounded-3xl shadow-lg p-5 flex-1 overflow-hidden flex flex-col">
                            <h2 className="text-xl font-bold text-slate-700 mb-4">
                                세척 기록
                            </h2>

                            {!selectedBatch ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400">
                                    절임조를 선택하세요
                                </div>
                            ) : washRecords.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400">
                                    기록 없음
                                </div>
                            ) : (
                                <div className="overflow-y-auto flex-1 space-y-2">
                                    {washRecords.map((record) => (
                                        <div
                                            key={record.id}
                                            className={clsx(
                                                "p-3 rounded-2xl flex items-center gap-3",
                                                record.washCycle === 1 ? "bg-cyan-50" : "bg-teal-50"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                record.washCycle === 1 ? "bg-cyan-500" : "bg-teal-500"
                                            )}>
                                                <span className="text-xl font-black text-white">
                                                    {record.washCycle}
                                                </span>
                                            </div>
                                            <div className="flex-1 text-sm">
                                                <div className="font-bold text-slate-700">
                                                    {record.salinity?.toFixed(1)}% · {record.waterTemp?.toFixed(1)}°C · pH {record.ph?.toFixed(1)}
                                                </div>
                                                <div className="text-slate-400">{formatTime(record.timestamp)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Middle - 1차 세척 */}
                    <div className="flex flex-col gap-4">
                        <section className="bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-3xl shadow-lg p-5 flex-1">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">1</span>
                                1차 세척 (초벌)
                            </h2>

                            <div className="space-y-5">
                                {/* 염도 */}
                                <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                                    <label className="flex items-center gap-2 text-cyan-100 font-bold mb-3">
                                        <Droplets className="w-5 h-5" />
                                        염도 (%)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash1Salinity: Math.max(0, Number((prev.wash1Salinity - 0.1).toFixed(1))) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.wash1Salinity}
                                            onChange={(e) => setFormData(prev => ({ ...prev, wash1Salinity: Number(e.target.value) }))}
                                            className="flex-1 h-12 text-center text-2xl font-black text-cyan-600 rounded-xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash1Salinity: Number((prev.wash1Salinity + 0.1).toFixed(1)) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >+</button>
                                    </div>
                                </div>

                                {/* 온도 */}
                                <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                                    <label className="flex items-center gap-2 text-cyan-100 font-bold mb-3">
                                        <Thermometer className="w-5 h-5" />
                                        온도 (°C)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash1WaterTemp: Math.max(0, Number((prev.wash1WaterTemp - 0.1).toFixed(1))) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.wash1WaterTemp}
                                            onChange={(e) => setFormData(prev => ({ ...prev, wash1WaterTemp: Number(e.target.value) }))}
                                            className="flex-1 h-12 text-center text-2xl font-black text-orange-600 rounded-xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash1WaterTemp: Number((prev.wash1WaterTemp + 0.1).toFixed(1)) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >+</button>
                                    </div>
                                </div>

                                {/* pH */}
                                <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                                    <label className="flex items-center gap-2 text-cyan-100 font-bold mb-3">
                                        <FlaskConical className="w-5 h-5" />
                                        pH
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash1Ph: Math.max(0, Number((prev.wash1Ph - 0.1).toFixed(1))) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.wash1Ph}
                                            onChange={(e) => setFormData(prev => ({ ...prev, wash1Ph: Number(e.target.value) }))}
                                            className="flex-1 h-12 text-center text-2xl font-black text-purple-600 rounded-xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash1Ph: Math.min(14, Number((prev.wash1Ph + 0.1).toFixed(1))) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right - 3차 세척 */}
                    <div className="flex flex-col gap-4">
                        <section className="bg-gradient-to-b from-teal-500 to-teal-600 rounded-3xl shadow-lg p-5 flex-1">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">3</span>
                                3차 세척 (마무리)
                            </h2>

                            <div className="space-y-5">
                                {/* 염도 */}
                                <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                                    <label className="flex items-center gap-2 text-teal-100 font-bold mb-3">
                                        <Droplets className="w-5 h-5" />
                                        염도 (%)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash3Salinity: Math.max(0, Number((prev.wash3Salinity - 0.1).toFixed(1))) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.wash3Salinity}
                                            onChange={(e) => setFormData(prev => ({ ...prev, wash3Salinity: Number(e.target.value) }))}
                                            className="flex-1 h-12 text-center text-2xl font-black text-teal-600 rounded-xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash3Salinity: Number((prev.wash3Salinity + 0.1).toFixed(1)) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >+</button>
                                    </div>
                                </div>

                                {/* 온도 */}
                                <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                                    <label className="flex items-center gap-2 text-teal-100 font-bold mb-3">
                                        <Thermometer className="w-5 h-5" />
                                        온도 (°C)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash3WaterTemp: Math.max(0, Number((prev.wash3WaterTemp - 0.1).toFixed(1))) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.wash3WaterTemp}
                                            onChange={(e) => setFormData(prev => ({ ...prev, wash3WaterTemp: Number(e.target.value) }))}
                                            className="flex-1 h-12 text-center text-2xl font-black text-orange-600 rounded-xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash3WaterTemp: Number((prev.wash3WaterTemp + 0.1).toFixed(1)) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >+</button>
                                    </div>
                                </div>

                                {/* pH */}
                                <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                                    <label className="flex items-center gap-2 text-teal-100 font-bold mb-3">
                                        <FlaskConical className="w-5 h-5" />
                                        pH
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash3Ph: Math.max(0, Number((prev.wash3Ph - 0.1).toFixed(1))) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.wash3Ph}
                                            onChange={(e) => setFormData(prev => ({ ...prev, wash3Ph: Number(e.target.value) }))}
                                            className="flex-1 h-12 text-center text-2xl font-black text-purple-600 rounded-xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, wash3Ph: Math.min(14, Number((prev.wash3Ph + 0.1).toFixed(1))) }))}
                                            className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl font-bold"
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !selectedBatch}
                            className={clsx(
                                "w-full py-6 rounded-2xl font-bold text-2xl shadow-xl transition-all flex items-center justify-center gap-3",
                                submitting || !selectedBatch
                                    ? "bg-slate-400 text-white cursor-not-allowed"
                                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white active:scale-[0.98]"
                            )}
                        >
                            <Check className="w-7 h-7" />
                            {submitting ? '저장 중...' : '1차 + 3차 세척 저장'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function WashPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-2xl text-slate-500">로딩중...</div>}>
            <WashContent />
        </Suspense>
    );
}
