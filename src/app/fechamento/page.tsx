'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Zap, 
    Calendar, 
    CheckCircle2, 
    Clock, 
    DollarSign, 
    CreditCard, 
    Banknote,
    TrendingUp,
    ChevronRight,
    ArrowUpRight,
    Search,
    Filter,
    X,
    ShoppingCart
} from 'lucide-react';
import { pb } from '@/lib/pb';

interface Sale {
    id: string;
    total_amount: number;
    payment_method: string;
    created: string;
}

interface CashRegister {
    id: string;
    opening_time: string;
    closing_time?: string;
    initial_float: number;
    final_cash_count?: number;
    status: 'Open' | 'Closed';
}

export default function FechamentoPage() {
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState<Sale[]>([]);
    const [registers, setRegisters] = useState<CashRegister[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Date Filtering States
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (!pb.authStore.isValid) {
                await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
            }

            // Construct filter based on dates
            const filter = `created >= "${startDate} 00:00:00" && created <= "${endDate} 23:59:59"`;

            const [salesRecords, registersRecords] = await Promise.all([
                pb.collection('sales').getFullList<Sale>({ 
                    sort: '-created',
                    filter: filter
                }),
                pb.collection('cash_register').getFullList<CashRegister>({ 
                    sort: '-created'
                })
            ]);

            setSales(salesRecords);
            setRegisters(registersRecords);
        } catch (err) {
            console.error("Error loading fechamento data:", err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const todayTotal = sales.reduce((acc, sale) => acc + sale.total_amount, 0);
    const currentOpenRegister = registers.find(r => r.status === 'Open');

    // Totals per payment method
    const totalsByMethod = sales.reduce((acc, sale) => {
        const method = sale.payment_method;
        acc[method] = (acc[method] || 0) + sale.total_amount;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#050505] text-white font-sans selection:bg-[#E85002]/30">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#E85002]/10 rounded-xl flex items-center justify-center border border-[#E85002]/20">
                            <Zap size={20} className="text-[#E85002]" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Fechamento <span className="text-[#E85002]">Operacional</span></h1>
                    </div>
                    <p className="text-[#444] text-[10px] font-black uppercase tracking-[0.3em]">Auditoria de Vendas e Fluxo de Caixa</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-[#0A0A0A] p-2 rounded-[24px] border border-[#151515]">
                    {/* Date Pickers */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-black border border-[#151515] rounded-xl focus-within:border-[#E85002]/50 hover:border-[#151515]/80 transition-all cursor-pointer">
                        <Calendar size={14} className="text-[#E85002]" />
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            className="bg-transparent border-none text-[11px] font-bold text-white focus:outline-none uppercase color-scheme-dark cursor-pointer min-w-[110px] [appearance:none]"
                        />
                        <span className="text-[#222] font-black">/</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            className="bg-transparent border-none text-[11px] font-bold text-white focus:outline-none uppercase color-scheme-dark cursor-pointer min-w-[110px] [appearance:none]"
                        />
                    </div>
                    <button 
                        onClick={() => loadData()}
                        className="px-6 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#f0f0f0] transition-all flex items-center gap-2"
                    >
                        <Filter size={14} /> Filtrar
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-12 h-12 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-[#222] uppercase tracking-[.4em]">Sincronizando...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500">
                    
                    {/* Left Column: Stats and Summary */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Daily Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#0A0A0A] border border-[#151515] p-8 rounded-[40px] group hover:border-[#E85002]/30 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-2xl" />
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="w-12 h-12 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
                                        <DollarSign size={20} />
                                    </div>
                                    <div className="bg-green-500/10 text-green-500 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">PERÍODO</div>
                                </div>
                                <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em] mb-1 relative z-10">Total Vendido</p>
                                <h2 className="text-4xl font-black text-white group-hover:text-green-500 transition-colors italic leading-none relative z-10">R$ {todayTotal.toFixed(2).replace('.', ',')}</h2>
                            </div>

                            <div className="bg-[#0A0A0A] border border-[#151515] p-8 rounded-[40px] group hover:border-[#E85002]/30 transition-all text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#E85002]/5 blur-2xl" />
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="w-12 h-12 bg-[#111] border border-[#222] rounded-2xl flex items-center justify-center text-[#444]">
                                        <Clock size={20} />
                                    </div>
                                    <div className={`${currentOpenRegister ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${currentOpenRegister ? 'animate-pulse' : ''}`}>
                                        {currentOpenRegister ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em] mb-1 relative z-10">Status do Caixa</p>
                                <h2 className="text-base font-black text-white italic leading-tight relative z-10">
                                    {currentOpenRegister ? `Iniciado às ${new Date(currentOpenRegister.opening_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Nenhum turno ativo'}
                                </h2>
                            </div>

                            <div className="bg-[#0A0A0A] border border-[#151515] p-8 rounded-[40px] group hover:border-[#E85002]/30 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl" />
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="w-12 h-12 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                                        <CheckCircle2 size={20} />
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em] mb-1 relative z-10">Volume</p>
                                <h2 className="text-4xl font-black text-white italic leading-none relative z-10">{sales.length} <span className="text-sm font-bold text-[#333] not-italic uppercase tracking-widest pl-2">Vendas</span></h2>
                            </div>
                        </div>

                        {/* Totals by Payment Method */}
                        <div className="bg-[#0A0A0A] border border-[#151515] rounded-[48px] p-10 overflow-hidden relative shadow-2xl">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-[#E85002]/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                             
                             <h3 className="text-lg font-bold mb-10 flex items-center gap-3 relative z-10">
                                <TrendingUp size={20} className="text-[#E85002]" />
                                Fechamento por Modalidade
                             </h3>

                             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                <MethodBox icon={<DollarSign size={20} />} label="Dinheiro" value={totalsByMethod['Dinheiro'] || 0} color="green" />
                                <MethodBox icon={<CreditCard size={20} />} label="Cartão" value={totalsByMethod['Cartão'] || 0} color="white" />
                                <MethodBox icon={<Banknote size={20} />} label="PIX" value={totalsByMethod['Pix'] || 0} color="blue" />
                             </div>
                        </div>

                        {/* Daily Sales Table */}
                        <div className="bg-[#0A0A0A] border border-[#151515] rounded-[48px] p-10">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-lg font-bold flex items-center gap-3">
                                    <Clock size={20} className="text-[#E85002]" />
                                    Detalhamento de Vendas
                                </h3>
                                <div className="flex items-center gap-3 bg-black border border-[#151515] px-5 py-2.5 rounded-2xl text-[#333] focus-within:border-[#E85002]/50 transition-all">
                                    <Search size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Filtrar..." 
                                        className="bg-transparent border-none text-xs focus:outline-none text-white w-40 font-bold"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {sales.length === 0 ? (
                                    <div className="text-center py-24">
                                        <X size={48} className="mx-auto text-[#111] mb-6" />
                                        <p className="text-[10px] font-black text-[#222] uppercase tracking-[0.5em]">Nenhuma atividade no período</p>
                                    </div>
                                ) : (
                                    sales.filter(s => s.payment_method.toLowerCase().includes(searchTerm.toLowerCase())).map(sale => (
                                        <div key={sale.id} className="flex items-center justify-between p-7 bg-[#0D0D0D] border border-[#151515] rounded-[32px] group hover:border-[#E85002]/30 transition-all cursor-pointer">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-[#151515] group-hover:border-[#E85002]/20 transition-all shadow-inner">
                                                    <ShoppingCart size={18} className="text-[#333]" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-[#E85002] uppercase tracking-[0.2em] mb-1">{sale.payment_method}</p>
                                                    <p className="text-xs font-bold text-white/40 uppercase tracking-tighter">{sale.id.slice(0, 10)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-10">
                                                <div>
                                                    <p className="text-[10px] font-black text-[#333] uppercase mb-1 tracking-widest">Valor</p>
                                                    <p className="text-2xl font-black text-white italic leading-none">R$ {sale.total_amount.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                                <div className="text-center min-w-[100px] border-l border-[#151515] pl-10">
                                                    <p className="text-[10px] font-black text-[#333] uppercase mb-1 tracking-widest">Horário</p>
                                                    <p className="text-xs font-black text-[#646464]">{new Date(sale.created).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
                                                </div>
                                                <ChevronRight size={18} className="text-[#1A1A1A] group-hover:text-[#E85002] transition-colors" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Cash Register History */}
                    <div className="space-y-8">
                        <div className="bg-[#0A0A0A] border border-[#151515] rounded-[48px] p-10 h-full shadow-xl">
                            <h3 className="text-lg font-bold mb-10 flex items-center gap-3">
                                <History size={20} className="text-[#E85002]" />
                                Auditoria de Turnos
                            </h3>
                            
                            <div className="space-y-6">
                                {registers.slice(0, 10).map(reg => (
                                    <div key={reg.id} className="relative pl-10 border-l-2 border-[#151515] pb-8 last:pb-0">
                                        <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-[#050505] shadow-[0_0_15px_rgba(0,0,0,0.5)] ${reg.status === 'Open' ? 'bg-green-500 shadow-green-500/20' : 'bg-[#222]'}`} />
                                        
                                        <div className="bg-[#0D0D0D] border border-[#151515] rounded-[32px] p-8 group hover:border-[#E85002]/20 transition-all">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-[#646464] uppercase tracking-widest mb-1">Abertura</p>
                                                    <p className="text-[11px] font-black text-white">{new Date(reg.opening_time).toLocaleString('pt-BR')}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[8px] font-black ${reg.status === 'Open' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-[#151515] text-[#333]'} uppercase tracking-widest`}>
                                                    {reg.status === 'Open' ? 'Ativo' : 'Encerrado'}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-[#151515]">
                                                    <p className="text-[9px] font-bold text-[#333] uppercase">Fundo inicial</p>
                                                    <p className="text-sm font-black text-white/50 italic font-mono">R$ {reg.initial_float.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                                {reg.final_cash_count !== undefined && (
                                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                                                        <p className="text-[9px] font-bold text-[#444] uppercase">Contagem Final</p>
                                                        <p className="text-sm font-black text-white italic font-mono">R$ {reg.final_cash_count.toFixed(2).replace('.', ',')}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {reg.closing_time && (
                                                <div className="mt-6 pt-6 border-t border-[#151515]">
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-[9px] font-bold text-[#333] uppercase">Encerrado em</p>
                                                        <p className="text-[10px] font-black text-[#444]">{new Date(reg.closing_time).toLocaleString('pt-BR')}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

function MethodBox({ icon, label, value, color }: any) {
    const colors = {
        green: 'text-green-500 bg-green-500/5 border-green-500/10',
        white: 'text-white bg-white/5 border-white/10',
        blue: 'text-blue-500 bg-blue-500/5 border-blue-500/10',
    } as any;

    return (
        <div className={`p-8 rounded-[32px] border ${colors[color]} group hover:bg-[#E85002]/5 hover:border-[#E85002]/20 transition-all shadow-inner`}>
            <div className="w-12 h-12 bg-black/20 rounded-2xl flex items-center justify-center mb-8 border border-white/5 shadow-xl">
                {icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-2">{label}</p>
            <h4 className="text-3xl font-black italic tracking-tighter group-hover:text-white transition-colors leading-none">R$ {value.toFixed(2).replace('.', ',')}</h4>
        </div>
    );
}

function History({ size, className }: any) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}
