import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Check, Trash2, AlertCircle, DollarSign, Calendar, Clock, Edit, Filter, ArrowRight } from 'lucide-react';
import type { Payment } from '../types';

import { PaymentStatsModal } from '../components/PaymentStatsModal';

export function PaymentsPage() {
    const { students, payments, createPayments, updatePayment, updateFuturePayments, markAsPaid, deletePayment, loading } = useStore();

    // Persistence: Initialize DIRECTLY from localStorage to avoid flashing default state
    const [selectedMonth, setSelectedMonth] = useState(() => {
        return localStorage.getItem('atelier_payment_month') || new Date().toISOString().slice(0, 7);
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form State
    const [newPaymentStudentId, setNewPaymentStudentId] = useState('');



    const handleDeleteClick = async (paymentId: string) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;

        if (!confirm('Tem certeza que deseja excluir esta cobrança?')) return;

        // Check for active future payments
        const hasFuturePayments = payments.some(p =>
            p.student_id === payment.student_id &&
            p.status === 'pending' &&
            p.due_date > payment.due_date
        );

        let deleteFuture = false;
        if (hasFuturePayments) {
            deleteFuture = confirm('Existem cobranças futuras para este aluno. Deseja excluir também TODAS as futuras? \n(Clique OK para excluir tudo, Cancelar para excluir apenas esta)');
        }

        await deletePayment(paymentId, deleteFuture);
    };
    const [newPaymentDate, setNewPaymentDate] = useState('');
    const [newPaymentAmount, setNewPaymentAmount] = useState('');

    const [viewMode, setViewMode] = useState<'month' | 'next'>(() => {
        return (localStorage.getItem('atelier_payment_view') as 'month' | 'next') || 'month';
    });
    const [repeatUntilEndOfYear, setRepeatUntilEndOfYear] = useState(false);



    // Persistence: Save state on change
    useEffect(() => {
        localStorage.setItem('atelier_payment_month', selectedMonth);
        localStorage.setItem('atelier_payment_view', viewMode);
    }, [selectedMonth, viewMode]);

    // Helper to format YYYY-MM-DD to DD/MM/YYYY without timezone shift
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    // Edit State
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [updateFuture, setUpdateFuture] = useState(false);

    // Stats Modal State
    const [statModalOpen, setStatModalOpen] = useState(false);
    const [statModalType, setStatModalType] = useState<'total' | 'paid' | 'pending' | 'overdue'>('total');

    const filteredPayments = useMemo(() => {
        if (viewMode === 'next') {
            const nexts: Payment[] = [];
            students.forEach(student => {
                if (!student.active) return;
                const studentPayments = payments
                    .filter(p => p.student_id === student.id && p.status === 'pending')
                    .sort((a, b) => a.due_date.localeCompare(b.due_date));

                if (studentPayments.length > 0) {
                    nexts.push(studentPayments[0]);
                }
            });
            return nexts.sort((a, b) => a.due_date.localeCompare(b.due_date));
        }
        return payments.filter(p => p.month_ref === selectedMonth);
    }, [payments, selectedMonth, viewMode, students]);

    const yearStats = useMemo(() => {
        const currentYear = new Date().getFullYear().toString();
        const yearPayments = payments.filter(p => p.due_date.startsWith(currentYear));

        return {
            total: yearPayments.length,
            paid: yearPayments.filter(p => p.status === 'paid').length,
            pending: yearPayments.filter(p => p.status === 'pending').length,
            overdue: yearPayments.filter(p => p.status === 'pending' && p.due_date < new Date().toISOString().split('T')[0]).length,
            all: yearPayments
        };
    }, [payments]);

    const stats = useMemo(() => {
        // Stats ALWAYS reflect the YEARLY overview, regardless of view mode.
        return yearStats;
    }, [yearStats]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayment) return;

        const newDay = parseInt(editDate.split('-')[2]);
        const amount = editAmount ? parseFloat(editAmount) : undefined;

        if (updateFuture) {
            await updateFuturePayments(editingPayment.student_id, editingPayment.due_date, newDay, amount);
            // Also update the current one if it wasn't caught by the > check (it usually isn't)
            await updatePayment(editingPayment.id, {
                due_date: editDate,
                amount: amount
            });
        } else {
            await updatePayment(editingPayment.id, {
                due_date: editDate,
                amount: amount
            });
        }

        setEditingPayment(null);
        setUpdateFuture(false);
    };

    const openEditModal = (payment: Payment) => {
        setEditingPayment(payment);
        setEditDate(payment.due_date);
        setEditAmount(payment.amount?.toString() || '');
        setUpdateFuture(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPaymentStudentId || !newPaymentDate) return;

        const student = students.find(s => s.id === newPaymentStudentId);
        if (!student) return;

        const paymentsToCreate = [];
        const amount = newPaymentAmount ? parseFloat(newPaymentAmount) : undefined;

        // Parse Initial Date explicitly to avoid timezone messes
        const [yearStr, monthStr, dayStr] = newPaymentDate.split('-');
        const inputYear = parseInt(yearStr);
        const inputMonth = parseInt(monthStr) - 1; // 0-indexed for loop
        const inputDay = parseInt(dayStr);

        const startMonth = inputMonth;
        const endMonth = repeatUntilEndOfYear ? 11 : startMonth;

        for (let month = startMonth; month <= endMonth; month++) {
            // Logic: Target specific Year/Month, and force the Day.
            // If Day > DaysInMonth, use DaysInMonth.

            // Get max days in this target month
            // new Date(year, month + 1, 0) gives the last day of 'month'
            const daysInMonth = new Date(inputYear, month + 1, 0).getDate();

            // The constraint: We want 'inputDay' but capped at 'daysInMonth'
            const dayToUse = Math.min(inputDay, daysInMonth);

            // Construct YYYY-MM-DD manually
            const safeMonth = (month + 1).toString().padStart(2, '0');
            const safeDay = dayToUse.toString().padStart(2, '0');
            const dueDateString = `${inputYear}-${safeMonth}-${safeDay}`;
            const monthRef = `${inputYear}-${safeMonth}`;

            paymentsToCreate.push({
                student_id: newPaymentStudentId,
                due_date: dueDateString,
                amount: amount,
                month_ref: monthRef
            });
        }

        if (paymentsToCreate.length > 0) {
            await createPayments(paymentsToCreate);
            if (repeatUntilEndOfYear) {
                setViewMode('next'); // Switch to see the future payments flow
            }
        }

        setIsCreateModalOpen(false);
        setNewPaymentStudentId('');
        setNewPaymentDate('');
        setNewPaymentAmount('');
        setRepeatUntilEndOfYear(false);
    };

    const getStatusInfo = (payment: any) => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        if (payment.status === 'paid') {
            return { label: 'Pago', color: 'bg-green-100 text-green-700', icon: <Check size={14} /> };
        }

        if (payment.due_date < today) {
            return { label: 'Atrasado', color: 'bg-red-100 text-red-700', icon: <AlertCircle size={14} /> };
        }

        if (payment.due_date === today) {
            return { label: 'Vence Hoje', color: 'bg-red-100 text-red-700 font-bold', icon: <Clock size={14} /> };
        }

        if (payment.due_date === tomorrow) {
            return { label: 'Vence Amanhã', color: 'bg-orange-100 text-orange-700 font-bold', icon: <Clock size={14} /> };
        }

        return { label: 'Pendente', color: 'bg-slate-100 text-slate-600', icon: <Clock size={14} /> };
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando financeiro...</div>;

    // Alunas que ainda não tem pagamento gerado neste mês
    const studentsWithoutPayment = students.filter(s =>
        s.active && !filteredPayments.some(p => p.student_id === s.id)
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign className="text-brand-600" />
                            Financeiro <span className="text-sm font-normal text-slate-400 mt-2 bg-slate-100 px-2 py-1 rounded-lg">Visão Anual ({new Date().getFullYear()})</span>
                        </h1>
                        <p className="text-slate-500 mt-1">Controle de mensalidades e pagamentos.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
                    >
                        <Plus size={20} />
                        Nova Cobrança
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Por Mês
                    </button>
                    <button
                        onClick={() => setViewMode('next')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'next' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Próximos Vencimentos
                    </button>
                </div>

                {viewMode === 'month' && (
                    <div className="flex justify-end">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-600 shadow-sm"
                        />
                    </div>
                )}
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Cobranças"
                    value={stats.total}
                    icon={<DollarSign size={24} className="text-blue-600" />}
                    bg="bg-blue-50"
                    onClick={() => { setStatModalType('total'); setStatModalOpen(true); }}
                />
                <StatCard
                    title="Pagos"
                    value={stats.paid}
                    icon={<Check size={24} className="text-green-600" />}
                    bg="bg-green-50"
                    onClick={() => { setStatModalType('paid'); setStatModalOpen(true); }}
                />
                <StatCard
                    title="Pendentes"
                    value={stats.pending}
                    icon={<Clock size={24} className="text-orange-600" />}
                    bg="bg-orange-50"
                    onClick={() => { setStatModalType('pending'); setStatModalOpen(true); }}
                />
                <StatCard
                    title="Atrasados"
                    value={stats.overdue}
                    icon={<AlertCircle size={24} className="text-red-600" />}
                    bg="bg-red-50"
                    alert={stats.overdue > 0}
                    onClick={() => { setStatModalType('overdue'); setStatModalOpen(true); }}
                />
            </div>

            <PaymentStatsModal
                isOpen={statModalOpen}
                onClose={() => setStatModalOpen(false)}
                type={statModalType}
                payments={yearStats.all}
                students={students}
                title={
                    statModalType === 'total' ? 'Todas as Cobranças (Ano Atual)' :
                        statModalType === 'paid' ? 'Pagamentos Confirmados (Ano Atual)' :
                            statModalType === 'pending' ? 'Pagamentos Pendentes (Ano Atual)' :
                                'Pagamentos Atrasados (Ano Atual)'
                }
            />

            {/* Suggested Actions (Generate for all active?) - Removed for simplicity first */}

            {/* Payments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPayments.map(payment => {
                    const student = students.find(s => s.id === payment.student_id);
                    const status = getStatusInfo(payment);

                    return (
                        <div key={payment.id} className={`bg-white p-5 rounded-xl shadow-sm border hover:shadow-md transition-all ${status.label === 'Pago' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-brand-500'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{student?.name || 'Aluno não encontrado'}</h3>
                                    <p className="text-xs text-slate-500">{student?.phone}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${status.color}`}>
                                        {status.icon}
                                        {status.label}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar size={16} />
                                    <span className="text-sm">Vence: <strong>{formatDate(payment.due_date)}</strong></span>
                                </div>
                                {payment.status === 'pending' && (
                                    <button
                                        onClick={() => openEditModal(payment)}
                                        className="text-slate-400 hover:text-brand-600 p-1 rounded-full hover:bg-brand-50 transition-colors"
                                        title="Editar Cobrança"
                                    >
                                        <Edit size={16} />
                                    </button>
                                )}
                            </div>

                            {payment.amount && (
                                <div className="text-sm font-semibold text-slate-700 mb-4">
                                    Valor: R$ {payment.amount.toFixed(2)}
                                </div>
                            )}

                            <div className="flex gap-2 mt-auto">
                                {payment.status !== 'paid' && (
                                    <button
                                        onClick={() => markAsPaid(payment.id)}
                                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        Confirmar Pagamento
                                    </button>
                                )}
                                {payment.status === 'paid' && (
                                    <div className="flex-1 bg-slate-50 text-slate-400 py-2 rounded-lg text-sm font-medium text-center cursor-default">
                                        Pago em {new Date(payment.paid_at).toLocaleDateString('pt-BR')}
                                    </div>
                                )}
                                <button
                                    onClick={() => handleDeleteClick(payment.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Add Card for Students Check (Optional - Show students missing payment?) */}
                {/* 
                <div className="col-span-full mt-4">
                    <h3 className="font-bold text-slate-700 mb-2">Alunas sem cobrança neste mês:</h3>
                    {studentsWithoutPayment.length === 0 ? (
                        <p className="text-sm text-slate-400">Todas as alunas ativas possuem cobrança gerada.</p>
                    ) : (
                        <div className="flex gap-2 flex-wrap">
                            {studentsWithoutPayment.map(s => (
                                <span key={s.id} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs">
                                    {s.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div> 
                */}
            </div>

            {filteredPayments.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <DollarSign size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Nenhuma cobrança este mês</h3>
                    <p className="text-slate-500 mt-1">Clique em "Nova Cobrança" para começar.</p>
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Nova Cobrança</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="label">Aluno</label>
                                <select
                                    required
                                    className="input"
                                    value={newPaymentStudentId}
                                    onChange={e => setNewPaymentStudentId(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {studentsWithoutPayment.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                    <option disabled>--- Com cobrança já gerada ---</option>
                                    {students.filter(s => !studentsWithoutPayment.includes(s)).map(s => (
                                        <option key={s.id} value={s.id} disabled>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Data de Vencimento</label>
                                <input
                                    type="date"
                                    required
                                    className="input"
                                    value={newPaymentDate}
                                    onChange={e => setNewPaymentDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">Valor (Opcional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input pl-10"
                                        placeholder="0,00"
                                        value={newPaymentAmount}
                                        onChange={e => setNewPaymentAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="monthly_recurrence"
                                    className="w-5 h-5 rounded accent-brand-600 cursor-pointer"
                                    checked={repeatUntilEndOfYear}
                                    onChange={e => setRepeatUntilEndOfYear(e.target.checked)}
                                />
                                <label htmlFor="monthly_recurrence" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                    Repetir cobrança mensalmente até Dezembro? <br />
                                    <span className="text-xs text-slate-400 font-normal">Pula datas automaticamente se o aluno estiver de férias.</span>
                                </label>
                            </div>

                            <div className="gap-3 flex pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all transform active:scale-95"
                                >
                                    Gerar Cobrança{repeatUntilEndOfYear ? 's' : ''}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Editar Cobrança</h2>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="label">Data de Vencimento</label>
                                <input
                                    type="date"
                                    required
                                    className="input"
                                    value={editDate}
                                    onChange={e => setEditDate(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">Valor</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input pl-10"
                                        placeholder="0,00"
                                        value={editAmount}
                                        onChange={e => setEditAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <input
                                    type="checkbox"
                                    id="update_future"
                                    className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                                    checked={updateFuture}
                                    onChange={e => setUpdateFuture(e.target.checked)}
                                />
                                <label htmlFor="update_future" className="text-sm font-medium text-slate-700 cursor-pointer flex-1">
                                    Aplicar novo dia de vencimento/valor para todas as cobranças futuras?
                                </label>
                            </div>

                            <div className="gap-3 flex pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingPayment(null)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

function StatCard({ title, value, icon, bg, subtitle, trend, alert, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group ${onClick ? 'cursor-pointer active:scale-95' : ''} ${alert ? 'ring-2 ring-orange-100' : ''}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${bg} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-slate-500 font-medium text-sm mb-1 group-hover:text-brand-600 transition-colors">{title}</h3>
                <p className="text-3xl font-bold text-slate-800">{value}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}
