import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORIES, URGENCY_LABELS } from '../utils/categories';
import {
  Compass,
  Plus,
  Briefcase,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function MyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Фильтры
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'cancelled'>('all');

  const loadMyTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Запрашиваем задачи пользователя
      const data = await api.get<Task[]>('/tasks/my');
      setTasks(data);
    } catch {
      setError('Не удалось загрузить ваши задания');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyTasks();
  }, [loadMyTasks]);

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return t.status === 'open';
    if (activeTab === 'in_progress') return t.status === 'in_progress' || t.status === 'in-progress';
    if (activeTab === 'completed') return t.status === 'completed';
    if (activeTab === 'cancelled') return t.status === 'cancelled';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Ищет мастера
          </span>
        );
      case 'in_progress':
      case 'in-progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            В работе
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-purple-600" />
            Завершено
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
            Отменено
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Шапка */}
      <header className="h-16 px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/map" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition">
                GigPlatform
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Мои задания
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-xs font-bold">
            <Link
              to="/map"
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              Карта заданий
            </Link>
            <Link
              to="/my-tasks"
              className="px-3 py-1.5 text-blue-600 bg-blue-50 rounded-lg transition"
            >
              Мои задания
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/tasks/create"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Создать заказ</span>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-2 p-1.5 pl-3 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50 transition shadow-2xs group"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {user?.full_name || 'Профиль'}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">
                {user?.role === 'contractor' ? 'Исполнитель' : 'Заказчик'}
              </div>
            </div>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'U')}&background=2563EB&color=fff&bold=true`}
              alt="Avatar"
              className="w-8 h-8 rounded-lg shadow-2xs group-hover:ring-2 group-hover:ring-blue-500/30 transition"
            />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {/* Заголовок страницы и табы */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {user?.role === 'contractor' ? 'Мои проекты и отклики' : 'Мои заказы'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Управляйте ходом выполнения заданий, откликами и историей
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-2xl text-xs font-bold self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'open'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ищут ({tasks.filter((t) => t.status === 'open').length})
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'in_progress'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              В работе ({tasks.filter((t) => t.status === 'in_progress' || t.status === 'in-progress').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'completed'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Завершены ({tasks.filter((t) => t.status === 'completed').length})
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Индикатор загрузки */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-semibold text-slate-400">Загружаем список заданий...</div>
          </div>
        )}

        {/* Пустой список */}
        {!loading && filteredTasks.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              В этом разделе пока нет заданий
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              {user?.role === 'contractor'
                ? 'Найдите подходящие заказы на карте и отправьте отклик клиентам.'
                : 'Опубликуйте новое задание, и проверенные мастера предложат вам помощь.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/map"
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Открыть карту
              </Link>
              <Link
                to="/tasks/create"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20"
              >
                Создать задание
              </Link>
            </div>
          </div>
        )}

        {/* Список карточек */}
        {!loading && filteredTasks.length > 0 && (
          <div className="space-y-3">
            {filteredTasks.map((t) => {
              const catMeta = CATEGORIES[t.category] || CATEGORIES.other;
              const urgencyMeta = URGENCY_LABELS[t.urgency] || URGENCY_LABELS.flexible;
              const isOwner = user?.id === t.client_id;

              return (
                <Link
                  key={t.id}
                  to={`/tasks/${t.id}`}
                  className="block bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400/80 p-5 shadow-xs hover:shadow-md transition group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(t.status)}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${catMeta.badgeBg} ${catMeta.badgeText}`}
                        >
                          {catMeta.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${urgencyMeta.color}`}
                        >
                          <Clock className="w-3 h-3" />
                          {urgencyMeta.label}
                        </span>
                        {isOwner ? (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            Мой заказ
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            Взят в работу
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition truncate">
                        {t.title}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{t.address_name}</span>
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(t.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                      <div className="text-lg font-black text-emerald-600">
                        {t.price > 0 ? `${t.price.toLocaleString()} ₽` : 'По договор.'}
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition mt-1">
                        <span>Подробнее</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
