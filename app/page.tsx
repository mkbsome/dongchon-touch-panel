"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Sprout, PlayCircle, StopCircle, FileText, History } from 'lucide-react';
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

interface TankStatus {
    active: boolean;
    cultivar?: string;
    startTime?: string;
    batchId?: string;
    avgWeight?: number;
    cabbageSize?: string;
}

export default function Home() {
    const router = useRouter();
    const [now, setNow] = useState<Date | null>(null);
    const [tankStatuses, setTankStatuses] = useState<Record<number, TankStatus>>({});

    // Hydration 에러 방지: 클라이언트에서만 시간 설정
    useEffect(() => {
        setNow(new Date());
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/batches');
                if (res.ok) {
                    const data = await res.json();
                    setTankStatuses(data);
                }
            } catch (error) {
                console.error('Failed to fetch tank status:', error);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getElapsedTime = (startTimeStr?: string) => {
        if (!startTimeStr || !now) return '';
        const startTime = new Date(startTimeStr);
        const diff = now.getTime() - startTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${mins}분`;
    };

    const handleStartBatch = (tankId: number) => {
        router.push(`/new-batch?tankId=${tankId}`);
    };

    const handleFinishBatch = (tankId: number) => {
        router.push(`/finish?tankId=${tankId}`);
    };

    const handleRecord = (tankId: number) => {
        router.push(`/record?tankId=${tankId}`);
    };

    const TOP_TANKS = [1, 2, 3];
    const BOTTOM_TANKS = [4, 5, 6, 7];

    const renderPicklingTank = (tankId: number) => {
        const status = tankStatuses[tankId] || { active: false };
        const isActive = status.active;

        return (
            <div
                key={tankId}
                className={clsx(
                    "rounded-3xl overflow-hidden transition-all flex flex-col h-full",
                    isActive
                        ? "bg-gradient-to-b from-blue-500 to-blue-600 shadow-xl shadow-blue-300/50"
                        : "bg-white border border-slate-200 shadow-lg"
                )}
            >
                {/* Tank Header */}
                <div className={clsx(
                    "px-4 py-3 text-center flex-shrink-0",
                    isActive ? "bg-blue-600/50" : "bg-slate-50"
                )}>
                    <div className={clsx(
                        "text-base font-semibold tracking-wide",
                        isActive ? "text-blue-100" : "text-slate-400"
                    )}>
                        절임조
                    </div>
                    <div className={clsx(
                        "text-6xl font-black",
                        isActive ? "text-white" : "text-slate-700"
                    )}>
                        {tankId}
                    </div>
                </div>

                {/* Tank Content */}
                <div className="p-4 flex-1 flex flex-col">
                    {isActive ? (
                        <>
                            <div className="space-y-3 flex-1">
                                <div className="bg-white/15 backdrop-blur rounded-2xl p-3 flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-blue-100 text-sm">경과 시간</div>
                                        <div className="text-white font-bold text-lg">
                                            {getElapsedTime(status.startTime)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/15 backdrop-blur rounded-2xl p-3 flex items-center gap-3">
                                    <div className="w-12 h-12 bg-green-400/30 rounded-xl flex items-center justify-center">
                                        <Sprout className="w-6 h-6 text-green-200" />
                                    </div>
                                    <div className="text-white font-bold text-lg truncate">
                                        {CULTIVAR_NAMES[status.cultivar || ''] || status.cultivar || '-'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mt-auto pt-3">
                                <button
                                    onClick={() => handleRecord(tankId)}
                                    className="w-full py-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-5 h-5" />
                                    측정
                                </button>
                                <button
                                    onClick={() => handleFinishBatch(tankId)}
                                    className="w-full py-4 bg-emerald-400 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-400/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <StopCircle className="w-5 h-5" />
                                    종료
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-4">
                            <div className="text-slate-300 text-xl mb-6 font-medium">
                                비어있음
                            </div>
                            <button
                                onClick={() => handleStartBatch(tankId)}
                                className="w-full py-5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-bold text-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <PlayCircle className="w-7 h-7" />
                                시작
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 px-8 py-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                            절임 공정 관리
                        </h1>
                        <p className="text-slate-500 text-base font-medium mt-0.5">
                            동촌에프에스 품질 관리 시스템
                        </p>
                    </div>
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => router.push('/history')}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98]"
                        >
                            <History className="w-6 h-6" />
                            기록 조회
                        </button>
                        <div className="bg-white rounded-2xl px-6 py-3 shadow-lg border border-slate-100">
                            <div className="text-3xl font-black text-slate-800">
                                {now ? now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div className="text-sm text-slate-500 text-center">
                                {now ? now.toLocaleDateString('ko-KR', {
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'short'
                                }) : '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-5 overflow-hidden flex flex-col gap-5">
                {/* Top Row: 절임조 1, 2, 3 */}
                <div className="flex-1 grid grid-cols-3 gap-5">
                    {TOP_TANKS.map(renderPicklingTank)}
                </div>

                {/* Bottom Row: 절임조 4, 5, 6, 7 */}
                <div className="flex-1 grid grid-cols-4 gap-5">
                    {BOTTOM_TANKS.map(renderPicklingTank)}
                </div>
            </main>
        </div>
    );
}
