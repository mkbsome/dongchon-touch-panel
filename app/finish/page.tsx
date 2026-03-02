"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Clock, Sprout, Droplets, Star, Home, Waves, Thermometer } from 'lucide-react';
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
    batchId: string;
    avgWeight?: number;
    cabbageSize?: string;
    initialSalinity?: number;
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

const QUALITY_LEVELS = [
    { level: 1, label: '1', desc: '부러짐' },
    { level: 2, label: '2', desc: '약간 휘다 부러짐' },
    { level: 3, label: '3', desc: '보통' },
    { level: 4, label: '4', desc: '잘 휘어짐' },
    { level: 5, label: '5', desc: '완벽' },
];

function FinishContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tankId = searchParams.get('tankId');

    const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
    const [measurements, setMeasurements] = useState<MeasurementRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [now, setNow] = useState(new Date());

    const [formData, setFormData] = useState({
        finalSalinity: 2.5,
        qualityBending: 3,
        // 세척 데이터 - 1차, 3차 세척 (단일 염도 + 수온)
        wash1Salinity: 5.0,
        wash1WaterTemp: 15.0,
        wash3Salinity: 2.5,
        wash3WaterTemp: 15.0,
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
        if (!startTimeStr) return { text: '-', hours: 0 };
        const startTime = new Date(startTimeStr);
        const diff = now.getTime() - startTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { text: `${hours}시간 ${mins}분`, hours };
    };

    const formatTime = (timeStr: string) => {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    const getSummary = () => {
        if (!batchInfo || measurements.length === 0) {
            return {
                measurementCount: 0,
                avgSalinityTop: 0,
                avgSalinityBottom: 0,
                salinityChange: 0,
                addedSaltTotal: 0,
            };
        }

        const salinityTopValues = measurements.filter(m => m.salinityTop).map(m => m.salinityTop!);
        const salinityBottomValues = measurements.filter(m => m.salinityBottom).map(m => m.salinityBottom!);
        const addedSaltTotal = measurements.filter(m => m.addedSalt).reduce((sum, m) => sum + (m.addedSaltAmount || 0), 0);

        const avgSalinityTop = salinityTopValues.length > 0
            ? salinityTopValues.reduce((a, b) => a + b, 0) / salinityTopValues.length
            : 0;
        const avgSalinityBottom = salinityBottomValues.length > 0
            ? salinityBottomValues.reduce((a, b) => a + b, 0) / salinityBottomValues.length
            : 0;

        const firstSalinity = salinityTopValues[0] || 0;
        const lastSalinity = salinityTopValues[salinityTopValues.length - 1] || 0;
        const salinityChange = firstSalinity - lastSalinity;

        return {
            measurementCount: measurements.length,
            avgSalinityTop: avgSalinityTop.toFixed(1),
            avgSalinityBottom: avgSalinityBottom.toFixed(1),
            salinityChange: salinityChange.toFixed(1),
            addedSaltTotal,
        };
    };

    const handleSubmit = async () => {
        if (!batchInfo) return;

        const confirmed = confirm('공정을 종료하시겠습니까?\n종료 후에는 수정할 수 없습니다.');
        if (!confirmed) return;

        setSubmitting(true);

        try {
            const res = await fetch('/api/batches/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tankId: Number(tankId),
                    batchId: batchInfo.batchId,
                    finalCabbageSalinity: formData.finalSalinity,
                    bendTest: formData.qualityBending,
                    // 세척 데이터
                    wash1Salinity: formData.wash1Salinity,
                    wash1WaterTemp: formData.wash1WaterTemp,
                    wash3Salinity: formData.wash3Salinity,
                    wash3WaterTemp: formData.wash3WaterTemp,
                })
            });

            if (!res.ok) throw new Error('Failed to finish batch');

            router.push('/');
        } catch (error) {
            console.error('Error finishing batch:', error);
            alert('공정 종료 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!tankId) return <div className="h-screen flex items-center justify-center text-2xl text-slate-500">잘못된 접근입니다.</div>;
    if (loading) return <div className="h-screen flex items-center justify-center text-2xl text-slate-500">로딩중...</div>;
    if (!batchInfo) return <div className="h-screen flex items-center justify-center text-2xl text-slate-500">활성 배치가 없습니다.</div>;

    const elapsed = getElapsedTime(batchInfo.startTime);
    const summary = getSummary();

    return (
        <div className="h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 flex justify-between items-center flex-shrink-0 shadow-lg">
                <button
                    onClick={() => router.back()}
                    className="w-14 h-14 flex items-center justify-center hover:bg-white/20 rounded-2xl transition-all"
                >
                    <ArrowLeft className="w-8 h-8" />
                </button>
                <div className="text-center">
                    <div className="text-emerald-100 text-base">절임조 {tankId}번</div>
                    <div className="text-2xl font-bold">공정 종료</div>
                </div>
                <button
                    onClick={() => router.push('/')}
                    className="w-14 h-14 flex items-center justify-center hover:bg-white/20 rounded-2xl transition-all"
                >
                    <Home className="w-7 h-7" />
                </button>
            </header>

            {/* Status Bar */}
            <div className="bg-emerald-600/80 backdrop-blur text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Sprout className="w-7 h-7 text-emerald-100" />
                    </div>
                    <div>
                        <div className="text-emerald-100 text-sm">품종</div>
                        <div className="font-bold text-xl">
                            {CULTIVAR_NAMES[batchInfo.cultivar] || batchInfo.cultivar}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white/20 backdrop-blur px-5 py-3 rounded-2xl">
                    <Clock className="w-6 h-6 text-emerald-100" />
                    <span className="text-xl font-bold text-yellow-300">
                        {elapsed.text}
                    </span>
                </div>
            </div>

            {/* Main */}
            <main className="flex-1 p-5 overflow-hidden">
                <div className="h-full grid grid-cols-2 gap-5">
                    {/* Left Column */}
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        {/* 작업 요약 */}
                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-slate-500" />
                                </div>
                                작업 요약
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <div className="text-sm text-slate-400">시작 시간</div>
                                    <div className="font-bold text-xl text-slate-700">
                                        {batchInfo.startTime ? formatTime(batchInfo.startTime) : '-'}
                                    </div>
                                </div>
                                <div className="bg-emerald-50 rounded-2xl p-4">
                                    <div className="text-sm text-emerald-500">총 절임 시간</div>
                                    <div className="font-bold text-xl text-emerald-700">
                                        {elapsed.text}
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <div className="text-sm text-slate-400">측정 횟수</div>
                                    <div className="font-bold text-xl text-slate-700">{summary.measurementCount}회</div>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <div className="text-sm text-slate-400">염도 변화</div>
                                    <div className="font-bold text-xl text-slate-700">
                                        {Number(summary.salinityChange) > 0 ? '-' : '+'}{Math.abs(Number(summary.salinityChange))}%
                                    </div>
                                </div>
                                {summary.addedSaltTotal > 0 && (
                                    <div className="bg-amber-50 rounded-2xl p-4 col-span-2">
                                        <div className="text-sm text-amber-500">웃소금 추가</div>
                                        <div className="font-bold text-xl text-amber-700">
                                            총 {summary.addedSaltTotal}kg
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 세척 데이터 */}
                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                                    <Waves className="w-6 h-6 text-cyan-500" />
                                </div>
                                세척 데이터
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                {/* 1차 세척 */}
                                <div className="bg-cyan-50 rounded-2xl p-4">
                                    <h3 className="font-bold text-cyan-700 mb-3 flex items-center gap-2">
                                        <span className="w-6 h-6 bg-cyan-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                        1차 세척
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                                <Droplets className="w-3 h-3 inline mr-1" />
                                                염도 (%)
                                            </label>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, wash1Salinity: Math.max(0, Number((prev.wash1Salinity - 0.1).toFixed(1))) }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-lg font-bold"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={formData.wash1Salinity}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, wash1Salinity: Number(e.target.value) }))}
                                                    className="flex-1 h-10 text-center text-lg font-bold border border-cyan-200 rounded-xl bg-white"
                                                />
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, wash1Salinity: Number((prev.wash1Salinity + 0.1).toFixed(1)) }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-lg font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                                <Thermometer className="w-3 h-3 inline mr-1" />
                                                수온 (°C)
                                            </label>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, wash1WaterTemp: Number((prev.wash1WaterTemp - 0.1).toFixed(1)) }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-lg font-bold"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={formData.wash1WaterTemp}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, wash1WaterTemp: Number(e.target.value) }))}
                                                    className="flex-1 h-10 text-center text-lg font-bold border border-orange-200 rounded-xl bg-white"
                                                />
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, wash1WaterTemp: Number((prev.wash1WaterTemp + 0.1).toFixed(1)) }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-lg font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3차 세척 */}
                                <div className="bg-teal-50 rounded-2xl p-4">
                                    <h3 className="font-bold text-teal-700 mb-3 flex items-center gap-2">
                                        <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                        3차 세척
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                                <Droplets className="w-3 h-3 inline mr-1" />
                                                염도 (%)
                                            </label>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, wash3Salinity: Math.max(0, Number((prev.wash3Salinity - 0.1).toFixed(1))) }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-lg font-bold"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={formData.wash3Salinity}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, wash3Salinity: Number(e.target.value) }))}
                                                    className="flex-1 h-10 text-center text-lg font-bold border border-teal-200 rounded-xl bg-white"
                                                />
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, wash3Salinity: Number((prev.wash3Salinity + 0.1).toFixed(1)) }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-lg font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                                <Thermometer className="w-3 h-3 inline mr-1" />
                                                수온 (°C)
                                            </label>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, wash3WaterTemp: Number((prev.wash3WaterTemp - 0.1).toFixed(1)) }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-lg font-bold"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={formData.wash3WaterTemp}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, wash3WaterTemp: Number(e.target.value) }))}
                                                    className="flex-1 h-10 text-center text-lg font-bold border border-orange-200 rounded-xl bg-white"
                                                />
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, wash3WaterTemp: Number((prev.wash3WaterTemp + 0.1).toFixed(1)) }))}
                                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-lg font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 품질 평가 */}
                        <section className="bg-white rounded-3xl shadow-lg p-5 flex-1">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                                    <Star className="w-6 h-6 text-yellow-500" />
                                </div>
                                품질 평가 - 휘어짐 테스트
                            </h2>

                            <div className="grid grid-cols-5 gap-3">
                                {QUALITY_LEVELS.map((q) => (
                                    <button
                                        key={q.level}
                                        onClick={() => setFormData(prev => ({ ...prev, qualityBending: q.level }))}
                                        className={clsx(
                                            "py-6 rounded-2xl transition-all flex flex-col items-center justify-center",
                                            formData.qualityBending === q.level
                                                ? q.level <= 2
                                                    ? "bg-red-500 text-white shadow-lg shadow-red-200"
                                                    : q.level === 3
                                                        ? "bg-yellow-500 text-white shadow-lg shadow-yellow-200"
                                                        : "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                                                : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                                        )}
                                    >
                                        <span className="text-4xl font-black">{q.label}</span>
                                        <span className={clsx(
                                            "text-sm mt-1 text-center leading-tight",
                                            formData.qualityBending === q.level ? "text-white/80" : "text-slate-400"
                                        )}>{q.desc}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between text-sm text-slate-400 mt-3 px-2">
                                <span>불량</span>
                                <span>양호</span>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        {/* 최종 염도 */}
                        <section className="bg-white rounded-3xl shadow-lg p-5 flex-1">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Droplets className="w-6 h-6 text-blue-500" />
                                </div>
                                최종 염도 - 배추즙 측정 (%)
                            </h2>

                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, finalSalinity: Math.max(0, +(prev.finalSalinity - 0.1).toFixed(1)) }))}
                                    className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                >-</button>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.finalSalinity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, finalSalinity: Number(e.target.value) }))}
                                    className="flex-1 min-w-0 h-16 text-center text-4xl font-black text-emerald-600 border-2 border-emerald-200 rounded-2xl bg-emerald-50 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
                                />
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, finalSalinity: +(prev.finalSalinity + 0.1).toFixed(1) }))}
                                    className="w-16 h-16 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-bold text-slate-600 transition-all active:scale-95"
                                >+</button>
                            </div>
                            <div className="text-center text-slate-400">
                                적정 범위: 2.0% ~ 3.0%
                            </div>
                        </section>

                        {/* 버튼들 */}
                        <div className="mt-auto space-y-3">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className={clsx(
                                    "w-full py-6 rounded-2xl font-bold text-2xl shadow-xl transition-all flex items-center justify-center gap-3",
                                    submitting
                                        ? "bg-slate-400 text-white cursor-not-allowed"
                                        : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white active:scale-[0.98]"
                                )}
                            >
                                <CheckCircle className="w-8 h-8" />
                                {submitting ? '처리중...' : '공정 완료'}
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-bold text-xl transition-all"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function FinishPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-2xl text-slate-500">로딩중...</div>}>
            <FinishContent />
        </Suspense>
    );
}
