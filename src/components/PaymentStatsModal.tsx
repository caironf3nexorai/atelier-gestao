import { X, Check, Clock, AlertCircle } from 'lucide-react';
import type { Payment, Student } from '../types';

interface PaymentStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'total' | 'paid' | 'pending' | 'overdue';
    payments: Payment[];
    students: Student[];
    title: string;
}

export function PaymentStatsModal({ isOpen, onClose, type, payments, students, title }: PaymentStatsModalProps) {
    if (!isOpen) return null;

    const filteredPayments = payments.filter(p => {
        if (type === 'total') return true;
        if (type === 'paid') return p.status === 'paid';
        if (type === 'pending') return p.status === 'pending';
        // Overdue is a subset of pending, but strictly past due date
        const today = new Date().toISOString().split('T')[0];
        if (type === 'overdue') return p.status === 'pending' && p.due_date < today;
        return true;
    });

    const totalAmount = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    const getStatusIcon = (status: string, dueDate: string) => {
        const today = new Date().toISOString().split('T')[0];
        if (status === 'paid') return <Check size={16} className="text-green-600" />;
        if (dueDate < today) return <AlertCircle size={16} className="text-red-600" />;
        return <Clock size={16} className="text-slate-400" />;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {title}
                            <span className="bg-slate-100 text-slate-600 text-sm px-2 py-1 rounded-full">{filteredPayments.length}</span>
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Total: <strong className="text-slate-700">R$ {totalAmount.toFixed(2)}</strong>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="overflow-y-auto p-0 flex-1">
                    {filteredPayments.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <p>Nenhum pagamento encontrado nesta categoria.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aluno</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Multa/Juros</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPayments.map(payment => {
                                    const student = students.find(s => s.id === payment.student_id);
                                    return (
                                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-slate-800">{student?.name || '---'}</div>
                                                <div className="text-xs text-slate-400">{student?.phone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                {new Date(payment.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">
                                                R$ {payment.amount?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                                                -
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(payment.status, payment.due_date)}
                                                    <span className={`text-sm ${payment.status === 'paid' ? 'text-green-600' :
                                                        payment.status === 'pending' && payment.due_date < new Date().toISOString().split('T')[0] ? 'text-red-600' :
                                                            'text-slate-500'
                                                        }`}>
                                                        {payment.status === 'paid' ? 'Pago' :
                                                            payment.status === 'pending' && payment.due_date < new Date().toISOString().split('T')[0] ? 'Atrasado' :
                                                                'Pendente'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl text-center text-xs text-slate-400">
                    Listagem de pagamentos referente ao período selecionado.
                </div>
            </div>
        </div>
    );
}
