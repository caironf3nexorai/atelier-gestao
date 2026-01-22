export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ActivityType = 'ceramica' | 'bordado' | 'pintura';

export interface ClassGroup {
    id: string;
    name: string;
    day_of_week: WeekDay;
    time: string; // "14:00"
    activity?: ActivityType; // @deprecated
    activities?: string[]; // Nova: Array de Atividades
}

export type PlanType = '1x' | '2x';

export interface Student {
    id: string;
    name: string;
    age?: number; // Agora calculado / Opcional
    birth_date?: string; // Nova: Data de Nascimento (YYYY-MM-DD)
    parent_name?: string;
    phone?: string;
    active: boolean;
    class_id?: string;
    class_id_2?: string; // Nova: Segunda Turma
    monthly_fee?: number; // Nova: Mensalidade Personalizada
    activity: ActivityType; // @deprecated
    plan?: PlanType; // 1x ou 2x
    pause_period?: {
        start_date: string;
        end_date: string;
    };
    created_at?: string;
    due_day?: number; // Nova: Dia de Vencimento
}

export const DAYS_OF_WEEK: Record<WeekDay, string> = {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado'
};

export type AttendanceStatus = 'present' | 'absent' | 'makeup';

export interface AttendanceRecord {
    id: string;
    date: string; // YYYY-MM-DD
    student_id: string;
    class_id?: string;
    status: AttendanceStatus;
    notes?: string;
}

export interface MakeupCredit {
    id: string;
    student_id: string;
    generated_from_date: string; // Data da falta
    origin_class_id?: string; // Nova: Turma de origem da falta
    used_at_date?: string; // Data da reposição
    expires_at?: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface Payment {
    id: string;
    student_id: string;
    amount?: number;
    due_date: string; // YYYY-MM-DD
    status: PaymentStatus;
    paid_at?: string;
    month_ref?: string;
}
