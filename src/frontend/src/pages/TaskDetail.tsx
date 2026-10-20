import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Task, TaskProposal, CreateProposalRequest, ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORIES, URGENCY_LABELS } from '../utils/categories';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  CheckCircle2,
  Calendar,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Send,
  Check,
  Phone,
  UserCheck,
  XCircle,
  ShieldCheck,
  X
} from 'lucide-react';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Модальные окна
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeRating, setCompleteRating] = useState(5);
  const [completeReview, setCompleteReview] = useState('');
  const [completingLoading, setCompletingLoading] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingLoading, setCancellingLoading] = useState(false);

  // Чат сообщений
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<ChatMessage[]>(`/chat/${id}/messages`);
      setMessages(data);
    } catch {
      // Игнорируем ошибку загрузки чата
    }
  }, [id]);

  const loadTask = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const taskData = await api.get<Task>(`/tasks/${id}`);
      setTask(taskData);

      const proposalsData = await api.get<TaskProposal[]>('/bids', { task_id: id });
      setProposals(proposalsData);
    } catch {
      setError('Не удалось загрузить данные задачи');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
    loadMessages();
    const interval = setInterval(() => {
      loadMessages();
    }, 6000);
    return () => clearInterval(interval);
  }, [loadTask, loadMessages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newMessageText.trim() || sendingMessage) return;
    const textToSend = newMessageText.trim();
    setSendingMessage(true);
    try {
      await api.post(`/chat/${id}/messages`, { message_text: textToSend });
      setNewMessageText('');
      await loadMessages();
    } catch {
      setError('Не удалось отправить сообщение');
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleAcceptProposal(proposalId: string) {
    setAcceptingId(proposalId);
    setError(null);
    try {
      await api.put(`/bids/${proposalId}`, { status: 'accepted' });
      setActionSuccess('Исполнитель успешно назначен! Задание переведено в статус «В работе».');
      await loadTask();
    } catch {
      setError('Не удалось принять отклик');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleCreateProposal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    const formData = new FormData(e.currentTarget);
    setProposalLoading(true);
    setError(null);

    try {
      const proposalPayload: CreateProposalRequest & { task_id: string } = {
        task_id: id,
        offered_price: parseFloat(formData.get('offered_price') as string),
        eta_minutes: parseInt(formData.get('eta_minutes') as string, 10),
        cover_letter: (formData.get('cover_letter') as string) || undefined,
      };
      await api.post('/bids', proposalPayload);
      setShowProposalForm(false);
      setActionSuccess('Ваш отклик успешно отправлен заказчику!');
      await loadTask();
    } catch {
      setError('Не удалось отправить отклик');
    } finally {
      setProposalLoading(false);
    }
  }

  async function handleCompleteTask() {
    if (!id) return;
    setCompletingLoading(true);
    setError(null);
    try {
      await api.post(`/tasks/${id}/complete`, {
        rating: completeRating,
        review: completeReview || undefined,
      });
      setShowCompleteModal(false);
      setActionSuccess('Задание успешно завершено! Спасибо за вашу оценку.');
      await loadTask();
    } catch {
      setError('Не удалось завершить задание');
    } finally {
      setCompletingLoading(false);
    }
  }

  async function handleCancelTask() {
    if (!id) return;
    setCancellingLoading(true);
    setError(null);
    try {
      await api.post(`/tasks/${id}/cancel`, {});
      setShowCancelModal(false);
      setActionSuccess('Задание отменено.');
      await loadTask();
    } catch {
      setError('Не удалось отменить задание');
    } finally {
      setCancellingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-semibold text-slate-500">Загрузка задания...</div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">{error || 'Задание не найдено'}</h2>
          <p className="text-xs text-slate-500 mb-6">Возможно, оно было удалено или перемещено.</p>
          <Link
            to="/map"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Вернуться на карту
          </Link>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const catMeta = CATEGORIES[task.category] || CATEGORIES.other;
  const urgencyMeta = URGENCY_LABELS[task.urgency] || URGENCY_LABELS.flexible;
  const isAuthor = user?.id === task.client_id;
  const isInProgress = task.status === 'in_progress' || task.status === 'in-progress';
  const isCompleted = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';
  const isOpen = task.status === 'open';

  // Проверка: оставлял ли текущий пользователь-исполнитель уже отклик?
  const myProposal = user?.role === 'contractor' 
    ? proposals.find(p => p.contractor_id === user.id) 
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Шапка */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-xs flex items-center">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад к карте</span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isOpen
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isInProgress
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : isCompleted
                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              {isOpen && 'Поиск мастера'}
              {isInProgress && 'В процессе'}
              {isCompleted && 'Завершено'}
              {isCancelled && 'Отменено'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Уведомления об успехе или ошибке */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-700 hover:text-rose-900 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Визуальный Stepper (Жизненный цикл задания) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
            Этап выполнения
          </div>
          <div className="relative flex items-center justify-between">
            {/* Соединительная линия */}
            <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-100 -z-0" />
            <div
              className={`absolute top-1/2 left-6 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-500 -z-0 ${
                isOpen ? 'w-0' : isInProgress ? 'w-1/2' : isCompleted ? 'w-[calc(100%-3rem)]' : 'w-0'
              }`}
            />

            {/* Шаг 1 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs transition-all ${
                  isOpen
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-105'
                    : isInProgress || isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isInProgress || isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Поиск</span>
              <span className="text-[10px] text-slate-400 hidden sm:block">Сбор предложений</span>
            </div>

            {/* Шаг 2 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs transition-all ${
                  isInProgress
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-105'
                    : isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">В работе</span>
              <span className="text-[10px] text-slate-400 hidden sm:block">Выполнение заказа</span>
            </div>

            {/* Шаг 3 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shadow-xs transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-105'
                    : isCancelled
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                ) : isCancelled ? (
                  <X className="w-4 h-4 stroke-[3]" />
                ) : (
                  '3'
                )}
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">
                {isCancelled ? 'Отменено' : 'Завершено'}
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                {isCancelled ? 'Заказ закрыт' : 'Оплата и отзыв'}
              </span>
            </div>
          </div>
        </div>

        {/* Назначенный исполнитель (если статус в работе или завершено) */}
        {(isInProgress || isCompleted) && (
          <div className="bg-gradient-to-br from-blue-500/10 via-white to-indigo-500/10 rounded-3xl border border-blue-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20 shrink-0">
                  {task.assigned_contractor?.full_name?.charAt(0) || 'М'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Назначенный исполнитель
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[11px] font-bold border border-amber-200">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {task.assigned_contractor?.rating ? task.assigned_contractor.rating.toFixed(1) : '5.0'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    {task.assigned_contractor?.full_name || 'Мастер'}
                  </h3>
                  {task.assigned_contractor?.phone && (
                    <a
                      href={`tel:${task.assigned_contractor.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition mt-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {task.assigned_contractor.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Кнопка завершения задачи для Заказчика */}
              {isAuthor && isInProgress && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Завершить задание и оценить</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Карточка задачи */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${catMeta.badgeBg} ${catMeta.badgeText}`}
                >
                  {catMeta.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${urgencyMeta.color}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {urgencyMeta.label}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {task.title}
              </h1>
            </div>

            <div className="sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl">
              <span className="text-xs text-slate-500 font-semibold block mb-0.5">
                Предлагаемый бюджет
              </span>
              <span className="text-3xl font-black text-emerald-600 tracking-tight">
                {task.price > 0 ? `${task.price.toLocaleString()} ₽` : 'По договор.'}
              </span>
            </div>
          </div>

          {/* Параметры */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-slate-100 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Адрес выполнения
                </div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {task.address_name}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                  Опубликовано
                </div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {new Date(task.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Автор задачи */}
          {task.client && (
            <div className="py-4 border-b border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                  {task.client.full_name?.charAt(0) || 'З'}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Заказчик</div>
                  <div className="font-bold text-slate-900">{task.client.full_name}</div>
                </div>
              </div>
              {task.client.phone && (isInProgress || isCompleted || isAuthor) && (
                <a
                  href={`tel:${task.client.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>{task.client.phone}</span>
                </a>
              )}
            </div>
          )}

          {/* Описание */}
          <div className="pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Описание задания
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
              {task.description}
            </p>
          </div>

          {/* Действия автора для открытого задания */}
          {isAuthor && isOpen && (
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Отменить задание</span>
              </button>
            </div>
          )}
        </div>

        {/* Чат по заданию */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Чат по заданию
              </h2>
              <p className="text-xs text-slate-500">
                Обсуждайте детали заказа, адрес, время и ход выполнения
              </p>
            </div>
            <button
              type="button"
              onClick={loadMessages}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
            >
              Обновить
            </button>
          </div>

          {/* Список сообщений */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/70 p-4 min-h-[160px] max-h-80 overflow-y-auto space-y-3 mb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center text-slate-400">
                <MessageSquare className="w-7 h-7 mb-1.5 opacity-40" />
                <span className="text-xs font-medium">Сообщений пока нет</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Напишите первое сообщение, чтобы согласовать детали
                </span>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-bold text-slate-600">
                        {isMe ? 'Вы' : msg.sender?.full_name || 'Собеседник'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-sm sm:max-w-md shadow-2xs ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {msg.message_text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Поле ввода сообщения */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Напишите сообщение..."
              disabled={sendingMessage}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button
              type="submit"
              disabled={sendingMessage || !newMessageText.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Отправить</span>
            </button>
          </form>
        </div>

        {/* Секция откликов */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Отклики исполнителей
              </h2>
              <p className="text-xs text-slate-500">
                Всего предложений: {proposals.length}
              </p>
            </div>

            {isOpen && !isAuthor && user?.role === 'contractor' && !myProposal && (
              <button
                type="button"
                onClick={() => setShowProposalForm(!showProposalForm)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{showProposalForm ? 'Скрыть форму' : 'Предложить услуги'}</span>
              </button>
            )}

            {myProposal && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                Вы уже откликнулись ({myProposal.offered_price} ₽)
              </span>
            )}
          </div>

          {/* Форма отклика */}
          {showProposalForm && (
            <form
              onSubmit={handleCreateProposal}
              className="mb-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-200/70 space-y-4"
            >
              <h3 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Ваш отклик на задание
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ваша цена (₽)
                  </label>
                  <input
                    name="offered_price"
                    type="number"
                    min="0"
                    defaultValue={task.price}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Через сколько будете на месте (мин)
                  </label>
                  <input
                    name="eta_minutes"
                    type="number"
                    min="5"
                    defaultValue={30}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Сопроводительное сообщение
                </label>
                <textarea
                  name="cover_letter"
                  rows={3}
                  placeholder="Опишите ваш опыт, инструмент, когда готовы подъехать..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={proposalLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {proposalLoading ? 'Отправляем предложение...' : 'Отправить предложение клиенту'}
              </button>
            </form>
          )}

          {proposals.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Откликов пока нет</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Исполнители скоро увидят вашу задачу на карте и отправят предложения.
              </p>
            </div>
          )}

          {/* Список предложений */}
          <div className="space-y-3">
            {proposals.map((proposal) => {
              const isAccepted = proposal.status === 'accepted';
              return (
                <div
                  key={proposal.id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isAccepted
                      ? 'border-emerald-300 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {proposal.contractor?.full_name || 'Исполнитель'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[11px] font-bold border border-amber-200">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {proposal.contractor?.rating
                          ? proposal.contractor.rating.toFixed(1)
                          : '5.0'}
                      </span>

                      {isAccepted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Выбран исполнителем
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-bold text-emerald-600 text-sm">
                        {proposal.offered_price.toLocaleString()} ₽
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Прибудет через ~{proposal.eta_minutes} мин
                      </span>
                    </div>

                    {proposal.cover_letter && (
                      <p className="text-xs text-slate-600 pt-1 italic">
                        «{proposal.cover_letter}»
                      </p>
                    )}
                  </div>

                  {isAuthor && isOpen && proposal.status === 'pending' && (
                    <button
                      type="button"
                      disabled={acceptingId === proposal.id}
                      onClick={() => handleAcceptProposal(proposal.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {acceptingId === proposal.id ? 'Принимаем...' : 'Выбрать исполнителя'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Модальное окно завершения задачи и выставления оценки */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Завершение работы
              </h3>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-4">
              <p className="text-xs text-slate-600">
                Подтвердите, что работа мастера выполнена в полном объеме. Поставьте оценку за качество оказанных услуг:
              </p>

              {/* Звездный рейтинг */}
              <div className="flex items-center justify-center gap-2 py-3 bg-amber-50/60 rounded-2xl border border-amber-200/60">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCompleteRating(star)}
                    className="p-1 focus:outline-none transition hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= completeRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Отзыв о работе (необязательно)
                </label>
                <textarea
                  rows={3}
                  value={completeReview}
                  onChange={(e) => setCompleteReview(e.target.value)}
                  placeholder="Мастер приехал вовремя, сделал всё быстро и аккуратно..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={completingLoading}
                onClick={handleCompleteTask}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {completingLoading ? 'Завершаем...' : 'Подтвердить и завершить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения отмены задания */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center mb-1">
              Отменить задание?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Задание перестанет отображаться на карте для мастеров и перейдет в архив.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition text-center"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={cancellingLoading}
                onClick={handleCancelTask}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 text-center"
              >
                {cancellingLoading ? 'Отменяем...' : 'Да, отменить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
