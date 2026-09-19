import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { apiClient } from '../api/client';
import type { CreateTaskRequest } from '../types';

const CATEGORIES = ['repair', 'delivery', 'cleaning', 'moving', 'other'];
const URGENCY_OPTIONS = ['today', 'week', 'flexible'];

export function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    category: 'other',
    price: 0,
    urgency: 'flexible',
    latitude: 55.7558,
    longitude: 37.6173,
    address_name: '',
  });

  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  if (latParam && lngParam) {
    formData.latitude = parseFloat(latParam);
    formData.longitude = parseFloat(lngParam);
  }

  const updateField = (key: keyof CreateTaskRequest, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/tasks', formData);
      navigate('/map');
    } catch (err) {
      setError('Не удалось создать задачу');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/map')}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Назад к карте
          </button>
          <h1 className="text-2xl font-bold mt-2">Создать задачу</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-8 space-y-6 bg-white rounded-xl shadow-sm">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название задачи</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
            <select
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Цена (₽)</label>
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => updateField('price', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Срочность</label>
          <select
            value={formData.urgency}
            onChange={(e) => updateField('urgency', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {URGENCY_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Адрес / место выполнения</label>
          <input
            type="text"
            value={formData.address_name}
            onChange={(e) => updateField('address_name', e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Например: Москва, ул. Примерная, 10"
            required
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500 mb-2">
            Выбранная точка на карте: <span className="text-gray-900 font-medium">{formData.address_name || 'Местоположение будет выбрано на карте'}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Выбрать точку на карте
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Создание...' : 'Опубликовать задачу'}
        </button>
      </form>
    </div>
  );
}
