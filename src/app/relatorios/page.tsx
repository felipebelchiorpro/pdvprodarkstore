'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownRight, 
    PieChart, 
    DollarSign, 
    CreditCard, 
    Banknote,
    Filter,
    Calendar,
    Download,
    X,
    ShoppingCart
} from 'lucide-react';
import { pb } from '@/lib/pb';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Sale {
    id: string;
    total_amount: number;
    payment_method: string;
    created: string;
    items?: any[];
}

interface ProfitSplit {
    sale_id: string;
    gross_profit: number;
    gym_share: number;
    store_share: number;
}

export default function RelatoriosPage() {
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [sales, setSales] = useState<Sale[]>([]);
    const [splits, setSplits] = useState<ProfitSplit[]>([]);
    const [timeRange, setTimeRange] = useState('7d');
    
    const getDefaultStartDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    };
    
    const getDefaultEndDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [endDate, setEndDate] = useState(getDefaultEndDate());

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (!pb.authStore.isValid) {
                await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
            }

            const filter = `created >= "${startDate} 00:00:00" && created <= "${endDate} 23:59:59"`;

            const [salesRecords, splitsRecords] = await Promise.all([
                pb.collection('sales').getFullList<Sale>({ 
                    sort: '-created',
                    filter: filter,
                    expand: 'items.product_id'
                }),
                pb.collection('profit_splits').getFullList<ProfitSplit>({})
            ]);

            const saleIds = new Set(salesRecords.map(s => s.id));
            const filteredSplits = splitsRecords.filter(split => saleIds.has(split.sale_id));

            setSales(salesRecords);
            setSplits(filteredSplits);
        } catch (err) {
            console.error("Error loading reports data:", err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePresetChange = (range: string) => {
        setTimeRange(range);
        const end = new Date();
        const start = new Date();
        
        if (range === '24h') {
            start.setDate(end.getDate() - 1);
        } else if (range === '7d') {
            start.setDate(end.getDate() - 7);
        } else if (range === '30d') {
            start.setDate(end.getDate() - 30);
        }
        
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    // Financial calculations
    const totalRevenue = sales.reduce((acc, sale) => acc + sale.total_amount, 0);
    const totalProfit = splits.reduce((acc, split) => acc + split.gross_profit, 0);
    const totalGymShare = splits.reduce((acc, split) => acc + split.gym_share, 0);
    const totalStoreShare = splits.reduce((acc, split) => acc + split.store_share, 0);

    const cartFees = sales.reduce((acc, sale) => {
        const fee = sale.payment_method === 'Cartão' ? 0.035 : 0; 
        return acc + (sale.total_amount * fee);
    }, 0);

    const exportToPDF = async () => {
        setExporting(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // Logo Helper
            const loadImageToDataUrl = (url: string): Promise<{ dataUrl: string, width: number, height: number }> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height });
                        } else {
                            reject(new Error('Canvas context not found'));
                        }
                    };
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = url;
                });
            };

            // Pre-Header: Logo or Text
            let currentY = 20;
            try {
                const logo = await loadImageToDataUrl('/logo.png?v=' + Date.now());
                const pdfHeight = 25; // Aumentado de 15 para 25
                const pdfWidth = pdfHeight * (logo.width / logo.height);
                doc.addImage(logo.dataUrl, 'PNG', 20, currentY - 5, pdfWidth, pdfHeight);
                currentY += 22; // Ajustado o espaço para a logo maior
            } catch (error) {
                console.warn('Logo image not found. Using text fallback.', error);
                doc.setFontSize(22);
                doc.setTextColor(232, 80, 2); // #E85002
                doc.text("DARKSTORE POS", 20, 20);
                currentY += 10;
            }
            
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text("Relatório Financeiro Detalhado", 20, currentY + 10);
            
            doc.setFontSize(10);
            doc.text(`Período: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 20, currentY + 18);
            doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, currentY + 24);
            
            // Summary Info
            doc.setDrawColor(230);
            doc.line(20, currentY + 30, pageWidth - 20, currentY + 30);
            
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("RESUMO EXECUTIVO", 20, currentY + 40);
            
            autoTable(doc, {
                startY: currentY + 45,
                head: [['Descrição', 'Valor']],
                body: [
                    ['Faturamento Bruto', `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`],
                    ['Lucro Líquido Real', `R$ ${totalProfit.toFixed(2).replace('.', ',')}`],
                    ['Repasse Academia (50%)', `R$ ${totalGymShare.toFixed(2).replace('.', ',')}`],
                    ['Repasse DarkStore (Líquido + Custos)', `R$ ${totalStoreShare.toFixed(2).replace('.', ',')}`],
                    ['Taxas de Maquininha (Est.)', `R$ ${cartFees.toFixed(2).replace('.', ',')}`],
                ],
                theme: 'striped',
                headStyles: { fillColor: [30, 30, 30] },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
            });

            // Transactions Table
            doc.text("DETALHAMENTO DE VENDAS", 20, (doc as any).lastAutoTable.finalY + 15);
            
            const tableData = sales.map(sale => {
                const saleSplit = splits.find(s => s.sale_id === sale.id);
                const fee = sale.payment_method === 'Cartão' ? sale.total_amount * 0.035 : 0;
                return [
                    new Date(sale.created).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                    sale.id.slice(0, 8).toUpperCase(),
                    sale.payment_method,
                    `R$ ${sale.total_amount.toFixed(2).replace('.', ',')}`,
                    `R$ ${fee.toFixed(2).replace('.', ',')}`,
                    `R$ ${(saleSplit?.gross_profit || 0).toFixed(2).replace('.', ',')}`
                ];
            });

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 20,
                head: [['Data', 'ID', 'Método', 'Valor', 'Taxa', 'Lucro']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [232, 80, 2] },
                styles: { fontSize: 8 },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
            });

            // Footer / Branding
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("Este relatório é para fins de auditoria interna. DarkStore POS System.", pageWidth / 2, finalY + 10, { align: 'center' });

            // Returning to standard simple save method
            const reportDate = startDate.replace(/-/g, '');
            doc.save(`Relatorio_DarkStore_${reportDate}.pdf`);

        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Erro ao gerar PDF.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#050505] text-white font-sans selection:bg-[#E85002]/30">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase italic leading-none">Relatórios <span className="text-[#E85002]">Financeiros</span></h1>
                    <p className="text-[#444] text-[10px] font-black uppercase tracking-[0.3em]">Auditoria Premium DarkStore POS</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-[#0A0A0A] p-2 rounded-[24px] border border-[#151515] shadow-2xl">
                    {/* Date Pickers */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-black border border-[#151515] rounded-xl focus-within:border-[#E85002]/50 hover:border-[#151515]/80 transition-all cursor-pointer">
                        <Calendar size={14} className="text-[#E85002]" />
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setTimeRange('custom'); }}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            className="bg-transparent border-none text-[11px] font-bold text-white focus:outline-none uppercase color-scheme-dark cursor-pointer min-w-[110px] [appearance:none]"
                        />
                        <span className="text-[#222] font-black">/</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setTimeRange('custom'); }}
                            onClick={(e) => (e.target as any).showPicker?.()}
                            className="bg-transparent border-none text-[11px] font-bold text-white focus:outline-none uppercase color-scheme-dark cursor-pointer min-w-[110px] [appearance:none]"
                        />
                    </div>

                    <div className="h-8 w-px bg-[#151515]" />

                    <div className="flex bg-black border border-[#151515] p-1 rounded-xl">
                        {['24h', '7d', '30d'].map(range => (
                            <button 
                                key={range}
                                onClick={() => handlePresetChange(range)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-[#E85002] text-white shadow-lg shadow-[#E85002]/20' : 'text-[#444] hover:text-white'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={() => exportToPDF()}
                        disabled={exporting}
                        className="flex items-center gap-2 px-6 py-2 bg-[#0A0A0A] border border-[#151515] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#646464] hover:text-white hover:border-[#E85002]/30 transition-all disabled:opacity-50"
                    >
                        <Download size={16} /> {exporting ? 'Gerando...' : 'Exportar'}
                    </button>
                    
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
                    <div className="w-12 h-12 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(232,80,2,0.2)]"></div>
                    <p className="text-[10px] font-black text-[#222] uppercase tracking-[.4em] animate-pulse">Sincronizando Dados...</p>
                </div>
            ) : (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Main Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            label="Faturamento Bruto" 
                            value={`R$ ${totalRevenue.toFixed(2).replace('.', ',')}`}
                            subText="Período selecionado"
                            icon={<DollarSign size={20} className="text-[#E85002]" />}
                            trend="up"
                        />
                        <StatCard 
                            label="Lucro Líquido" 
                            value={`R$ ${totalProfit.toFixed(2).replace('.', ',')}`}
                            subText={`Sobra de ${totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(0) : 0}%`}
                            icon={<TrendingUp size={20} className="text-green-500" />}
                            trend="up"
                        />
                        <StatCard 
                            label="Taxas de Cartão" 
                            value={`R$ ${cartFees.toFixed(2).replace('.', ',')}`}
                            subText="Estimativa operacional"
                            icon={<CreditCard size={20} className="text-red-500" />}
                            trend="down"
                            trendColor="text-red-500"
                        />
                        <StatCard 
                            label="Volume de Vendas" 
                            value={sales.length.toString()}
                            subText={`Ticket Médio: R$ ${sales.length > 0 ? (totalRevenue/sales.length).toFixed(2).replace('.', ',') : '0,00'}`}
                            icon={<PieChart size={20} className="text-blue-500" />}
                        />
                    </div>

                    {/* Middle Block */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Repasses Visualization */}
                        <div className="lg:col-span-2 bg-[#0A0A0A] border border-[#151515] rounded-[48px] p-10 relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#E85002]/5 rounded-full blur-[120px] -mr-48 -mt-48 transition-all duration-1000 group-hover:bg-[#E85002]/10" />
                            
                            <div className="flex justify-between items-center mb-12 relative z-10">
                                <h3 className="text-xl font-bold flex items-center gap-3">
                                    <div className="p-2 bg-[#E85002]/10 rounded-xl border border-[#E85002]/20">
                                        <TrendingUp size={20} className="text-[#E85002]" />
                                    </div>
                                    Distribuição de Lucros
                                </h3>
                                <div className="text-[10px] font-black text-[#222] uppercase tracking-[0.2em] bg-black px-4 py-2 rounded-full border border-[#151515]">Regras: 50/50 Líquido</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
                                <div className="space-y-8">
                                    <div className="group/item p-8 bg-[#0D0D0D] border border-[#151515] rounded-[32px] hover:border-green-500/30 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                             <p className="text-[10px] font-black text-green-500/50 uppercase tracking-[0.3em]">Academia 50%</p>
                                             <ArrowUpRight size={16} className="text-green-500 opacity-0 group-hover/item:opacity-100 transition-all" />
                                        </div>
                                        <h4 className="text-4xl font-black text-green-500 italic mb-4">R$ {totalGymShare.toFixed(2).replace('.', ',')}</h4>
                                        <div className="h-1.5 bg-green-500/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-1/2 shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                                        </div>
                                    </div>

                                    <div className="group/item p-8 bg-[#0D0D0D] border border-[#151515] rounded-[32px] hover:border-white/20 transition-all">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-[10px] font-black text-[#333] uppercase tracking-[0.3em]">DarkStore (Total)</p>
                                             <ArrowUpRight size={16} className="text-white opacity-0 group-hover/item:opacity-100 transition-all" />
                                        </div>
                                        <h4 className="text-4xl font-black text-white italic mb-4">R$ {totalStoreShare.toFixed(2).replace('.', ',')}</h4>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-white w-2/3 shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black/40 rounded-[32px] p-10 border border-[#111] backdrop-blur-sm flex flex-col justify-center gap-8">
                                     <div className="space-y-2">
                                         <p className="text-[10px] font-black text-[#333] uppercase tracking-widest">Base de Cálculo</p>
                                         <div className="flex justify-between items-center group/line">
                                             <span className="text-xs font-bold text-[#646464] group-hover/line:text-white transition-colors">Lucro Líquido Real</span>
                                             <span className="text-xl font-black text-white">R$ {totalProfit.toFixed(2).replace('.', ',')}</span>
                                         </div>
                                     </div>
                                     
                                     <div className="space-y-2">
                                         <p className="text-[10px] font-black text-[#333] uppercase tracking-widest">Deduções Operacionais</p>
                                         <div className="flex justify-between items-center group/line">
                                             <span className="text-xs font-bold text-[#646464] group-hover/line:text-white transition-colors">Taxas Estimadas</span>
                                             <span className="text-lg font-black text-red-500">- R$ {cartFees.toFixed(2).replace('.', ',')}</span>
                                         </div>
                                     </div>

                                     <div className="pt-6 border-t border-white/5">
                                         <div className="flex justify-between items-center mb-4">
                                             <span className="text-xs font-bold text-[#333] uppercase tracking-widest">Sobra para Cash</span>
                                             <span className="text-2xl font-black text-white italic">R$ {(totalProfit + cartFees).toFixed(2).replace('.', ',')}</span>
                                         </div>
                                         <p className="text-[9px] font-bold text-[#222] uppercase tracking-[0.1em] text-center">* Valor bruto após custos de aquisição</p>
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Feed */}
                        <div className="bg-[#0A0A0A] border border-[#151515] rounded-[48px] p-10 shadow-xl overflow-hidden flex flex-col">
                             <div className="flex justify-between items-center mb-10">
                                <h3 className="text-lg font-bold flex items-center gap-3">
                                    <Calendar size={20} className="text-[#E85002]" />
                                    Últimas Atividades
                                </h3>
                                <div className="bg-black px-3 py-1 rounded-full border border-[#151515] text-[9px] font-black text-[#444]">{sales.length} VENDAS</div>
                             </div>

                             <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {sales.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-[#222]">
                                        <X size={40} className="mb-4 opacity-10" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sem dados</p>
                                    </div>
                                ) : (
                                    sales.slice(0, 20).map(sale => (
                                        <div key={sale.id} className="group p-5 bg-[#0D0D0D] border border-[#151515] rounded-[24px] hover:border-[#E85002]/40 transition-all flex justify-between items-center cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-black rounded-xl border border-[#151515] flex items-center justify-center group-hover:border-[#E85002]/20 transition-all">
                                                    {sale.payment_method === 'Dinheiro' ? <Banknote size={16} className="text-[#333]" /> : <CreditCard size={16} className="text-[#333]" />}
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[#E85002] uppercase tracking-widest mb-0.5">{sale.payment_method}</p>
                                                    <p className="text-[10px] font-bold text-[#444] uppercase tracking-tighter">{new Date(sale.created).toLocaleDateString('pt-BR')} • {new Date(sale.created).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-black text-white group-hover:text-[#E85002] transition-colors italic">R$ {sale.total_amount.toFixed(2).replace('.', ',')}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, subText, icon, trend, trendColor }: any) {
    return (
        <div className="bg-[#0A0A0A] border border-[#151515] p-8 rounded-[40px] hover:border-[#E85002]/30 transition-all group shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="w-14 h-14 bg-black border border-[#151515] rounded-2xl flex items-center justify-center group-hover:border-[#E85002]/20 transition-all shadow-inner">
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1.5 text-[9px] font-black ${trendColor || 'text-green-500'} bg-black border border-[#151515] px-3 py-1.5 rounded-full uppercase tracking-widest`}>
                        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trend === 'up' ? 'OK' : 'ALTO'}
                    </div>
                )}
            </div>
            
            <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.3em] mb-2 relative z-10">{label}</p>
            <h4 className="text-3xl font-black text-white mb-3 group-hover:text-[#E85002] transition-colors relative z-10 italic leading-none">{value}</h4>
            <p className="text-[10px] font-bold text-[#222] uppercase tracking-widest relative z-10 italic">{subText}</p>
        </div>
    );
}
