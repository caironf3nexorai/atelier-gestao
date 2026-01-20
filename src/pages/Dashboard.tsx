import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Users, Calendar, CheckCircle, AlertCircle, TrendingUp, Clock, X } from 'lucide-react';
import { DAYS_OF_WEEK } from '../types';

type MetricType = 'active' | 'classes' | 'attendance' | 'makeups' | null;

export function Dashboard() {
    const { students, classes, attendance, makeupCredits, loading } = useStore();
    const [activeModal, setActiveModal] = useState<MetricType>(null);

    // Métricas Reais e Listas Detalhadas
    const data = useMemo(() => {
        const activeStudentsList = students.filter(s => s.active);

        const today = new Date();
        const weekDay = today.getDay();
        const dateStr = today.toISOString().split('T')[0];

        const classesTodayList = classes.filter(c => c.day_of_week === weekDay);

        // Alunas esperadas hoje
        const expectedStudentsToday = classesTodayList.reduce((acc, cls) => {
            return acc + students.filter(s => s.class_id === cls.id && s.active).length;
        }, 0);

        // Presenças confirmadas hoje (com dados da aluna)
        const confirmedAttendanceList = attendance
            .filter(r => r.date === dateStr && r.status === 'present')
            .map(r => {
                const student = students.find(s => s.id === r.student_id);
                const cls = classes.find(c => c.id === r.class_id);
                return { ...r, studentName: student?.name, className: cls?.name, time: cls?.time };
            });

        // Reposições pendentes (com dados da aluna)
        const pendingMakeupsList = makeupCredits
            .filter(c => !c.used_at_date)
            .map(c => {
                const student = students.find(s => s.id === c.student_id);
                return { ...c, studentName: student?.name };
            });

        return {
            activeStudents: {
                count: activeStudentsList.length,
                list: activeStudentsList
            },
            classesToday: {
                count: classesTodayList.length,
                list: classesTodayList,
                expected: expectedStudentsToday
            },
            confirmedAttendance: {
                count: confirmedAttendanceList.length,
                list: confirmedAttendanceList
            },
            pendingMakeups: {
                count: pendingMakeupsList.length,
                list: pendingMakeupsList
            }
        };
    }, [students, classes, attendance, makeupCredits]);

    // Histórico Simplificado (Últimos 6 meses)
    const monthlyHistory = useMemo(() => {
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            return d.toISOString().slice(0, 7); // YYYY-MM
        });

        return last6Months.map(month => {
            const count = attendance.filter(r =>
                r.date.startsWith(month) && r.status === 'present'
            ).length;
            const [year, m] = month.split('-');
            const label = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString('pt-BR', { month: 'short' });
            return { label, count };
        });
    }, [attendance]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-bold text-slate-800">Olá, Professora! 👋</h1>
                <p className="text-slate-500 mt-1">Aqui está o resumo do seu ateliê hoje.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Alunos Ativos"
                    value={data.activeStudents.count}
                    icon={<Users size={24} className="text-blue-600" />}
                    bg="bg-blue-50"
                    onClick={() => setActiveModal('active')}
                />
                <StatCard
                    title="Aulas Hoje"
                    value={data.classesToday.count}
                    subtitle={`${data.classesToday.expected} alunos esperados`}
                    icon={<Calendar size={24} className="text-purple-600" />}
                    bg="bg-purple-50"
                    onClick={() => setActiveModal('classes')}
                />
                <StatCard
                    title="Presenças Hoje"
                    value={data.confirmedAttendance.count}
                    icon={<CheckCircle size={24} className="text-green-600" />}
                    bg="bg-green-50"
                    onClick={() => setActiveModal('attendance')}
                />
                <StatCard
                    title="Reposições Pendentes"
                    value={data.pendingMakeups.count}
                    icon={<AlertCircle size={24} className="text-orange-600" />}
                    bg="bg-orange-50"
                    alert={data.pendingMakeups.count > 5}
                    onClick={() => setActiveModal('makeups')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content - Left */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Gráfico de Frequência */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={20} className="text-brand-600" />
                                Frequência Mensal
                            </h3>
                        </div>
                        <div className="h-48 flex items-end justify-between gap-4 px-2">
                            {monthlyHistory.map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                                    <div className="relative w-full bg-slate-100 rounded-t-lg h-32 overflow-hidden">
                                        <div
                                            className="absolute bottom-0 w-full bg-brand-500 group-hover:bg-brand-400 transition-all duration-500 rounded-t-lg"
                                            style={{ height: `${Math.min((item.count / 50) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500 uppercase">{item.label}</span>
                                    <div className="opacity-0 group-hover:opacity-100 absolute -mt-8 bg-slate-800 text-white text-xs py-1 px-2 rounded transition-opacity">
                                        {item.count} aulas
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Right */}
                <div className="space-y-6">
                    {/* Próximas Turmas */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-slate-400" />
                            Próximas Turmas
                        </h3>
                        <div className="space-y-4">
                            {classes.slice(0, 4).map(cls => (
                                <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                                    <div className={`w-2 h-12 rounded-full ${cls.day_of_week === new Date().getDay() ? 'bg-green-500' : 'bg-slate-300'
                                        }`}></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-700">{cls.name}</h4>
                                        <p className="text-xs text-slate-500 font-medium">{DAYS_OF_WEEK[cls.day_of_week]} às {cls.time}</p>
                                    </div>
                                </div>
                            ))}
                            {classes.length === 0 && <p className="text-slate-400 text-sm">Nenhuma turma cadastrada.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {activeModal === 'active' && 'Alunos Ativos'}
                                {activeModal === 'classes' && 'Aulas Hoje'}
                                {activeModal === 'attendance' && 'Presenças Confirmadas'}
                                {activeModal === 'makeups' && 'Reposições Pendentes'}
                            </h3>
                            <button
                                onClick={() => setActiveModal(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4">
                            {activeModal === 'active' && (
                                <ul className="space-y-2">
                                    {data.activeStudents.list.map(s => (
                                        <li key={s.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-700">{s.name}</p>
                                                <p className="text-xs text-slate-500">{s.phone || 'Sem telefone'}</p>
                                            </div>
                                            <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200">
                                                {classes.find(c => c.id === s.class_id)?.name || 'Sem turma'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {activeModal === 'classes' && (
                                <ul className="space-y-2">
                                    {data.classesToday.list.map(c => (
                                        <li key={c.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-700">{c.name}</p>
                                                <p className="text-xs text-slate-500">{c.time}</p>
                                            </div>
                                            <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-brand-600">
                                                {students.filter(s => s.class_id === c.id && s.active).length} alunos
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {activeModal === 'attendance' && (
                                <ul className="space-y-2">
                                    {data.confirmedAttendance.list.length > 0 ? data.confirmedAttendance.list.map((r, i) => (
                                        <li key={i} className="p-3 bg-green-50 rounded-xl flex justify-between items-center border border-green-100">
                                            <div>
                                                <p className="font-bold text-slate-700">{r.studentName || 'Aluno(a) Removido(a)'}</p>
                                                <p className="text-xs text-green-700 font-medium">Presente</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-600">{r.className}</p>
                                                <p className="text-[10px] text-slate-400">{r.time}</p>
                                            </div>
                                        </li>
                                    )) : <p className="text-center text-slate-400 py-4">Nenhuma presença confirmada ainda.</p>}
                                </ul>
                            )}
                            {activeModal === 'makeups' && (
                                <ul className="space-y-2">
                                    {data.pendingMakeups.list.length > 0 ? data.pendingMakeups.list.map((c, i) => (
                                        <li key={i} className="p-3 bg-orange-50 rounded-xl flex justify-between items-center border border-orange-100">
                                            <div>
                                                <p className="font-bold text-slate-700">{c.studentName || 'Aluno(a) Removido(a)'}</p>
                                                <p className="text-xs text-orange-700">Falta em: {new Date(c.generated_from_date).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-orange-200 text-orange-600">
                                                1 Crédito
                                            </span>
                                        </li>
                                    )) : <p className="text-center text-slate-400 py-4">Nenhuma reposição pendente.</p>}
                                </ul>
                            )}
                        </div>
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
            className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group cursor-pointer active:scale-95 ${alert ? 'ring-2 ring-orange-100' : ''}`}
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
