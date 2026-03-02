"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Clock, CheckCircle, Droplets, Thermometer, Home } from 'lucide-react';
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

interface BatchInfo {
    cultivar: string;
    startTime: string;
    totalQuantity: number;
    batchId: string;
    avgWeight?: number;
    cabbageSize?: string;
}

interface MeasurementRecord {
    id: string;
    timestamp: string;
    salinityTop?: number;
    salinityBottom?: number;
    waterTemp?: number;
    addedSalt?: boolean;
    addedSaltAmount?: number;
}

function RecordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tankId = searchParams.get('tankId');

    const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
    const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [now, setNow] = useState(new Date());

    const [formData, setFormData] = useState({
        salinityTop: 10.0,
        salinityBottom: 12.0,
        waterTemp: 15,
        addedSalt: false,
        addedSaltAmount: 5,
    });

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/batches');
                if (res.ok) {
                    const data = await res.json();
                    if (data[Number(tankId)]) {
                        setBatchInfo(data[Number(tankId)]);
                        const measRes = await fetch(`/api/measurements?batchId=${data[Number(tankId)].batchId}`);
                        if (measRes.ok) {
                            const measData = await measRes.json();
                            setMeasurements(measData);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (tankId) {
            fetchData();
        }
    }, [tankId]);

    const getElapsedTime = (startTimeStr?: string) => {
        if (!startTimeStr) return '-';
        const startTime = new Date(startTimeStr);
        const diff = now.getTime() - startTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${mins}분`;
    };

    const formatTime = (timeStr: string) => {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    const hasAddedSaltBefore = measurements.some(m => m.addedSalt);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/measurements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tankId: Number(tankId),
                    salinityTop: formData.salinityTop,
                    salinityBottom: formData.salinityBottom,
                    waterTemp: formData.waterTemp,
                    addedSalt: formData.addedSalt,
                    addedSaltAmount: formData.addedSalt ? formData.addedSaltAmount : undefined,
                })
            });

            if (!res.ok) throw new Error('Failed to save measurement');

            const newMeasurement = await res.json();
            setMeasurements(prev => [...prev, newMeasurement]);

            setFormData(prev => ({
                ...prev,
                addedSalt: false,
            }));
        } catch (error) {
            console.error('Error saving measurement:', error);
            alert('기록 저장 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!tankId) return <div className="h-screen flex items-center justify-center text-2xl text-slate-500">잘못된 접근입니다.</div>;
    if (loading) return <div className="h-screen flex items-center justify-center text-2xl text-slate-500">로딩중...</div>;
    if (!batchInfo) return <div className="h-screen flex items-center justify-center text-2xl text-slate-500">활성 배치가 없습니다.</div>;

    return (
        <div className="h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex justify-between items-center flex-shrink-0 shadow-lg">
                <button
                    onClick={() => router.back()}
                    className="w-14 h-14 flex items-center justify-center hover:bg-white/20 rounded-2xl transition-all"
                >
                    <ArrowLeft className="w-8 h-8" />
                </button>
                <div className="text-center">
                    <div className="text-blue-100 text-base">절임조 {tankId}번</div>
                    <div className="text-2xl font-bold">
                        {CULTIVAR_NAMES[batchInfo.cultivar] || batchInfo.cultivar}
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-5 py-3 rounded-2xl">
                    <Clock className="w-6 h-6 text-blue-100" />
                    <span className="text-xl font-bold text-yellow-300">
                        {getElapsedTime(batchInfo.startTime)}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-5 overflow-hidden">
                <div className="h-full grid grid-cols-2 gap-5">
                    {/* Left - Input Form */}
                    <div className="flex flex-col gap-4">
                        {/* 염도 */}
                        <section className="bg-white rounded-3xl shadow-lg p-6 flex-1">
                            <h2 className="text-2xl font-bold text-slate-700 mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Droplets className="w-6 h-6 text-blue-500" />
                                </div>
                                염도 (%)
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-lg font-bold text-slate-500 mb-3">상단</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, salinityTop: Math.max(0, +(prev.salinityTop - 0.5).toFixed(1)) }))}
                                            className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.salinityTop}
                                            onChange={(e) => setFormData(prev => ({ ...prev, salinityTop: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-16 text-center text-4xl font-black text-blue-600 border-2 border-blue-200 rounded-2xl bg-blue-50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, salinityTop: +(prev.salinityTop + 0.5).toFixed(1) }))}
                                            className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                        >+</button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-lg font-bold text-slate-500 mb-3">하단</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, salinityBottom: Math.max(0, +(prev.salinityBottom - 0.5).toFixed(1)) }))}
                                            className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.salinityBottom}
                                            onChange={(e) => setFormData(prev => ({ ...prev, salinityBottom: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-16 text-center text-4xl font-black text-blue-600 border-2 border-blue-200 rounded-2xl bg-blue-50 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, salinityBottom: +(prev.salinityBottom + 0.5).toFixed(1) }))}
                                            className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 수온 */}
                        <section className="bg-white rounded-3xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <Thermometer className="w-6 h-6 text-orange-500" />
                                </div>
                                수온 (°C)
                            </h2>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, waterTemp: prev.waterTemp - 1 }))}
                                    className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                >-</button>
                                <input
                                    type="number"
                                    value={formData.waterTemp}
                                    onChange={(e) => setFormData(prev => ({ ...prev, waterTemp: Number(e.target.value) }))}
                                    className="flex-1 min-w-0 h-16 text-center text-4xl font-black text-orange-600 border-2 border-orange-200 rounded-2xl bg-orange-50 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all"
                                />
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, waterTemp: prev.waterTemp + 1 }))}
                                    className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                >+</button>
                            </div>
                        </section>
                    </div>

                    {/* Right - Salt, History, Actions */}
                    <div className="flex flex-col gap-4">
                        {/* 웃소금 */}
                        <section className="bg-white rounded-3xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                웃소금 추가
                                {hasAddedSaltBefore && (
                                    <span className="text-green-600 text-base bg-green-100 px-3 py-1 rounded-full font-bold">
                                        이미 추가됨
                                    </span>
                                )}
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, addedSalt: false }))}
                                    className={clsx(
                                        "py-6 rounded-2xl font-bold text-2xl transition-all",
                                        !formData.addedSalt
                                            ? "bg-slate-700 text-white shadow-lg"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}
                                >
                                    안함
                                </button>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, addedSalt: true }))}
                                    disabled={hasAddedSaltBefore}
                                    className={clsx(
                                        "py-6 rounded-2xl font-bold text-2xl transition-all",
                                        formData.addedSalt
                                            ? "bg-amber-500 text-white shadow-lg"
                                            : "bg-slate-100 text-slate-600 hover:bg-amber-100",
                                        hasAddedSaltBefore && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    추가함
                                </button>
                            </div>

                            {formData.addedSalt && (
                                <div className="bg-amber-50 rounded-2xl p-4">
                                    <label className="block text-lg font-bold text-amber-700 mb-2">추가량 (kg)</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, addedSaltAmount: Math.max(1, prev.addedSaltAmount - 1) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-xl bg-white text-2xl font-bold text-slate-600 shadow"
                                        >-</button>
                                        <input
                                            type="number"
                                            value={formData.addedSaltAmount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, addedSaltAmount: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-14 text-center text-3xl font-bold text-amber-600 border-2 border-amber-300 rounded-xl bg-white"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, addedSaltAmount: prev.addedSaltAmount + 1 }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-xl bg-white text-2xl font-bold text-slate-600 shadow"
                                        >+</button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 측정 이력 */}
                        <section className="bg-white rounded-3xl shadow-lg p-5 flex-1 overflow-hidden flex flex-col">
                            <h2 className="text-xl font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Clock className="w-6 h-6 text-slate-400" />
                                측정 이력 ({measurements.length}건)
                            </h2>

                            {measurements.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-lg">
                                    아직 기록이 없습니다
                                </div>
                            ) : (
                                <div className="space-y-2 overflow-y-auto flex-1">
                                    {measurements.map((m, index) => (
                                        <div
                                            key={m.id}
                                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                                <span className="font-bold text-lg text-white">{index + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-lg text-slate-800">{formatTime(m.timestamp)}</div>
                                                <div className="text-sm text-slate-500">
                                                    염도 {m.salinityTop}/{m.salinityBottom}% · {m.waterTemp}°C
                                                    {m.addedSalt && (
                                                        <span className="text-amber-600 font-bold ml-2">
                                                            +소금 {m.addedSaltAmount}kg
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* 버튼들 */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={clsx(
                                "w-full py-6 rounded-2xl font-bold text-2xl shadow-xl transition-all flex items-center justify-center gap-3",
                                submitting
                                    ? "bg-slate-400 text-white cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white active:scale-[0.98]"
                            )}
                        >
                            <Save className="w-7 h-7" />
                            {submitting ? '저장 중...' : '측정 저장'}
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => router.push('/')}
                                className="py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Home className="w-5 h-5" />
                                메인
                            </button>
                            <button
                                onClick={() => router.push(`/finish?tankId=${tankId}`)}
                                className="py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                공정 종료
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function RecordPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-2xl text-slate-500">로딩중...</div>}>
            <RecordContent />
        </Suspense>
    );
}
