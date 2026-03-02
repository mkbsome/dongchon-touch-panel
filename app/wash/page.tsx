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
    salinity?: number;      // 단일 염도
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

    const [formData, setFormData] = useState({
        washCycle: 1,
        salinity: 3.0,      // 단일 염도
        waterTemp: 15.0,
        ph: 7.0,
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

        setFormData(prev => ({
            ...prev,
            washCycle: selectedBatch.nextCycle
        }));
    }, [selectedBatch]);

    const handleSubmit = async () => {
        if (!selectedBatch) {
            alert('절임조(배치)를 선택해주세요.');
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/wash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchId: selectedBatch.batchId,
                    washTankId: Number(washTankId),
                    washCycle: formData.washCycle,
                    salinity: formData.salinity,
                    waterTemp: formData.waterTemp,
                    ph: formData.ph,
                })
            });

            if (!res.ok) throw new Error('Failed to create wash record');

            const recordsRes = await fetch(`/api/wash?batchId=${selectedBatch.batchId}`);
            if (recordsRes.ok) {
                const data = await recordsRes.json();
                setWashRecords(data);
            }

            setFormData(prev => ({
                ...prev,
                washCycle: prev.washCycle + 1,
            }));

            const batchesRes = await fetch('/api/wash/active-batches');
            if (batchesRes.ok) {
                const batchesData = await batchesRes.json();
                setActiveBatches(batchesData);
                const updatedBatch = batchesData.find((b: ActiveBatch) => b.batchId === selectedBatch.batchId);
                if (updatedBatch) {
                    setSelectedBatch(updatedBatch);
                }
            }
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
                <div className="h-full grid grid-cols-2 gap-5">
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
                                <div className="grid grid-cols-2 gap-3">
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
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className={clsx(
                                                        "text-3xl font-black",
                                                        selectedBatch?.batchId === batch.batchId ? "text-white" : "text-slate-700"
                                                    )}>
                                                        {batch.tankNumber}번
                                                    </div>
                                                    {batch.status === 'completed' && (
                                                        <span className={clsx(
                                                            "text-xs px-2 py-0.5 rounded-full font-bold",
                                                            selectedBatch?.batchId === batch.batchId
                                                                ? "bg-white/30 text-white"
                                                                : "bg-emerald-500 text-white"
                                                        )}>
                                                            완료
                                                        </span>
                                                    )}
                                                </div>
                                                {batch.washCount > 0 && (
                                                    <span className={clsx(
                                                        "text-sm px-2 py-1 rounded-lg font-bold",
                                                        selectedBatch?.batchId === batch.batchId
                                                            ? "bg-white/30 text-white"
                                                            : "bg-cyan-100 text-cyan-700"
                                                    )}>
                                                        세척 {batch.washCount}회
                                                    </span>
                                                )}
                                            </div>
                                            <div className={clsx(
                                                "text-lg font-bold mt-1",
                                                selectedBatch?.batchId === batch.batchId ? "text-cyan-100" : "text-slate-500"
                                            )}>
                                                {CULTIVAR_NAMES[batch.cultivar] || batch.cultivar}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Wash History */}
                        <section className="bg-white rounded-3xl shadow-lg p-5 flex-1 overflow-hidden flex flex-col">
                            <h2 className="text-xl font-bold text-slate-700 mb-4">
                                세척 기록 {selectedBatch && `(${selectedBatch.tankNumber}번 절임조)`}
                            </h2>

                            {!selectedBatch ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400">
                                    절임조를 선택하면 세척 기록이 표시됩니다.
                                </div>
                            ) : washRecords.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400">
                                    아직 세척 기록이 없습니다.
                                </div>
                            ) : (
                                <div className="overflow-y-auto flex-1 space-y-2">
                                    {washRecords.map((record) => (
                                        <div
                                            key={record.id}
                                            className="p-3 bg-cyan-50 rounded-2xl flex items-center gap-4"
                                        >
                                            <div className="w-14 h-14 bg-cyan-500 rounded-xl flex items-center justify-center">
                                                <span className="text-2xl font-black text-white">
                                                    {record.washCycle}
                                                </span>
                                            </div>
                                            <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                                                <div>
                                                    <div className="text-slate-400">염도</div>
                                                    <div className="font-bold text-slate-700">{record.salinity?.toFixed(1) || '-'}%</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400">온도</div>
                                                    <div className="font-bold text-slate-700">{record.waterTemp?.toFixed(1) || '-'}°C</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400">pH</div>
                                                    <div className="font-bold text-slate-700">{record.ph?.toFixed(1) || '-'}</div>
                                                </div>
                                            </div>
                                            <div className="text-slate-400 text-sm">
                                                {formatTime(record.timestamp)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right - Input Form */}
                    <div className="flex flex-col gap-4">
                        {/* Wash Cycle */}
                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                                    <Waves className="w-6 h-6 text-cyan-500" />
                                </div>
                                세척 회차
                            </h2>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, washCycle: Math.max(1, prev.washCycle - 1) }))}
                                    className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                >-</button>
                                <div className="flex-1 min-w-0 h-16 flex items-center justify-center text-4xl font-black text-cyan-600 bg-cyan-50 rounded-2xl border-2 border-cyan-200">
                                    {formData.washCycle}회
                                </div>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, washCycle: prev.washCycle + 1 }))}
                                    className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                >+</button>
                            </div>
                        </section>

                        {/* Salinity Input - 단일 염도 */}
                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Droplets className="w-6 h-6 text-blue-500" />
                                </div>
                                염도 (%)
                            </h2>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, salinity: Math.max(0, Number((prev.salinity - 0.1).toFixed(1))) }))}
                                    className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                >-</button>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.salinity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, salinity: Number(e.target.value) }))}
                                    className="flex-1 min-w-0 h-16 text-center text-4xl font-black text-blue-600 border-2 border-blue-200 rounded-2xl bg-blue-50"
                                />
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, salinity: Number((prev.salinity + 0.1).toFixed(1)) }))}
                                    className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                >+</button>
                            </div>
                        </section>

                        {/* Temperature & pH */}
                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Thermometer className="w-5 h-5 text-orange-500" />
                                        </div>
                                        온도 (°C)
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, waterTemp: Math.max(0, Number((prev.waterTemp - 0.1).toFixed(1))) }))}
                                            className="w-12 h-14 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.waterTemp}
                                            onChange={(e) => setFormData(prev => ({ ...prev, waterTemp: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-14 text-center text-2xl font-black text-orange-600 border-2 border-orange-200 rounded-xl bg-orange-50"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, waterTemp: Number((prev.waterTemp + 0.1).toFixed(1)) }))}
                                            className="w-12 h-14 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >+</button>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <FlaskConical className="w-5 h-5 text-purple-500" />
                                        </div>
                                        pH
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, ph: Math.max(0, +(prev.ph - 0.1).toFixed(1)) }))}
                                            className="w-12 h-14 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.ph}
                                            onChange={(e) => setFormData(prev => ({ ...prev, ph: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-14 text-center text-2xl font-black text-purple-600 border-2 border-purple-200 rounded-xl bg-purple-50"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, ph: Math.min(14, +(prev.ph + 0.1).toFixed(1)) }))}
                                            className="w-12 h-14 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
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
                                "w-full py-6 rounded-2xl font-bold text-2xl shadow-xl transition-all flex items-center justify-center gap-3 mt-auto",
                                submitting || !selectedBatch
                                    ? "bg-slate-400 text-white cursor-not-allowed"
                                    : "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white active:scale-[0.98]"
                            )}
                        >
                            <Check className="w-7 h-7" />
                            {submitting ? '저장 중...' : `${formData.washCycle}회차 세척 저장`}
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
