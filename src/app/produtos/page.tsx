'use client';

import { useState, useEffect } from 'react';
import { PackagePlus, Search, Edit2, Trash2, X, Plus, AlertCircle, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { pb, ensureAuthenticated } from '@/lib/pb';

interface Product {
    id: string;
    name: string;
    category: string;
    barcode?: string;
    sku?: string;
    description?: string;
    unit_type: string;
    cost_price: number;
    sell_price: number;
    created: string;
    stock?: number;
}

interface Category {
    id: string;
    name: string;
}

interface StockMovement {
    id: string;
    product_id: string;
    type: 'Entrada' | 'Saída';
    quantity: number;
    description: string;
    created: string;
}

export default function ProdutosPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [movementData, setMovementData] = useState({
        type: 'Entrada' as 'Entrada' | 'Saída',
        quantity: '',
        description: ''
    });

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        barcode: '',
        sku: '',
        description: '',
        unit_type: 'Unidade',
        cost_price: '',
        sell_price: '',
        initial_stock: '0',
    });

    // Category Form State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const resetForm = () => {
        setFormData({
            name: '',
            category: '',
            barcode: '',
            sku: '',
            description: '',
            unit_type: 'Unidade',
            cost_price: '',
            sell_price: '',
            initial_stock: '0',
        });
        setEditingProduct(null);
        setErrorMsg('');
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            category: product.category || '',
            barcode: product.barcode || '',
            sku: product.sku || '',
            description: product.description || '',
            unit_type: product.unit_type,
            cost_price: product.cost_price.toString().replace('.', ','),
            sell_price: product.sell_price.toString().replace('.', ','),
            initial_stock: (product.stock || 0).toString(),
        });
        setIsModalOpen(true);
    };

    // Fetch Products with Stock
    const fetchProducts = async () => {
        try {
            setLoading(true);
            await ensureAuthenticated();

            // Fetch products and categories in parallel
            const [productRecords, inventoryRecords, categoryRecords] = await Promise.all([
                pb.collection('products').getFullList({ sort: '-created' }),
                pb.collection('inventory').getFullList(),
                pb.collection('categories').getFullList({ sort: 'name' })
            ]);

            setCategories(categoryRecords as unknown as Category[]);

            // Map inventory quantity back into products
            const productsWithStock = (productRecords as unknown as Product[]).map(prod => {
                const prodStock = inventoryRecords
                    .filter(inv => inv.product_id === prod.id)
                    .reduce((acc, inv: any) => {
                        const qty = inv.quantity || 0;
                        const isExit = inv.type === 'Saída';
                        return acc + (isExit ? -qty : qty);
                    }, 0);
                return { ...prod, stock: prodStock };
            });

            setProducts(productsWithStock);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (productId: string) => {
        try {
            const records = await pb.collection('inventory').getFullList({
                filter: `product_id = "${productId}"`,
                sort: '-created'
            });
            setMovements(records as unknown as StockMovement[]);
        } catch (err) {
            console.error("Erro ao buscar histórico:", err);
        }
    };

    const handleRecordMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductForHistory || !movementData.quantity) return;

        try {
            setSubmitting(true);
            await pb.collection('inventory').create({
                product_id: selectedProductForHistory.id,
                type: movementData.type,
                quantity: parseInt(movementData.quantity),
                description: movementData.description || (movementData.type === 'Entrada' ? 'Compra/Entrada' : 'Ajuste/Saída')
            });

            setMovementData({ type: 'Entrada', quantity: '', description: '' });
            await fetchHistory(selectedProductForHistory.id);
            await fetchProducts();
        } catch (err: any) {
            console.error("Erro ao registrar movimentação:", err);
            setErrorMsg("Erro ao salvar movimentação.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setErrorMsg('');

        try {
            setSubmitting(true);
            await pb.collection('categories').create({ name: newCategoryName });
            setNewCategoryName('');
            await fetchProducts(); // Refresh categories
        } catch (err: any) {
            console.error("Erro ao criar categoria:", err);
            setErrorMsg(err.message || "Erro ao criar categoria. Talvez já exista?");
        } finally {
            setSubmitting(false);
        }
    };


    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Excluir esta categoria? Isso não afetará os produtos já cadastrados.")) return;
        try {
            await pb.collection('categories').delete(id);
            setCategories(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert("Erro ao excluir categoria.");
        }
    };

    // Save new Product
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSubmitting(true);

        try {
            // Parse Brazilian price format (e.g., "110,00" -> 110.00)
            const parsePrice = (val: string) => {
                if (!val) return 0;
                return parseFloat(val.replace(/\./g, '').replace(',', '.'));
            };

            const data = {
                name: formData.name,
                category: formData.category,
                barcode: formData.barcode,
                sku: formData.sku,
                description: formData.description,
                unit_type: formData.unit_type,
                cost_price: parsePrice(formData.cost_price),
                sell_price: parsePrice(formData.sell_price)
            };

            if (editingProduct) {
                await pb.collection('products').update(editingProduct.id, data);
            } else {
                const createdProduct = await pb.collection('products').create(data);

                // Automatically add initial stock to inventory if greater than 0
                const stockQty = parseInt(formData.initial_stock) || 0;
                if (stockQty > 0) {
                    await pb.collection('inventory').create({
                        product_id: createdProduct.id,
                        type: 'Entrada',
                        quantity: stockQty,
                        description: 'Estoque inicial'
                    });
                }
            }

            // Reset and refresh
            setIsModalOpen(false);
            resetForm();
            fetchProducts();

        } catch (err: any) {
            console.error("Erro PocketBase:", err);

            // Handle specific validation errors
            if (err?.response?.data) {
                const pbErrors = Object.values(err.response.data)
                    // @ts-ignore
                    .map((e: any) => e.message)
                    .join(' | ');
                setErrorMsg(`Dados inválidos: ${pbErrors}`);
            } else {
                setErrorMsg('Erro ao salvar produto. Verifique os campos.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este produto?")) return;
        try {
            await pb.collection('products').delete(id);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error("Erro ao excluir:", err);
            alert("Erro ao excluir.");
        }
    };

    // Filter products
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex-1 overflow-y-auto p-8 font-sans bg-black relative">

            {/* Header */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold mb-1">Meus Produtos</h1>
                    <p className="text-[#A7A7A7] text-sm">Gerencie o cadastro base e preços dos itens.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#646464]" />
                        <input
                            type="text"
                            placeholder="Buscar suplemento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#151515] border border-[#333333] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#E85002] transition-colors w-60"
                        />
                    </div>
                    <button
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="bg-[#151515] border border-[#333333] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1E1E1E] transition-all flex items-center gap-2"
                    >
                        Categorias
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="brand-gradient text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-[0_0_15px_rgba(232,80,2,0.4)] transition-all flex items-center gap-2"
                    >
                        <PackagePlus size={16} />
                        Novo Produto
                    </button>
                </div>
            </header>

            {/* Main Table Area */}
            <div className="glass-card rounded-2xl overflow-hidden border border-[#333333]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#333333] bg-[#151515]">
                                <th className="py-4 px-6 text-[13px] font-semibold text-[#A7A7A7] uppercase tracking-wider">Produto</th>
                                <th className="py-4 px-6 text-[13px] font-semibold text-[#A7A7A7] uppercase tracking-wider">Estoque</th>
                                <th className="py-4 px-6 text-[13px] font-semibold text-[#A7A7A7] uppercase tracking-wider">Preço de Custo</th>
                                <th className="py-4 px-6 text-[13px] font-semibold text-[#A7A7A7] uppercase tracking-wider">Preço de Venda</th>
                                <th className="py-4 px-6 text-[13px] font-semibold text-[#A7A7A7] uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333333]/50">

                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-[#A7A7A7]">Carregando produtos...</td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-[#A7A7A7]">Nenhum produto encontrado.</td>
                                </tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-[#1E1E1E]/50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#111] border border-[#333] flex items-center justify-center text-[#F9F9F9] font-bold text-sm">
                                                    {product.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-[#F9F9F9] flex items-center gap-2">
                                                        {product.name}
                                                        {product.category && (
                                                            <span className="bg-[#E85002]/20 text-[#E85002] border border-[#E85002]/30 text-[10px] px-1.5 py-0.5 rounded-sm">
                                                                {product.category}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[11px] text-[#646464] uppercase tracking-wider">{product.unit_type || 'Unidade'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${product.stock && product.stock > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                                                <span className="font-semibold text-[#F9F9F9]">{product.stock || 0}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-[#A7A7A7]">
                                            R$ {product.cost_price.toFixed(2).replace('.', ',')}
                                        </td>
                                        <td className="py-4 px-6 font-semibold text-[#E85002]">
                                            R$ {product.sell_price.toFixed(2).replace('.', ',')}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedProductForHistory(product);
                                                        fetchHistory(product.id);
                                                        setIsHistoryModalOpen(true);
                                                    }}
                                                    className="p-2 text-[#A7A7A7] hover:text-[#E85002] bg-[#151515] rounded-md border border-[#333333] transition-colors"
                                                    title="Histórico de Estoque"
                                                >
                                                    <History size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-2 text-[#A7A7A7] hover:text-white bg-[#151515] rounded-md border border-[#333333] transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 text-[#A7A7A7] hover:text-[#ff4a4a] bg-[#151515] rounded-md border border-[#333333] hover:border-[#ff4a4a]/30 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}

                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Product Modal */}
            {isModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#0A0A0A] border border-[#222] rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                        <div className="flex justify-between items-center p-6 bg-[#111] border-b border-[#222]">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <PackagePlus size={22} className="text-[#E85002]" /> {editingProduct ? 'Editar Produto' : 'Cadastro de Produto'}
                                </h2>
                                <p className="text-[#646464] text-[12px] uppercase tracking-widest mt-1 font-medium">
                                    {editingProduct ? `Editando: ${editingProduct.name}` : 'Informações base e estoque'}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="bg-[#1A1A1A] text-[#646464] hover:text-white transition-all p-2 rounded-full border border-[#333]">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8">
                            {errorMsg && (
                                <div className="mb-6 bg-red-500/5 border border-red-500/20 text-red-500 text-[12px] px-4 py-3 rounded-xl flex gap-3 items-center">
                                    <AlertCircle size={16} /> {errorMsg}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Coluna 1: Básico */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[11px] font-bold text-[#646464] uppercase tracking-wider mb-2">Nome do Produto *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ex: Whey Protein Isolado 900g"
                                            className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E85002] focus:ring-1 focus:ring-[#E85002]/20 transition-all placeholder:text-[#333]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-[#646464] uppercase tracking-wider mb-2">Categoria</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E85002] transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Sem Categoria</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-[#646464] uppercase tracking-wider mb-2">Unidade</label>
                                            <select
                                                value={formData.unit_type}
                                                onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                                                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E85002] transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="Pote">Pote</option>
                                                <option value="Unidade">Unidade</option>
                                                <option value="Caixa">Caixa</option>
                                                <option value="Saco">Saco</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-[#646464] uppercase tracking-wider mb-2">Descrição Curta</label>
                                        <textarea
                                            rows={2}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Detalhes adicionais do item..."
                                            className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E85002] transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Coluna 2: Identificação e Preços */}
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-[#646464] uppercase tracking-wider mb-2">SKU / Ref</label>
                                            <input
                                                type="text"
                                                value={formData.sku}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                placeholder="REF-001"
                                                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E85002] transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-[#646464] uppercase tracking-wider mb-2">Código de Barras</label>
                                            <input
                                                type="text"
                                                value={formData.barcode}
                                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                                placeholder="Opcional"
                                                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E85002] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-[#111] border border-[#222] rounded-xl space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-[#444] uppercase tracking-widest mb-1.5">Preço Custo</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444] text-[12px] font-bold">R$</span>
                                                    <input
                                                        type="text"
                                                        value={formData.cost_price}
                                                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                                        placeholder="0,00"
                                                        className="w-full bg-black border border-[#333] rounded-lg pl-9 pr-3 py-2 text-white text-[13px] focus:outline-none focus:border-[#E85002] transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-[#444] uppercase tracking-widest mb-1.5">Preço Venda</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444] text-[12px] font-bold">R$</span>
                                                    <input
                                                        type="text"
                                                        value={formData.sell_price}
                                                        onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                                                        placeholder="0,00"
                                                        className="w-full bg-black border border-[#E85002]/30 rounded-lg pl-9 pr-3 py-2 text-[#E85002] font-bold text-[13px] focus:outline-none focus:border-[#E85002] transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Profit Logic */}
                                        <div className="pt-2 flex justify-between items-center border-t border-[#222]">
                                            <span className="text-[11px] font-bold text-[#444] uppercase tracking-widest">Margem Prevista</span>
                                            <div className="text-right">
                                                {(() => {
                                                    const cost = parseFloat(formData.cost_price.replace(',', '.')) || 0;
                                                    const sell = parseFloat(formData.sell_price.replace(',', '.')) || 0;
                                                    const profit = sell - cost;
                                                    const margin = sell > 0 ? (profit / sell) * 100 : 0;
                                                    return (
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-bold ${profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                R$ {profit.toFixed(2).replace('.', ',')}
                                                            </span>
                                                            <span className="text-[10px] text-[#646464] font-medium">{margin.toFixed(1)}% de lucro</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={editingProduct ? 'opacity-40 pointer-events-none' : ''}>
                                        <label className="block text-[11px] font-bold text-[#646464] uppercase tracking-wider mb-2 text-center">
                                            {editingProduct ? 'Estoque Atual (Não editável aqui)' : 'Estoque Inicial (Itens)'}
                                        </label>
                                        <div className="flex items-center justify-center gap-4 bg-[#111] p-2 rounded-2xl border border-[#222]">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, initial_stock: Math.max(0, parseInt(formData.initial_stock) - 1).toString() })}
                                                className="w-10 h-10 flex items-center justify-center bg-black border border-[#333] rounded-full text-[#A7A7A7] hover:bg-[#1A1A1A] transition-all"
                                            >-</button>
                                            <input
                                                type="number"
                                                value={formData.initial_stock}
                                                onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                                                className="bg-transparent text-white font-bold text-center w-20 text-lg focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, initial_stock: (parseInt(formData.initial_stock) + 1).toString() })}
                                                className="w-10 h-10 flex items-center justify-center bg-[#E85002] rounded-full text-white hover:bg-[#ff5a0b] transition-all border border-[#ff7030]"
                                            >+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex gap-4 pt-6 border-t border-[#111]">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-transparent border border-[#222] text-[#646464] rounded-xl font-bold text-sm hover:bg-[#1A1A1A] hover:text-white transition-all uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-4 bg-[#E85002] text-white rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(232,80,2,0.3)] hover:shadow-[0_4px_30px_rgba(232,80,2,0.5)] hover:bg-[#ff5a0b] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 uppercase tracking-widest"
                                >
                                    {submitting ? 'Salvando...' : <>{editingProduct ? <Edit2 size={18} /> : <Plus size={20} />} {editingProduct ? 'Salvar Alterações' : 'Finalizar Cadastro'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock History Modal */}
            {isHistoryModalOpen && selectedProductForHistory && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#0A0A0A] border border-[#222] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 bg-[#111] border-b border-[#222]">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <History size={22} className="text-[#E85002]" /> Histórico: {selectedProductForHistory.name}
                                </h2>
                                <p className="text-[#646464] text-[12px] uppercase tracking-widest mt-1 font-medium">Movimentações de estoque</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="bg-[#1A1A1A] text-[#646464] hover:text-white transition-all p-2 rounded-full border border-[#333]">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Record New Movement */}
                            <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                                <h3 className="text-[11px] font-bold text-[#646464] uppercase tracking-widest mb-4">Registrar Movimentação</h3>
                                <form onSubmit={handleRecordMovement} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold text-[#444] uppercase tracking-widest mb-1.5">Tipo</label>
                                        <select
                                            value={movementData.type}
                                            onChange={(e) => setMovementData({ ...movementData, type: e.target.value as 'Entrada' | 'Saída' })}
                                            className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E85002]"
                                        >
                                            <option value="Entrada">Entrada (Compra)</option>
                                            <option value="Saída">Saída (Ajuste)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold text-[#444] uppercase tracking-widest mb-1.5">Quantidade</label>
                                        <input
                                            type="number"
                                            required
                                            value={movementData.quantity}
                                            onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                                            placeholder="Ex: 10"
                                            className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E85002]"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold text-[#444] uppercase tracking-widest mb-1.5">Descrição</label>
                                        <input
                                            type="text"
                                            value={movementData.description}
                                            onChange={(e) => setMovementData({ ...movementData, description: e.target.value })}
                                            placeholder="Motivo..."
                                            className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E85002]"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-[#E85002] text-white py-2 rounded-lg text-sm font-bold hover:bg-[#ff5a0b] transition-all disabled:opacity-50"
                                    >
                                        Lançar
                                    </button>
                                </form>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-bold text-[#646464] uppercase tracking-widest mb-4">Linha do Tempo</h3>
                                <div className="space-y-3">
                                    {movements.length === 0 ? (
                                        <p className="text-[#444] text-center py-10 italic">Nenhuma movimentação registrada.</p>
                                    ) : (
                                        movements.map((m) => (
                                            <div key={m.id} className="flex items-center gap-4 bg-[#111] p-4 rounded-xl border border-[#222] hover:border-[#333] transition-all group">
                                                <div className={`p-2 rounded-full ${m.type === 'Entrada' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {m.type === 'Entrada' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-sm font-bold text-white">{m.description || (m.type === 'Entrada' ? 'Entrada manual' : 'Saída manual')}</span>
                                                        <span className="text-[10px] text-[#444] font-medium">{new Date(m.created).toLocaleString('pt-BR')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[11px] font-bold uppercase ${m.type === 'Entrada' ? 'text-green-500' : 'text-red-500'}`}>
                                                            {m.type === 'Entrada' ? '+' : '-'}{m.quantity} UN
                                                        </span>
                                                        <span className="text-[10px] text-[#444]">•</span>
                                                        <span className="text-[10px] text-[#444] uppercase tracking-widest">{m.type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-[#111] border-t border-[#222]">
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="w-full py-3 bg-[#1A1A1A] border border-[#333] text-white rounded-xl text-sm font-medium hover:bg-[#222] transition-colors uppercase tracking-widest"
                            >
                                Fechar Histórico
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Categories Modal */}
            {isCategoryModalOpen && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-[#333333]">
                            <h2 className="text-lg font-bold text-white">Gerenciar Categorias</h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-[#A7A7A7] hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5">
                            {errorMsg && (
                                <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] px-3 py-2 rounded-lg flex gap-2 items-center">
                                    <AlertCircle size={14} /> {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleAddCategory} className="mb-6">
                                <label className="block text-[12px] font-semibold text-[#A7A7A7] uppercase tracking-wider mb-2">Nova Categoria</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Ex: Aminoácidos"
                                        className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E85002] transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-[#E85002] text-white p-2 rounded-lg hover:bg-[#ff5a0b] transition-colors disabled:opacity-50"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                                <p className="text-[11px] font-semibold text-[#646464] uppercase tracking-wider mb-3">Categorias Atuais</p>
                                {categories.length === 0 ? (
                                    <p className="text-sm text-[#A7A7A7] py-2">Nenhuma categoria cadastrada.</p>
                                ) : (
                                    categories.map(cat => (
                                        <div key={cat.id} className="flex justify-between items-center bg-[#151515] p-3 rounded-lg border border-[#333333]/50 hover:border-[#333] transition-colors group">
                                            <span className="text-sm text-[#F9F9F9]">{cat.name}</span>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="text-[#646464] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-5 bg-[#151515] border-t border-[#333333]">
                            <button
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="w-full py-2 bg-[#1A1A1A] border border-[#333333] text-white rounded-lg text-sm font-medium hover:bg-[#222] transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
