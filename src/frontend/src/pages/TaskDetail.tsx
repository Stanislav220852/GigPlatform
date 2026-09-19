import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Task, TaskProposal, CreateProposalRequest } from '../types';
import type { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);

  async function loadTask() {
    setLoading(true);
    setError(null);
    try {
      const taskData = await apiClient.get<Task>(`/tasks/${id}`);
      setTask(taskData);

      const proposalsData = await apiClient.get<TaskProposal[]>(`/tasks/${id}/proposals`);
      setProposals(proposalsData);
    } catch (err) {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTask();
  }, [id]);

  async function handleAcceptProposal(proposalId: string) {
    try {
      await apiClient.post(`/proposals/${proposalId}/accept`, {});
      await loadTask();
    } catch (err) {
      setError('Не удалось принять отклик');
    }
  }

  async function handleCreateProposal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setShowProposalForm(false);
    setProposalLoading(true);

    try {
      await apiClient.post(`/tasks/${id}/proposals`, {
        offered_price: parseFloat(formData.get('offered_price') as string),
        eta_minutes: parseInt(formData.get('eta_minutes') as string),
        cover_letter: (formData.get('cover_letter') as string) || undefined,
      } as CreateProposalRequest);
      await loadTask();
    } catch (err) {
      setError('Не удалось отправить отклик');
      setShowProposalForm(true);
    } finally {
      setProposalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Загрузка задачи...</div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">{error || 'Задача не найдена'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button onClick={() => navigate('/map')} className="text-sm text-gray-500 hover:text-gray-900">
            ← Назад к карте
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                task.status === 'open' ? 'bg-green-100 text-green-800' :
                task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {task.status}
              </span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{task.price} ₽</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <span className="text-gray-500">Категория:</span>{' '}
              <span className="font-medium">{task.category}</span>
            </div>
            <div>
              <span className="text-gray-500">Срочность:</span>{' '}
              <span className="font-medium">{task.urgency}</span>
            </div>
            <div>
              <span className="text-gray-500">Адрес:</span>{' '}
              <span className="font-medium">{task.address_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Создана:</span>{' '}
              <span className="font-medium">{new Date(task.created_at).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-lg mb-2">Описание</h3>
            <p className="text-gray-700 leading-relaxed">{task.description}</p>
          </div>

          {task.location && (
            <div className="mt-6">
              <button
                onClick={() => navigate(`/tasks/${task.id}/map`)}
                className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-300 transition"
              >
                <span>Посмотреть на карте</span>
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Отклики ({proposals.length})</h2>
            {task.status === 'open' && user?.role === 'contractor' && (
              <button
                onClick={() => setShowProposalForm(!showProposalForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Оставить отклик
              </button>
            )}
          </div>

          {showProposalForm && (
            <form onSubmit={handleCreateProposal} className="mb-6 bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Цена (₽)</label>
                  <input
                    name="offered_price"
                    type="number"
                    min="0"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ETA (мин)</label>
                  <input
                    name="eta_minutes"
                    type="number"
                    min="1"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Сообщение</label>
                <textarea
                  name="cover_letter"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={proposalLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {proposalLoading ? 'Отправка...' : 'Отправить отклик'}
              </button>
            </form>
          )}

          {proposals.length === 0 && (
            <p className="text-gray-500">Откликов пока нет.</p>
          )}

          {proposals.map((proposal) => (
            <div key={proposal.id} className="border-b last:border-0 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{proposal.contractor?.full_name || 'Неизвестный'}</div>
                  <div className="text-sm text-gray-500">
                    {proposal.offered_price} ₽ • {proposal.eta_minutes} мин
                  </div>
                  {proposal.cover_letter && (
                    <div className="text-sm mt-1">{proposal.cover_letter}</div>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  proposal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {proposal.status === 'pending' ? 'На рассмотрении' :
                   proposal.status === 'accepted' ? 'Принят' : 'Отклонён'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
