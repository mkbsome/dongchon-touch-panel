"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, Sprout, Scale, Ruler, Thermometer, Droplets, Home } from 'lucide-react';
import { clsx } from 'clsx';

const CULTIVARS = [
    { id: 'bulam3', label: '불암3호', sub: '인기' },
    { id: 'bulamplus', label: '불암플러스', sub: '인기' },
    { id: 'hwiparam', label: '휘파람골드', sub: 'CR계' },
    { id: 'hwimori', label: '휘모리', sub: 'CR계' },
    { id: 'cheongomabi', label: '천고마비', sub: '' },
    { id: 'giwunchan', label: '기운찬', sub: '' },
    { id: 'cheongmyung', label: '청명가을', sub: '절임용' },
    { id: 'hwanggeumstar', label: '황금스타', sub: '노란속' },
    { id: 'other', label: '기타', sub: '' },
];

const CABBAGE_SIZES = [
    { id: 'S', label: 'S', desc: '2kg 미만' },
    { id: 'M', label: 'M', desc: '2~3kg' },
    { id: 'L', label: 'L', desc: '3~4kg' },
    { id: 'XL', label: 'XL', desc: '4kg+' },
];

const SEASONS = ['봄', '여름', '가을', '겨울'];

const DEFAULT_SALINITY: Record<string, number> = {
    '봄': 11.5,
    '여름': 10.5,
    '가을': 11.5,
    '겨울': 13.5,
};

function getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    return '겨울';
}

function NewBatchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tankId = searchParams.get('tankId');

    const currentSeason = getCurrentSeason();

    const [formData, setFormData] = useState({
        cultivar: null as string | null,
        avgWeight: 3.0,
        cabbageSize: 'M' as string,
        firmness: 2.5,
        leafThickness: 3,
        roomTemp: 15,
        outdoorTemp: 5,
        season: currentSeason,
        initialSalinity: DEFAULT_SALINITY[currentSeason],
    });

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            initialSalinity: DEFAULT_SALINITY[prev.season] || 12.0
        }));
    }, [formData.season]);

    const handleSubmit = async () => {
        if (!formData.cultivar) {
            alert('품종을 선택해주세요.');
            return;
        }
        if (formData.firmness <= 0) {
            alert('단단함(경도)을 입력해주세요.');
            return;
        }

        try {
            const res = await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tankId: Number(tankId),
                    cultivar: formData.cultivar,
                    avgWeight: formData.avgWeight,
                    cabbageSize: formData.cabbageSize,
                    firmness: Number(formData.firmness),
                    leafThickness: formData.leafThickness,
                    roomTemp: formData.roomTemp,
                    outdoorTemp: formData.outdoorTemp,
                    season: formData.season,
                    initialSalinity: formData.initialSalinity,
                })
            });

            if (!res.ok) throw new Error('Failed to create batch');

            router.push('/');
        } catch (error) {
            console.error('Error creating batch:', error);
            alert('작업 시작 중 오류가 발생했습니다.');
        }
    };

    if (!tankId) return <div className="h-screen flex items-center justify-center text-2xl text-slate-500">잘못된 접근입니다.</div>;

    return (
        <div className="h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 px-6 py-4 flex justify-between items-center flex-shrink-0">
                <button
                    onClick={() => router.back()}
                    className="w-14 h-14 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
                >
                    <ArrowLeft className="w-8 h-8" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">
                    절임조 {tankId}번 - 새 작업
                </h1>
                <button
                    onClick={() => router.push('/')}
                    className="w-14 h-14 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
                >
                    <Home className="w-7 h-7" />
                </button>
            </header>

            {/* Main */}
            <main className="flex-1 p-5 overflow-hidden">
                <div className="h-full grid grid-cols-2 gap-5">
                    {/* Left Column */}
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <Sprout className="w-6 h-6 text-green-500" />
                                </div>
                                품종 선택
                            </h2>

                            <div className="grid grid-cols-3 gap-3">
                                {CULTIVARS.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setFormData(prev => ({ ...prev, cultivar: item.id }))}
                                        className={clsx(
                                            "py-4 rounded-2xl transition-all flex flex-col items-center justify-center",
                                            formData.cultivar === item.id
                                                ? "bg-green-500 text-white shadow-lg shadow-green-200"
                                                : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                                        )}
                                    >
                                        <span className="text-lg font-bold">{item.label}</span>
                                        {item.sub && (
                                            <span className={clsx(
                                                "text-sm",
                                                formData.cultivar === item.id ? "text-green-100" : "text-slate-400"
                                            )}>{item.sub}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-slate-700 mb-4">배추 크기</h2>
                            <div className="grid grid-cols-4 gap-3">
                                {CABBAGE_SIZES.map((size) => (
                                    <button
                                        key={size.id}
                                        onClick={() => setFormData(prev => ({ ...prev, cabbageSize: size.id }))}
                                        className={clsx(
                                            "py-5 rounded-2xl transition-all flex flex-col items-center justify-center",
                                            formData.cabbageSize === size.id
                                                ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                                                : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                                        )}
                                    >
                                        <span className="text-3xl font-black">{size.label}</span>
                                        <span className={clsx(
                                            "text-sm",
                                            formData.cabbageSize === size.id ? "text-blue-100" : "text-slate-400"
                                        )}>{size.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-lg font-bold text-slate-600 mb-3 flex items-center gap-2">
                                        <Scale className="w-5 h-5 text-slate-400" />
                                        평균 무게 (kg)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, avgWeight: Math.max(0.1, Number((prev.avgWeight - 0.1).toFixed(1))) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.avgWeight}
                                            onChange={(e) => setFormData(prev => ({ ...prev, avgWeight: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-14 text-center text-2xl font-black text-slate-700 border-2 border-slate-200 rounded-2xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, avgWeight: Number((prev.avgWeight + 0.1).toFixed(1)) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >+</button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-lg font-bold text-slate-600 mb-3 flex items-center gap-2">
                                        <Ruler className="w-5 h-5 text-slate-400" />
                                        단단함 (kgf)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, firmness: Math.max(0.1, Number((prev.firmness - 0.1).toFixed(1))) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.firmness}
                                            onChange={(e) => setFormData(prev => ({ ...prev, firmness: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-14 text-center text-2xl font-black text-slate-700 border-2 border-slate-200 rounded-2xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, firmness: Number((prev.firmness + 0.1).toFixed(1)) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >+</button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5">
                                <label className="block text-lg font-bold text-slate-600 mb-3">잎 두께</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setFormData(prev => ({ ...prev, leafThickness: level }))}
                                            className={clsx(
                                                "py-5 rounded-2xl font-bold text-2xl transition-all",
                                                formData.leafThickness === level
                                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                                                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between text-sm text-slate-400 mt-2 px-2">
                                    <span>얇음</span>
                                    <span>두꺼움</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        <section className="bg-white rounded-3xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <Thermometer className="w-6 h-6 text-orange-500" />
                                </div>
                                환경 정보
                            </h2>

                            <div className="grid grid-cols-2 gap-5 mb-5">
                                <div>
                                    <label className="block text-lg font-bold text-slate-600 mb-3">실내온도 (°C)</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, roomTemp: Number((prev.roomTemp - 0.1).toFixed(1)) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.roomTemp}
                                            onChange={(e) => setFormData(prev => ({ ...prev, roomTemp: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-14 text-center text-2xl font-black text-orange-600 border-2 border-orange-200 rounded-2xl bg-orange-50"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, roomTemp: Number((prev.roomTemp + 0.1).toFixed(1)) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >+</button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-lg font-bold text-slate-600 mb-3">외부온도 (°C)</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, outdoorTemp: Number((prev.outdoorTemp - 0.1).toFixed(1)) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >-</button>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.outdoorTemp}
                                            onChange={(e) => setFormData(prev => ({ ...prev, outdoorTemp: Number(e.target.value) }))}
                                            className="flex-1 min-w-0 h-14 text-center text-2xl font-black text-slate-700 border-2 border-slate-200 rounded-2xl"
                                        />
                                        <button
                                            onClick={() => setFormData(prev => ({ ...prev, outdoorTemp: Number((prev.outdoorTemp + 0.1).toFixed(1)) }))}
                                            className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                        >+</button>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="block text-lg font-bold text-slate-600 mb-3">계절</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {SEASONS.map((season) => (
                                        <button
                                            key={season}
                                            onClick={() => setFormData(prev => ({ ...prev, season }))}
                                            className={clsx(
                                                "py-4 rounded-2xl font-bold text-xl transition-all",
                                                formData.season === season
                                                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200"
                                                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            {season}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-lg font-bold text-slate-600 mb-3 flex items-center gap-2">
                                    <Droplets className="w-5 h-5 text-blue-500" />
                                    초기 염도 (%)
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, initialSalinity: Math.max(5, Number((prev.initialSalinity - 0.1).toFixed(1))) }))}
                                        className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                    >-</button>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.initialSalinity}
                                        onChange={(e) => setFormData(prev => ({ ...prev, initialSalinity: Number(e.target.value) }))}
                                        className="flex-1 min-w-0 h-14 text-center text-2xl font-black text-blue-600 border-2 border-blue-200 rounded-2xl bg-blue-50"
                                    />
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, initialSalinity: Number((prev.initialSalinity + 0.1).toFixed(1)) }))}
                                        className="w-14 h-14 flex-shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600"
                                    >+</button>
                                </div>
                                <div className="text-sm text-slate-400 mt-2">
                                    기준: 봄/가을 11-12%, 여름 10-11%, 겨울 13.5-14%
                                </div>
                            </div>
                        </section>

                        <div className="mt-auto space-y-3">
                            <button
                                onClick={handleSubmit}
                                className="w-full py-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-bold text-2xl shadow-xl shadow-blue-300/50 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <PlayCircle className="w-8 h-8" />
                                작업 시작
                            </button>
                            <button
                                onClick={() => router.push('/')}
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

export default function NewBatchPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-2xl text-slate-500">로딩중...</div>}>
            <NewBatchContent />
        </Suspense>
    );
}
