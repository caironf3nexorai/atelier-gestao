import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Users, Calendar, CheckCircle, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { DAYS_OF_WEEK } from '../types';

export function Dashboard() {
    const { students, classes, attendance, makeupCredits, loading } = useStore();

    // Métricas Reais
    const stats = useMemo(() => {
        const activeStudents = students.filter(s => s.active).length;

        const today = new Date();
        const weekDay = today.getDay();
        const dateStr = today.toISOString().split('T')[0];

        const classesToday = classes.filter(c => c.day_of_week === weekDay);

        // Total de alunas esperadas hoje (soma das alunas dessas turmas)
        const expectedStudentsToday = classesToday.reduce((acc, cls) => {
            return acc + students.filter(s => s.class_id === cls.id && s.active).length;
        }, 0);

        // Presenças confirmadas hoje
        const confirmedAttendance = attendance.filter(r =>
            r.date === dateStr && r.status === 'present'
        ).length;

        const pendingMakeups = makeupCredits.filter(c => !c.used_at_date).length;

        return {
            activeStudents,
            classesTodayCount: classesToday.length,
            expectedStudentsToday,
            confirmedAttendance,
            pendingMakeups
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
                    title="Alunas Ativas"
                    value={stats.activeStudents}
                    icon={<Users size={24} className="text-blue-600" />}
                    bg="bg-blue-50"
                    trend="+2 este mês" // Placeholder para futuro
                />
                <StatCard
                    title="Aulas Hoje"
                    value={stats.classesTodayCount}
                    subtitle={`${stats.expectedStudentsToday} alunas esperadas`}
                    icon={<Calendar size={24} className="text-purple-600" />}
                    bg="bg-purple-50"
                />
                <StatCard
                    title="Presenças Hoje"
                    value={stats.confirmedAttendance}
                    icon={<CheckCircle size={24} className="text-green-600" />}
                    bg="bg-green-50"
                />
                <StatCard
                    title="Reposições Pendentes"
                    value={stats.pendingMakeups}
                    icon={<AlertCircle size={24} className="text-orange-600" />}
                    bg="bg-orange-50"
                    alert={stats.pendingMakeups > 5}
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
                                            style={{ height: `${Math.min((item.count / 50) * 100, 100)}%` }} // Escala fictícia de 50 aulas/mês max
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
                            {classes.slice(0, 4).map(cls => ( // Apenas um slice simples por enquanto
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
        </div>
    );
}

function StatCard({ title, value, icon, bg, subtitle, trend, alert }: any) {
    return (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group ${alert ? 'ring-2 ring-orange-100' : ''}`}>
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
                <h3 className="text-slate-500 font-medium text-sm mb-1">{title}</h3>
                <p className="text-3xl font-bold text-slate-800">{value}</p>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}
