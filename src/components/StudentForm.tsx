import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DAYS_OF_WEEK, type Student } from '../types';

interface StudentFormProps {
    onClose: () => void;
    student?: Student | null; // Prop opcional para edição
}

export function StudentForm({ onClose, student }: StudentFormProps) {
    const { addStudent, updateStudent, classes } = useStore();

    // Inicializa com dados do aluno se estiver editando, ou vazio se for novo
    const [formData, setFormData] = useState({
        name: student?.name || '',
        age: student?.age || '' as any,
        parent_name: student?.parent_name || '',
        phone: student?.phone || '',
        class_id: student?.class_id || '',
        plan: student?.plan || '1x' as import('../types').PlanType,
        pause_start: student?.pause_period?.start_date || '',
        pause_end: student?.pause_period?.end_date || '',
        due_day: student?.due_day || 10
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const finalData: any = { ...formData, active: true };

        // Formata o objeto pause_period apenas se houver datas preenchidas
        if (formData.pause_start && formData.pause_end) {
            finalData.pause_period = {
                start_date: formData.pause_start,
                end_date: formData.pause_end
            };
        } else {
            finalData.pause_period = undefined; // Garante que limpa se tiver vazio
        }

        // Remove os campos auxiliares antes de salvar
        delete finalData.pause_start;
        delete finalData.pause_end;

        if (student) {
            updateStudent(student.id, finalData);
        } else {
            addStudent(finalData);
        }

        onClose();
    };

    // Close on Escape key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="flex-none flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">
                        {student ? 'Editar Aluno' : 'Novo Aluno'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 transition-colors"
                        title="Fechar"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="student-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Criança</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Ex: Sofia Martins"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Responsável</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Ex: Ana Martins"
                                value={formData.parent_name}
                                onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Idade</label>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="8"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Dia Vencimento</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    value={formData.due_day}
                                    onChange={e => setFormData({ ...formData, due_day: Number(e.target.value) })}
                                >
                                    {[1, 5, 10, 15, 20, 25].map(day => (
                                        <option key={day} value={day}>Dia {day}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                            <input
                                type="tel"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Ex: 11999999999"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Turma Fixa</label>
                            <select
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                value={formData.class_id}
                                onChange={e => setFormData({ ...formData, class_id: e.target.value })}
                            >
                                <option value="">Selecione uma turma...</option>
                                {classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>
                                        {DAYS_OF_WEEK[cls.day_of_week]} - {cls.time} ({cls.name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Plano de Aulas</label>
                                <div className="flex gap-4">
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer border p-3 rounded-xl hover:bg-slate-50 has-[:checked]:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:text-brand-700 transition-all font-medium text-slate-600">
                                        <input
                                            type="radio"
                                            name="plan"
                                            value="1x"
                                            checked={formData.plan === '1x'}
                                            onChange={() => setFormData({ ...formData, plan: '1x' })}
                                            className="hidden"
                                        />
                                        1x na Semana
                                    </label>
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer border p-3 rounded-xl hover:bg-slate-50 has-[:checked]:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:text-brand-700 transition-all font-medium text-slate-600">
                                        <input
                                            type="radio"
                                            name="plan"
                                            value="2x"
                                            checked={formData.plan === '2x'}
                                            onChange={() => setFormData({ ...formData, plan: '2x' })}
                                            className="hidden"
                                        />
                                        2x na Semana
                                    </label>
                                </div>
                            </div>

                            {/* Exibe Pausa APENAS se estiver editando um aluno existente */}
                            {student && (
                                <div className="col-span-2 border-t pt-4 mt-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-bold text-slate-700">Período de Pausa / Férias</label>
                                        <span className="text-xs text-slate-400 font-normal">Opcional</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Início</label>
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                                                value={formData.pause_start}
                                                onChange={e => setFormData({ ...formData, pause_start: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Fim (Retorno)</label>
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                                                value={formData.pause_end}
                                                onChange={e => setFormData({ ...formData, pause_end: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="flex-none p-6 pt-4 border-t border-slate-100 flex gap-3 bg-slate-50/50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="student-form"
                        className="flex-1 px-4 py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-200"
                    >
                        <Save size={20} />
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}
