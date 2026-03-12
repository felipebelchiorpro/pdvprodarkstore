'use client';

import {
    TrendingUp,
    CreditCard,
    Package,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    ShoppingCart
} from 'lucide-react';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';

// Add this mock data inside the main Dashboard component or above it
const chartData = [
    { day: '01', Vendas: 120 },
    { day: '03', Vendas: 210 },
    { day: '06', Vendas: 180 },
    { day: '09', Vendas: 300 },
    { day: '12', Vendas: 250 },
    { day: '15', Vendas: 420 },
    { day: '18', Vendas: 380 },
    { day: '21', Vendas: 550 },
    { day: '24', Vendas: 480 },
    { day: '27', Vendas: 600 },
];

export default function Dashboard() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [stats, setStats] = useState({
        totalSales: 0,
        totalItems: 0,
        profitShare: 0,
        salesToday: 0,
        recentSales: [] as any[],
        chartData: [] as any[]
    });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const check = () => {
            const user = pb.authStore.model;
            if (user && user.role === 'attendant') {
                router.push('/pdv');
                setIsAuthorized(false);
            } else {
                setIsAuthorized(true);
            }
        };
        check();
    }, [router]);

    useEffect(() => {
        if (!isAuthorized) return;

        const fetchData = async () => {
            setLoadingStats(true);
            try {
                // 1. Fetch Today's Sales
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayFilter = `created >= "${today.toISOString().replace('T', ' ')}"`;
                
                const salesToday = await pb.collection('sales').getFullList({
                    filter: todayFilter,
                    sort: '-created'
                });
                
                const totalSalesVal = salesToday.reduce((sum, s) => sum + (s.total || 0), 0);

                // 2. Fetch Total Inventory
                const products = await pb.collection('products').getFullList();
                const totalItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);

                // 3. Profit Share (Example: 50% of total sales)
                const profitShare = totalSalesVal * 0.5;

                // 4. Chart Data (Last 7 days)
                const chartMap = new Map();
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    chartMap.set(label, 0);
                }

                const allSales = await pb.collection('sales').getFullList({
                    sort: '-created',
                    limit: 100
                });

                allSales.forEach(s => {
                    const date = new Date(s.created);
                    const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    if (chartMap.has(label)) {
                        chartMap.set(label, chartMap.get(label) + (s.total || 0));
                    }
                });

                const chartData = Array.from(chartMap.entries()).map(([day, Vendas]) => ({ day, Vendas }));

                setStats({
                    totalSales: totalSalesVal,
                    totalItems,
                    profitShare,
                    salesToday: salesToday.length,
                    recentSales: allSales.slice(0, 4),
                    chartData
                });
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchData();
    }, [isAuthorized]);

    if (isAuthorized === false) return null;
    if (isAuthorized === null || loadingStats) return (
        <div className="flex-1 bg-black flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#E85002]/20 border-t-[#E85002] rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto p-8 font-sans">

            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Visão Geral</h1>
                    <p className="text-[#A7A7A7] text-sm font-medium">Resumo financeiro e de estoque da Dark Store.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push('/pdv')}
                        className="bg-[#E85002] text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#ff5a0b] transition-all shadow-lg shadow-[#E85002]/20"
                    >
                        Nova Venda (PDV)
                    </button>
                </div>
            </header>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                <div className="brand-gradient rounded-[32px] p-8 relative overflow-hidden shadow-[0_20px_50px_rgba(232,80,2,0.2)] hover:shadow-[0_20px_60px_rgba(232,80,2,0.3)] transition-all duration-500 hover:-translate-y-1 group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                                <CreditCard size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-black uppercase tracking-widest text-[10px] opacity-70">Vendas Hoje</h3>
                                <p className="text-white text-lg font-black">{stats.salesToday} Vendas</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-4xl font-black text-white mb-2 tabular-nums">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSales)}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Saldo em Caixa Atual</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0A0A0A] border border-[#151515] rounded-[32px] p-8 hover:border-[#E85002]/30 transition-all duration-500 hover:-translate-y-1 group">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-[#111] rounded-2xl flex items-center justify-center border border-[#222] group-hover:border-[#E85002]/50 transition-colors">
                            <Package size={24} className="text-[#444] group-hover:text-[#E85002]" />
                        </div>
                        <div>
                            <h3 className="text-[#333] group-hover:text-[#666] font-black uppercase tracking-widest text-[10px] transition-colors">Estoque Total</h3>
                            <p className="text-white text-lg font-black">{stats.totalItems} Unidades</p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-white mb-2 tabular-nums">{stats.totalItems} <span className="text-xs font-black text-[#333] uppercase">Prod.</span></h2>
                        <span className="text-[#444] text-[10px] font-black uppercase tracking-widest">Itens na prateleira</span>
                    </div>
                </div>

                <div className="bg-[#0A0A0A] border border-[#151515] rounded-[32px] p-8 hover:border-[#E85002]/30 transition-all duration-500 hover:-translate-y-1 group">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-[#111] rounded-2xl flex items-center justify-center border border-[#222] group-hover:border-[#E85002]/50 transition-colors">
                            <TrendingUp size={24} className="text-[#444] group-hover:text-[#E85002]" />
                        </div>
                        <div>
                            <h3 className="text-[#333] group-hover:text-[#666] font-black uppercase tracking-widest text-[10px] transition-colors">Divisão Academia</h3>
                            <p className="text-white text-lg font-black">50.0% Repasse</p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-[#E85002] mb-2 tabular-nums">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.profitShare)}
                        </h2>
                        <span className="text-[#444] text-[10px] font-black uppercase tracking-widest">Lucro líquido estimado</span>
                    </div>
                </div>
            </div>

            {/* Split view */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 bg-[#0A0A0A] border border-[#151515] rounded-[32px] p-8 hover:border-[#E85002]/20 transition-colors duration-500">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-white uppercase tracking-tight">Performance Mensal</h3>
                        <div className="bg-[#111] px-4 py-2 rounded-xl border border-[#222]">
                            <span className="text-[#E85002] text-xs font-black uppercase tracking-widest">Últimos 7 Dias</span>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#E85002" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#E85002" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" stroke="#222" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #111', borderRadius: '16px' }}
                                    itemStyle={{ color: '#E85002', fontWeight: '900' }}
                                />
                                <Area type="monotone" dataKey="Vendas" stroke="#E85002" strokeWidth={4} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#0A0A0A] border border-[#151515] rounded-[32px] p-8">
                    <h3 className="font-black text-white uppercase tracking-tight mb-8">Últimas Vendas</h3>

                    <div className="space-y-4">
                        {stats.recentSales.map((sale, i) => (
                            <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-[#111]/50 border border-transparent hover:border-[#222] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center border border-[#222]">
                                        <ShoppingCart size={16} className="text-[#444]" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white uppercase tracking-tight">Pedido #{sale.id.slice(-4)}</p>
                                        <p className="text-[10px] text-[#444] font-bold">{new Date(sale.created).toLocaleTimeString('pt-BR')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-white tabular-nums">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-6 py-4 text-[10px] font-black text-[#333] hover:text-[#E85002] transition-all border-t border-[#111] uppercase tracking-[0.2em]">
                        Ver Histórico Completo
                    </button>
                </div>
            </div>
        </div>
    );
}
