"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Droplets, Thermometer, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

function MeasureContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tankId = searchParams.get('tankId');

    // Mock Data for Demo
    const startTime = new Date(Date.now() - 1000 * 60 * 60 * 4); // 4 hours ago
    const elapsedHours = 4;

    // Measurement State - Using strings to support decimal input
    const [measurements, setMeasurements] = useState({
        topSalinity: '',
        bottomSalinity: '',
        temperature: '15.5', // Default temp as string
    });

    const [activeField, setActiveField] = useState<'top' | 'bottom' | 'temp' | null>(null);

    const handleNumpadInput = (num: number) => {
        if (!activeField) return;

        setMeasurements(prev => {
            const field = activeField === 'temp' ? 'temperature' : activeField === 'top' ? 'topSalinity' : 'bottomSalinity';
            const currentVal = prev[field];

            // If it's the default '15.5' for temp and we start typing, maybe we want to clear it?
            // For now, simple append logic. If user wants to clear, they use backspace.
            // OR: if it's the very first input on a field that hasn't been touched? 
            // Let's keep it simple: append.

            const newVal = currentVal === '' ? String(num) : currentVal + String(num);

            // Simple Validation (prevent > 100)
            if (Number(newVal) > 100) return prev;

            return {
                ...prev,
                [field]: newVal
            };
        });
    };

    const handleBackspace = () => {
        if (!activeField) return;
        setMeasurements(prev => {
            const field = activeField === 'temp' ? 'temperature' : activeField === 'top' ? 'topSalinity' : 'bottomSalinity';
            const currentVal = prev[field];
            if (currentVal.length === 0) return prev;
            return { ...prev, [field]: currentVal.slice(0, -1) };
        });
    };

    const handleDecimal = () => {
        if (!activeField) return;
        setMeasurements(prev => {
            const field = activeField === 'temp' ? 'temperature' : activeField === 'top' ? 'topSalinity' : 'bottomSalinity';
            const currentVal = prev[field];

            if (currentVal.includes('.')) return prev;

            const newVal = currentVal === '' ? '0.' : currentVal + '.';
            return { ...prev, [field]: newVal };
        });
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                tankId,
                topSalinity: measurements.topSalinity ? Number(measurements.topSalinity) : null,
                bottomSalinity: measurements.bottomSalinity ? Number(measurements.bottomSalinity) : null,
                temperature: measurements.temperature ? Number(measurements.temperature) : null,
            };

            const res = await fetch('/api/measurements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save measurement');

            console.log('Measurement saved');
            router.push('/');
        } catch (error) {
            console.error('Error saving measurement:', error);
            alert('기록 저장 중 오류가 발생했습니다.');
        }
    };

    const handleFinishProcess = async () => {
        if (confirm('절임 공정을 종료하시겠습니까?')) {
            try {
                const res = await fetch('/api/batches/finish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tankId })
                });

                if (!res.ok) throw new Error('Failed to finish batch');

                console.log('Batch finished');
                router.push('/');
            } catch (error) {
                console.error('Error finishing batch:', error);
                alert('공정 종료 처리 중 오류가 발생했습니다.');
            }
        }
    };

    if (!tankId) return <div className="p-8 text-center">잘못된 접근입니다.</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-slate-800">
                    절임조 {tankId}번 - 공정 관리
                </h1>
                <div className="w-10" />
            </header>

            {/* Status Bar */}
            <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <span className="text-slate-400">작업 시작:</span>
                    <span className="font-bold">{startTime.toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-slate-400">경과 시간:</span>
                    <span className="font-bold text-yellow-400 text-xl">{elapsedHours}시간 째 절임 중</span>
                </div>
            </div>

            <main className="flex-1 p-6 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Col: Visual Input */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm relative h-[500px] flex flex-col">
                        <div className="absolute inset-0 bg-blue-50/50" />

                        {/* Top Sensor Zone */}
                        <button
                            onClick={() => setActiveField('top')}
                            className={clsx(
                                "flex-1 m-4 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all relative z-10",
                                activeField === 'top'
                                    ? "border-blue-500 bg-blue-100/50 ring-4 ring-blue-200"
                                    : "border-slate-300 hover:border-blue-400 hover:bg-blue-50"
                            )}
                        >
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 text-slate-500 mb-1">
                                    <Droplets className="w-5 h-5" />
                                    <span className="font-bold">상단 염도</span>
                                </div>
                                <div className={clsx("text-5xl font-black", measurements.topSalinity ? "text-blue-700" : "text-slate-300")}>
                                    {measurements.topSalinity || '--'}<span className="text-2xl font-medium ml-1">%</span>
                                </div>
                            </div>
                        </button>

                        {/* Bottom Sensor Zone */}
                        <button
                            onClick={() => setActiveField('bottom')}
                            className={clsx(
                                "flex-1 m-4 mt-0 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all relative z-10",
                                activeField === 'bottom'
                                    ? "border-indigo-500 bg-indigo-100/50 ring-4 ring-indigo-200"
                                    : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50"
                            )}
                        >
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 text-slate-500 mb-1">
                                    <Droplets className="w-5 h-5" />
                                    <span className="font-bold">하단 염도</span>
                                </div>
                                <div className={clsx("text-5xl font-black", measurements.bottomSalinity ? "text-indigo-700" : "text-slate-300")}>
                                    {measurements.bottomSalinity || '--'}<span className="text-2xl font-medium ml-1">%</span>
                                </div>
                            </div>
                        </button>

                        {/* Water Level / Decor */}
                        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-blue-200/30 to-transparent pointer-events-none" />
                    </div>

                    {/* Temp Input */}
                    <button
                        onClick={() => setActiveField('temp')}
                        className={clsx(
                            "w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all",
                            activeField === 'temp'
                                ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
                                : "border-slate-200 bg-white"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                <Thermometer className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-lg text-slate-700">수온 (물 온도)</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">
                            {measurements.temperature}<span className="text-lg font-medium text-slate-500 ml-1">°C</span>
                        </div>
                    </button>
                </div>

                {/* Right Col: Numpad & Actions */}
                <div className="flex flex-col h-full gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                        <div className="mb-4 text-center">
                            <span className="text-slate-500 font-medium">
                                {activeField === 'top' ? '상단 염도를 입력하세요' :
                                    activeField === 'bottom' ? '하단 염도를 입력하세요' :
                                        activeField === 'temp' ? '수온을 입력하세요' : '값을 입력할 항목을 선택하세요'}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 flex-1 mb-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => typeof key === 'number' ? handleNumpadInput(key) : handleDecimal()}
                                    disabled={!activeField}
                                    className="rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-2xl font-bold text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {key}
                                </button>
                            ))}
                            <button
                                onClick={handleBackspace}
                                disabled={!activeField}
                                className="rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                            >
                                ←
                            </button>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!measurements.topSalinity && !measurements.bottomSalinity}
                            className="w-full py-5 bg-blue-600 disabled:bg-slate-300 text-white rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Save className="w-6 h-6" />
                            중간 기록 저장
                        </button>
                    </div>

                    {/* Finish Process Button */}
                    <button
                        onClick={handleFinishProcess}
                        className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-6 h-6" />
                        공정 종료 (작업 완료)
                    </button>
                </div>

            </main>
        </div>
    );
}

export default function MeasurePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">로딩중...</div>}>
            <MeasureContent />
        </Suspense>
    );
}
