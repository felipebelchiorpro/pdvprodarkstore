'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    Search, 
    ShoppingCart, 
    Trash2, 
    Plus, 
    Minus, 
    CreditCard, 
    Banknote, 
    Barcode, 
    Settings, 
    ChevronRight, 
    Package, 
    AlertTriangle,
    History,
    X,
    Keyboard,
    TrendingUp,
    ShieldAlert
} from 'lucide-react';
import { pb } from '@/lib/pb';

interface Product {
    id: string;
    name: string;
    category: string;
    barcode?: string;
    sell_price: number;
    cost_price: number;
    stock?: number;
    lot_expiry?: string; 
}

interface CartItem extends Product {
    quantity: number;
}

interface Category {
    id: string;
    name: string;
}

export default function PDVPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<'Débito' | 'Crédito' | 'Dinheiro' | 'PIX'>('Débito');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [showExpiryAlert, setShowExpiryAlert] = useState<Product | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [cashRegister, setCashRegister] = useState<{ id: string, status: 'Open' | 'Closed', initial_float: number } | null>(null);
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [regAction, setRegAction] = useState<'open' | 'close'>('open');
    const [regFormData, setRegFormData] = useState({ initial_float: '0', final_cash: '0' });
    const [cashReceived, setCashReceived] = useState<string>('');
    const [showChangePanel, setShowChangePanel] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [taxRates, setTaxRates] = useState({
        debito: 2.0,
        credito: 5.0,
        pix: 0.0,
        dinheiro: 0.0
    });
    const [hasMounted, setHasMounted] = useState(false);
    const [mountTime, setMountTime] = useState(0);

    useEffect(() => {
        setHasMounted(true);
        const start = Date.now();
        const timer = setInterval(() => setMountTime(Date.now() - start), 500);
        return () => clearInterval(timer);
    }, []);

    const barcodeRef = useRef<HTMLInputElement>(null);

    // Fetch data and check register
    useEffect(() => {
        async function loadData() {
            try {
                // Ensure we have an admin session
                if (!pb.authStore.isValid) {
                    await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
                }

                pb.autoCancellation(false);

                // Check for open register
                const openRegs = await pb.collection('cash_register').getList(1, 1, {
                    filter: 'status = "Open"',
                    sort: '-created'
                });
                console.log("PDV Load: Open Regs found:", openRegs.items.length);
                if (openRegs.items.length > 0) {
                    setCashRegister(openRegs.items[0] as any);
                }
                // No automated opening: User chooses when to open or is prompted on action

                const [prodRecords, invRecords, catRecords] = await Promise.all([
                    pb.collection('products').getFullList<Product>(),
                    pb.collection('inventory').getFullList<{ product_id: string, type: string, quantity: number }>(),
                    pb.collection('categories').getFullList<Category>()
                ]);

                // Calculate stock per product
                const productsWithStock = prodRecords.map(p => {
                    const productInv = invRecords.filter(i => i.product_id === p.id);
                    const stock = productInv.reduce((acc, i) => {
                        return i.type === 'Entrada' ? acc + i.quantity : acc - i.quantity;
                    }, 0);
                    return { ...p, stock };
                });

                setProducts(productsWithStock);
                setCategories(catRecords);

                // Load Settings (Tax Rates)
                try {
                    const settingsRecords = await pb.collection('settings').getFullList();
                    if (settingsRecords.length > 0) {
                        const newRates = { ...taxRates };
                        console.log("Loading settings from DB:", settingsRecords.length, "items");
                        settingsRecords.forEach(reg => {
                            if (reg.key === 'tax_debito') newRates.debito = parseFloat(reg.value);
                            if (reg.key === 'tax_credito') newRates.credito = parseFloat(reg.value);
                            if (reg.key === 'tax_pix') newRates.pix = parseFloat(reg.value);
                            if (reg.key === 'tax_dinheiro') newRates.dinheiro = parseFloat(reg.value);
                        });
                        setTaxRates(newRates);
                    }
                } catch (sErr) {
                    console.warn("Settings collection error fetching, using defaults", sErr);
                }
            } catch (err) {
                console.error("Error loading PDV data:", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Focus barcode input on mount and on key shortcuts
    useEffect(() => {
        barcodeRef.current?.focus();

        const handleGlobalKeydown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                barcodeRef.current?.focus();
            }
            if (e.key === 'F3') {
                e.preventDefault();
                alert("Atalho F3: Aplicar Desconto (Em breve)");
            }
            if (e.key === 'F4') {
                e.preventDefault();
                alert("Atalho F4: CPF/Cliente (Em breve)");
            }
            if (e.key === 'F8') {
                e.preventDefault();
                // Cycle payment methods
                setPaymentMethod(prev => {
                    const methods: any[] = ['Débito', 'Crédito', 'Dinheiro', 'PIX'];
                    const idx = methods.indexOf(prev);
                    return methods[(idx + 1) % methods.length];
                });
            }
            if (e.key === 'F12') {
                e.preventDefault();
                if (paymentMethod === 'Dinheiro' && !showChangePanel) {
                    setShowChangePanel(true);
                } else {
                    handleCheckout();
                }
            }
            if (e.key === 'Escape') {
                setShowExpiryAlert(null);
            }
            if (e.key === 'Enter' && showExpiryAlert) {
                confirmExpiryAndAdd();
            }
        };

        window.addEventListener('keydown', handleGlobalKeydown);
        return () => window.removeEventListener('keydown', handleGlobalKeydown);
    }, [showExpiryAlert]); // Important for Enter key listener to have latest state

    // Cart Logic
    const addToCart = (product: Product) => {
        // Expiry Check
        if (product.lot_expiry) {
            const expiryDate = new Date(product.lot_expiry);
            const diffDays = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            if (diffDays < 30) {
                setShowExpiryAlert(product);
                return; // Wait for confirmation
            }
        }

        if (!cashRegister) {
            if (mountTime < 2000) {
                console.warn("Prevented auto-modal trigger during load (addToCart)");
                return;
            }
            console.log("DEBUG: Modal Opening triggered by addToCart because cashRegister is null");
            setRegAction('open');
            setIsRegModalOpen(true);
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const confirmExpiryAndAdd = () => {
        if (showExpiryAlert) {
            setCart(prev => {
                const existing = prev.find(item => item.id === showExpiryAlert.id);
                if (existing) {
                    return prev.map(item => 
                        item.id === showExpiryAlert.id ? { ...item, quantity: item.quantity + 1 } : item
                    );
                }
                return [...prev, { ...showExpiryAlert, quantity: 1 }];
            });
            setShowExpiryAlert(null);
            barcodeRef.current?.focus();
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const handleCheckout = async () => {
        console.log("Iniciando finalização de venda...");
        console.log("Estado do Caixa:", cashRegister);
        
        if (!cashRegister) {
            if (mountTime < 2000) {
                console.warn("Prevented auto-modal trigger during load (handleCheckout)");
                return;
            }
            console.log("DEBUG: Modal Opening triggered by handleCheckout because cashRegister is null");
            setRegAction('open');
            setIsRegModalOpen(true);
            return;
        }
        if (cart.length === 0) {
            console.warn("Carrinho vazio.");
            return;
        }
        setSubmitting(true);
        try {

            // Process items sequentially to avoid race conditions and pinpoint errors
            for (const item of cart) {
                console.log(`Processando item: ${item.name}`);
                
                // 1. Calculate split for this item
                const itemTotal = item.sell_price * item.quantity;
                const fee = getFeePercent();
                const itemNetRevenue = itemTotal * (1 - fee);
                const itemCOGS = item.cost_price * item.quantity;
                const itemNetProfit = itemNetRevenue - itemCOGS;
                
                const gymShareItem = itemNetProfit > 0 ? itemNetProfit * 0.5 : 0;
                const storeShareItem = (itemNetProfit > 0 ? itemNetProfit * 0.5 : itemNetProfit) + itemCOGS;

                // 2. Create Sale Record
                const mappedPayment = paymentMethod === 'PIX' ? 'Pix' : 
                                      (paymentMethod === 'Débito' || paymentMethod === 'Crédito') ? 'Cartão' : 
                                      'Dinheiro';

                console.log(`Criando venda para ${item.id}...`);
                const sale = await pb.collection('sales').create({
                    product_id: item.id,
                    quantity_sold: item.quantity,
                    total_amount: itemTotal,
                    payment_method: mappedPayment
                });
                console.log(`Venda criada: ${sale.id}`);

                // 3. Create Profit Split Record
                console.log(`Criando profit_split para venda ${sale.id}...`);
                await pb.collection('profit_splits').create({
                    sale_id: sale.id,
                    gross_profit: itemNetProfit,
                    gym_share: gymShareItem,
                    store_share: storeShareItem
                });

                // 4. Update Inventory (Saída)
                console.log(`Atualizando estoque para produto ${item.id}...`);
                await pb.collection('inventory').create({
                    product_id: item.id,
                    type: 'Saída',
                    quantity: item.quantity,
                    description: `Venda PDV - ID: ${sale.id}`,
                    location: 'Dark Store'
                });
            }


            alert("Venda finalizada com sucesso! 🎉");
            setCart([]);
            setBarcodeInput('');
            setCashReceived('');
            setShowChangePanel(false);
            
            // Refresh products to get updated stock
            const prodRecords = await pb.collection('products').getFullList<Product>();
            const invRecords = await pb.collection('inventory').getFullList<{ product_id: string, type: string, quantity: number }>();
            
            const productsWithStock = prodRecords.map(p => {
                const productInv = invRecords.filter(i => i.product_id === p.id);
                const stock = productInv.reduce((acc, i) => {
                    return i.type === 'Entrada' ? acc + i.quantity : acc - i.quantity;
                }, 0);
                return { ...p, stock };
            });
            setProducts(productsWithStock);

        } catch (err: any) {
            console.error("Erro completo ao finalizar venda:", err);
            if (err.data) {
                console.error("Dados detalhados do erro PocketBase:", JSON.stringify(err.data, null, 2));
                alert(`Erro de Validação: ${JSON.stringify(err.data.data || err.data)}`);
            } else {
                alert("Erro ao processar venda. Verifique a conexão.");
            }
        } finally {
            setSubmitting(false);
        }

    };

    const handleOpenRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await pb.collection('cash_register').create({
                opening_time: new Date().toISOString(),
                initial_float: parseFloat(regFormData.initial_float),
                status: 'Open',
                user_id: pb.authStore.model?.id || 'admin'
            });
            setCashRegister(res as any);
            setIsRegModalOpen(false);
            alert("Caixa aberto com sucesso!");
        } catch (err) {
            console.error("Erro ao abrir caixa:", err);
            alert("Erro ao abrir caixa.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cashRegister) return;
        setSubmitting(true);
        try {
            const finalCash = parseFloat(regFormData.final_cash) || 0; // Use 0 if NaN
            await pb.collection('cash_register').update(cashRegister.id, {
                closing_time: new Date().toISOString(),
                final_cash_count: finalCash,
                status: 'Closed'
            });
            setCashRegister(null);
            setIsRegModalOpen(false); // FIXED: Do not reopen modal after closing
            setRegAction('open');
            alert("Caixa fechado com sucesso!");
        } catch (err) {
            console.error("Erro ao fechar caixa:", err);
            alert("Erro ao fechar caixa.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const settingsToSave = [
                { key: 'tax_debito', value: taxRates.debito.toString() },
                { key: 'tax_credito', value: taxRates.credito.toString() },
                { key: 'tax_pix', value: taxRates.pix.toString() },
                { key: 'tax_dinheiro', value: taxRates.dinheiro.toString() },
            ];

            for (const s of settingsToSave) {
                const existing = await pb.collection('settings').getList(1, 1, {
                    filter: `key = "${s.key}"`
                });

                if (existing.items.length > 0) {
                    await pb.collection('settings').update(existing.items[0].id, { value: s.value });
                } else {
                    await pb.collection('settings').create(s);
                }
            }

            setIsSettingsModalOpen(false);
            alert("Configurações salvas com sucesso!");
        } catch (err) {
            console.error("Erro ao salvar configurações:", err);
            alert("Erro ao salvar configurações.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleForceResetRegs = async () => {
        if (!confirm("Isso vai fechar TODOS os registros de caixa no banco de dados. Tem certeza?")) return;
        setSubmitting(true);
        try {
            const openRegs = await pb.collection('cash_register').getFullList({ filter: 'status = "Open"' });
            for (const r of openRegs) {
                await pb.collection('cash_register').update(r.id, { status: 'Closed', closing_time: new Date().toISOString() });
            }
            setCashRegister(null);
            setIsRegModalOpen(false);
            alert("Sistema resetado com sucesso!");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Erro ao resetar.");
        } finally {
            setSubmitting(false);
        }
    };

    // Financial calculations
    const subtotal = cart.reduce((acc, item) => acc + (item.sell_price * item.quantity), 0);
    
    const getFeePercent = () => {
        if (paymentMethod === 'Débito') return taxRates.debito / 100;
        if (paymentMethod === 'Crédito') return taxRates.credito / 100;
        if (paymentMethod === 'PIX') return taxRates.pix / 100;
        if (paymentMethod === 'Dinheiro') return taxRates.dinheiro / 100;
        return 0;
    };

    const feePercent = getFeePercent();
    const netRevenue = subtotal * (1 - feePercent);
    const totalCOGS = cart.reduce((acc, item) => acc + (item.cost_price * item.quantity), 0);
    const netProfit = netRevenue - totalCOGS;

    const gymShare = netProfit > 0 ? netProfit * 0.5 : 0;
    const darkStoreShare = (netProfit > 0 ? netProfit * 0.5 : netProfit) + totalCOGS;

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode?.includes(searchTerm);
        const matchesCat = selectedCategory ? p.category === selectedCategory : true;
        return matchesSearch && matchesCat;
    });

    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const product = products.find(p => p.barcode === barcodeInput);
        if (product) {
            addToCart(product);
            setBarcodeInput('');
        } else {
            // Toast or sound for alert
            console.log("Product not found by barcode:", barcodeInput);
            setBarcodeInput('');
        }
    };

    return (
        <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-[#E85002]/30">
            {/* Sidebar - Categories */}
            <aside className="w-64 bg-[#0A0A0A] border-r border-[#151515] flex flex-col p-6 gap-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#111] border border-[#222] rounded-xl flex items-center justify-center shadow-inner overflow-hidden p-1">
                        <img 
                            src="/lobo.png" 
                            alt="Dark Store" 
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">DarkStore</h1>
                        <p className="text-[10px] text-[#444] uppercase font-bold tracking-[0.2em]">Agent Manager POS</p>
                    </div>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Status Caixa */}
                    <div className="bg-[#111] p-4 rounded-2xl border border-[#222]">
                        <div className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-3 flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${cashRegister ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                             Status do Caixa
                        </div>
                        <p className="text-xs font-bold text-white mb-2">{cashRegister ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}</p>
                        {cashRegister ? (
                            <button 
                                onClick={() => { 
                                    console.log("DEBUG: Modal Opening (Close Action) triggered by Sidebar button");
                                    setRegAction('close'); 
                                    setIsRegModalOpen(true); 
                                }}
                                className="w-full py-2 bg-[#1A1A1A] hover:bg-red-500/10 hover:text-red-500 border border-[#222] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Fechar Caixa
                            </button>
                        ) : (
                            <button 
                                onClick={() => { 
                                    console.log("DEBUG: Modal Opening (Open Action) triggered by Sidebar button");
                                    setRegAction('open'); 
                                    setIsRegModalOpen(true); 
                                }}
                                className="w-full py-2 bg-[#E85002]/10 text-[#E85002] border border-[#E85002]/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Abrir Caixa
                            </button>
                        )}
                        <button 
                            onClick={handleForceResetRegs}
                            className="w-full mt-2 py-1 bg-transparent hover:text-white text-[#222] text-[9px] font-bold uppercase tracking-widest transition-all"
                        >
                            Resetar Sistema (Emergência)
                        </button>
                    </div>

                    <div>
                        <div className="text-[11px] font-bold text-[#333] uppercase tracking-[0.15em] mb-4 flex justify-between items-center">
                            <span>Categorias</span>
                            <span className="bg-[#111] px-2 py-0.5 rounded text-[10px] text-[#666]">{categories.length}</span>
                        </div>
                    <div className="space-y-1">
                        <button 
                            onClick={() => setSelectedCategory(null)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex justify-between items-center group ${!selectedCategory ? 'bg-[#E85002]/10 text-[#E85002] border border-[#E85002]/20' : 'text-[#646464] hover:bg-[#111] border border-transparent'}`}
                        >
                            <span className="flex items-center gap-3">
                                <Package size={16} className={!selectedCategory ? 'text-[#E85002]' : 'text-[#333]'} />
                                Tudo
                            </span>
                            <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-all ${!selectedCategory ? 'opacity-100 text-[#E85002]' : 'text-[#333]'}`} />
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex justify-between items-center group ${selectedCategory === cat.id ? 'bg-[#E85002]/10 text-[#E85002] border border-[#E85002]/20' : 'text-[#646464] hover:bg-[#111] border border-transparent'}`}
                            >
                                <span className="flex items-center gap-3 truncate">
                                    <div className={`w-1.5 h-1.5 rounded-full ${selectedCategory === cat.id ? 'bg-[#E85002]' : 'bg-[#222]'}`} />
                                    {cat.name}
                                </span>
                                <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-all ${selectedCategory === cat.id ? 'opacity-100 text-[#E85002]' : 'text-[#333]'}`} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-[#151515]">
                <div className="flex items-center gap-3 p-3 bg-[#111] rounded-2xl border border-[#222]">
                    <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center border border-[#333]">
                        <History size={20} className="text-[#646464]" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] font-bold text-white leading-none">Última Venda</p>
                        <p className="text-[11px] font-semibold text-[#444] mt-1">R$ 450,00 • 14:32</p>
                    </div>
                </div>
            </div>
        </aside>




            {/* Cash Register Modal */}
            {hasMounted && isRegModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
                    <div className="bg-[#0A0A0A] border border-[#222] rounded-[40px] w-full max-w-md shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden relative">
                        <button 
                            onClick={() => setIsRegModalOpen(false)}
                            className="absolute top-6 right-6 text-[#333] hover:text-white transition-colors p-2"
                        >
                            <X size={24} />
                        </button>
                        <form onSubmit={regAction === 'open' ? handleOpenRegister : handleCloseRegister} className="p-10">
                            <div className="w-20 h-20 bg-[#111] rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#222]">
                                <Banknote size={40} className={regAction === 'open' ? 'text-green-500' : 'text-red-500'} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tight">
                                {regAction === 'open' ? 'Abrir Caixa' : 'Fechar Caixa'}
                            </h2>
                            <p className="text-[#444] text-xs text-center mb-8 font-bold uppercase tracking-widest">
                                {regAction === 'open' ? 'Informe o valor inicial (Fundo de Troco)' : 'Confirme o valor total em dinheiro no caixa'}
                            </p>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-2 block">
                                        {regAction === 'open' ? 'Fundo de Troco (R$)' : 'Valor em Espécie (R$)'}
                                    </label>
                                    <input 
                                        autoFocus
                                        type="number" 
                                        step="0.01"
                                        value={regAction === 'open' ? regFormData.initial_float : regFormData.final_cash}
                                        onChange={(e) => setRegFormData(prev => ({ ...prev, [regAction === 'open' ? 'initial_float' : 'final_cash']: e.target.value }))}
                                        className="w-full bg-black border border-[#151515] rounded-2xl p-5 text-2xl font-black text-white focus:outline-none focus:border-[#E85002]/50 transition-all text-center"
                                        placeholder="0,00"
                                        required
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={submitting}
                                className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-lg ${regAction === 'open' ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20'}`}
                            >
                                {submitting ? 'PROCESSANDO...' : regAction === 'open' ? 'INICIAR JORNADA' : 'FINALIZAR JORNADA'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Tax Settings Modal */}
            {hasMounted && isSettingsModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
                    <div className="bg-[#0A0A0A] border border-[#222] rounded-[40px] w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden relative">
                        <button 
                            onClick={() => setIsSettingsModalOpen(false)}
                            className="absolute top-6 right-6 text-[#333] hover:text-white transition-colors p-2"
                        >
                            <X size={24} />
                        </button>
                        
                        <form onSubmit={handleSaveSettings} className="p-10">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-[#E85002]/10 rounded-2xl flex items-center justify-center border border-[#E85002]/20">
                                    <Settings size={24} className="text-[#E85002]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Configurações de Taxas</h2>
                                    <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest">Ajuste as porcentagens para cada método</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-10">
                                {[
                                    { key: 'debito', label: 'Débito', icon: <CreditCard size={16} /> },
                                    { key: 'credito', label: 'Crédito', icon: <CreditCard size={16} /> },
                                    { key: 'pix', label: 'PIX', icon: <Banknote size={16} /> },
                                    { key: 'dinheiro', label: 'Dinheiro', icon: <Banknote size={16} /> }
                                ].map((field) => (
                                    <div key={field.key}>
                                        <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-3 flex items-center gap-2">
                                            {field.icon}
                                            {field.label} (%)
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={(taxRates as any)[field.key]}
                                            onChange={(e) => setTaxRates(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-black border border-[#151515] rounded-2xl p-4 text-xl font-black text-white focus:outline-none focus:border-[#E85002]/50 transition-all text-center"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button 
                                type="submit"
                                disabled={submitting}
                                className="w-full py-5 bg-[#E85002] hover:bg-[#ff5a0b] text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-lg shadow-[#E85002]/20 disabled:opacity-50"
                            >
                                {submitting ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
                            </button>
                        </form>
                    </div>
                </div>
            )}


            {/* Main Center - Product Grid */}
            <main className="flex-1 flex flex-col p-8 bg-[#050505]">
                <header className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4 bg-[#0A0A0A] border border-[#151515] px-5 py-3 rounded-2xl w-full max-w-lg focus-within:border-[#E85002]/50 focus-within:ring-4 focus-within:ring-[#E85002]/5 transition-all group">
                        <Search size={20} className="text-[#333] group-focus-within:text-[#E85002] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Pesquisar produto ou código (F2)" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-white text-sm w-full placeholder:text-[#333]"
                        />
                        <div className="bg-[#111] px-2 py-1 rounded-lg border border-[#222] text-[10px] font-bold text-[#444] tracking-widest uppercase">F2</div>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-[#0A0A0A] border border-[#151515] rounded-2xl text-sm font-bold text-[#646464] hover:text-white hover:bg-[#111] transition-all"
                        >
                            <Settings size={18} />
                            Painel
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-12 h-12 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(232,80,2,0.2)]"></div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[#222]">
                            <Package size={80} className="mb-6 stroke-[1]" />
                            <p className="text-xl font-bold tracking-tight">Nenhum produto encontrado</p>
                            <p className="text-sm">Tente ajustar sua pesquisa ou categoria</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map(product => (
                                <button 
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="group relative bg-[#0A0A0A] border border-[#151515] rounded-3xl p-6 text-left transition-all hover:border-[#E85002]/40 hover:bg-[#0D0D0D] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                                >
                                    <div className="absolute top-4 right-4 bg-[#111] border border-[#222] px-2 py-1 rounded-lg text-[10px] font-bold text-[#444] opacity-0 group-hover:opacity-100 transition-all">ADD</div>
                                    <div className="text-[10px] font-black text-[#E85002] uppercase tracking-[0.2em] mb-2">{product.category}</div>
                                    <h3 className="text-sm font-bold text-white group-hover:text-[#E85002] transition-colors line-clamp-2 leading-relaxed h-10 mb-4">{product.name}</h3>
                                    
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-[#333] uppercase tracking-wider mb-1">Preço</p>
                                            <p className="text-xl font-black text-white">R$ {product.sell_price.toFixed(2).replace('.', ',')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-[#333] uppercase tracking-wider mb-1">Estoque</p>
                                            <p className={`text-xs font-bold ${(product.stock || 0) < 10 ? 'text-red-500' : 'text-green-500/50'}`}>{product.stock || 0} un</p>
                                        </div>
                                    </div>

                                    {/* Glassmorphism Shine */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-all pointer-events-none rounded-3xl" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Right Panel - Checkout */}
            <aside className="w-[420px] bg-[#0A0A0A] border-l border-[#151515] flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
                <div className="p-8 border-b border-[#151515]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <ShoppingCart size={22} className="text-[#E85002]" />
                            <h2 className="font-bold text-lg">Checkout</h2>
                        </div>
                        <span className="bg-[#111] border border-[#222] px-3 py-1 rounded-full text-[10px] font-bold text-[#444] uppercase tracking-wider">{cart.length} ITENS</span>
                    </div>

                    <form onSubmit={handleBarcodeSubmit} className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#333] pointer-events-none">
                            <Barcode size={20} />
                        </div>
                        <input 
                            ref={barcodeRef}
                            type="text" 
                            placeholder="Aguardando scanner..." 
                            value={barcodeInput}
                            onChange={(e) => setBarcodeInput(e.target.value)}
                            className="w-full bg-black border border-[#151515] rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-white focus:outline-none focus:border-[#E85002]/50 focus:ring-4 focus:ring-[#E85002]/5 transition-all placeholder:text-[#222]"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                             <div className="bg-[#111] px-2 py-0.5 rounded text-[10px] font-bold text-[#333]">#</div>
                        </div>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[#1A1A1A] gap-4">
                            <ShoppingCart size={48} />
                            <p className="text-sm font-bold uppercase tracking-[0.2em]">Carrinho Vazio</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="relative bg-[#0D0D0D] border border-[#151515] p-4 rounded-2xl group transition-all hover:bg-[#111]">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 overflow-hidden pr-4">
                                        <p className="text-[9px] font-black text-[#E85002] uppercase tracking-[0.2em] mb-1">{item.category}</p>
                                        <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-[#333] hover:text-red-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center bg-black border border-[#1A1A1A] rounded-xl p-1">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#111] rounded-lg text-[#646464] transition-all">
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-10 text-center text-xs font-black text-white">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#111] rounded-lg text-white transition-all">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-[#333] uppercase mb-1">Total</p>
                                        <p className="text-sm font-black text-white">R$ {(item.sell_price * item.quantity).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Checkout Actions */}
                <div className="bg-[#0A0A0A] border-t border-[#151515] p-8 space-y-6 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
                    
                    {/* Tax & Financial Summary Panel */}
                    <div className="bg-black/40 border border-[#151515] rounded-2xl p-4 space-y-2">
                         <div className="flex justify-between text-[10px] font-bold tracking-wider">
                            <span className="text-[#444] uppercase">Subtotal</span>
                            <span className="text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                         </div>
                         <div className="flex justify-between text-[10px] font-bold tracking-wider">
                            <span className="text-[#444] uppercase">Taxa ({paymentMethod})</span>
                            <span className="text-red-500/80">- R$ {(subtotal * feePercent).toFixed(2).replace('.', ',')}</span>
                         </div>
                         <div className="h-px bg-[#151515] my-1" />
                         <div className="flex justify-between text-[11px] font-black tracking-widest">
                            <span className="text-[#E85002] uppercase tracking-[0.2em]">Líquido à Receber</span>
                            <span className="text-white">R$ {netRevenue.toFixed(2).replace('.', ',')}</span>
                         </div>
                    </div>

                    <div className="space-y-4 text-white">
                        <div className="flex gap-2">
                            {['Débito', 'Crédito', 'Dinheiro', 'PIX'].map((m) => (
                                <button 
                                    key={m}
                                    onClick={() => {
                                        setPaymentMethod(m as any);
                                        if (m !== 'Dinheiro') setShowChangePanel(false);
                                    }}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentMethod === m ? 'bg-[#E85002] border-[#E85002] text-white shadow-[0_4px_15px_rgba(232,80,2,0.3)]' : 'bg-black border-[#151515] text-[#333] hover:border-[#333]'}`}
                                >
                                    {m === 'Débito' || m === 'Crédito' ? <CreditCard size={14} className="mx-auto mb-1" /> : <Banknote size={14} className="mx-auto mb-1" />}
                                    {m}
                                </button>
                            ))}
                        </div>

                        {paymentMethod === 'Dinheiro' && (
                            <div className="animate-in slide-in-from-bottom-2 duration-300">
                                <div className="bg-[#111] border border-[#222] rounded-2xl p-4 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-2 block">Valor Recebido (R$)</label>
                                        <input 
                                            autoFocus
                                            type="number"
                                            value={cashReceived}
                                            onChange={(e) => setCashReceived(e.target.value)}
                                            className="w-full bg-black border border-[#222] rounded-xl px-4 py-3 text-xl font-black text-white focus:outline-none focus:border-[#E85002]/50 text-center"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    {parseFloat(cashReceived || '0') >= subtotal && (
                                        <div className="text-center pt-2 border-t border-[#222]">
                                            <p className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-1">Troco à Devolver</p>
                                            <p className="text-2xl font-black text-green-500">R$ {(parseFloat(cashReceived) - subtotal).toFixed(2).replace('.', ',')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || (paymentMethod === 'Dinheiro' && parseFloat(cashReceived || '0') < subtotal)}
                            className="w-full py-6 bg-white text-black rounded-3xl font-black text-lg shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:bg-[#f0f0f0] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group"
                        >
                            <span className="relative z-10 flex items-center gap-3 uppercase tracking-tighter">
                                {submitting ? 'PROCESSANDO...' : `Finalizar • R$ ${subtotal.toFixed(2).replace('.', ',')}`}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-all duration-1000" />
                        </button>
                        <p className="text-center text-[9px] font-black text-[#222] uppercase tracking-[0.3em]">Finalizar Venda (F12)</p>
                    </div>
                </div>
            </aside>

            {/* Expiry Alert Modal */}
            {showExpiryAlert && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0A0A0A] border border-[#E85002]/30 rounded-[40px] w-full max-w-lg shadow-[0_0_100px_rgba(232,80,2,0.2)] overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-[#E85002]/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-[#E85002]/20 shadow-[0_0_40px_rgba(232,80,2,0.2)]">
                                <ShieldAlert size={48} className="text-[#E85002] animate-pulse" />
                            </div>
                            
                            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">
                                Alerta de <br /> <span className="text-[#E85002]">Vencimento Próximo</span>
                            </h2>
                            
                            <p className="text-[#646464] text-sm leading-relaxed mb-10 px-6">
                                O produto <span className="text-white font-bold">"{showExpiryAlert.name}"</span> vence em menos de 30 dias ({new Date(showExpiryAlert.lot_expiry!).toLocaleDateString('pt-BR')}). <br /><br />
                                Deseja incluir no carrinho mesmo assim?
                            </p>

                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={confirmExpiryAndAdd}
                                    className="w-full py-5 bg-[#E85002] text-white rounded-3xl font-black text-sm shadow-[0_10px_30px_rgba(232,80,2,0.3)] hover:bg-[#ff5a0b] active:scale-[0.98] transition-all uppercase tracking-widest"
                                >
                                    Confirmar Lançamento (Enter)
                                </button>
                                <button 
                                    onClick={() => setShowExpiryAlert(null)}
                                    className="w-full py-5 bg-transparent border border-[#151515] text-[#333] rounded-3xl font-bold text-sm hover:text-white hover:border-[#333] transition-all uppercase tracking-widest"
                                >
                                    Cancelar Escaneamento (ESC)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
