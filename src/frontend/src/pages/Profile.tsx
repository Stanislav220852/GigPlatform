import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { apiClient } from '../api/client';

export function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<User | null>(user);

  useEffect(() => {
    if (user) setFormData(user);
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiClient.put('/users/me', {
        full_name: formData?.full_name,
        phone: formData?.phone,
      });
      await refreshUser();
      setEditing(false);
    } catch (err) {
      setError('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  }

  if (!user || !formData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/map')} className="text-sm text-gray-500 hover:text-gray-900">
            ← Назад
          </button>
          <button
            onClick={() => navigate('/tasks/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Создать задачу
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=0D8ABC&color=fff&size=128`}
              alt="Profile"
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h1 className="text-2xl font-bold">{user.full_name}</h1>
              <p className="text-gray-500">{user.email}</p>
              <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                user.role === 'contractor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {user.role === 'contractor' ? 'Исполнитель' : 'Клиент'}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Полное имя</label>
              <input
                type="text"
                value={formData.full_name}
                disabled={!editing}
                onChange={(e) => setFormData(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                type="tel"
                value={formData.phone}
                disabled={!editing}
                onChange={(e) => setFormData(prev => prev ? { ...prev, phone: e.target.value } : null)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Рейтинг</label>
              <input
                type="text"
                value={user.rating}
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div className="flex gap-3 pt-4">
              {editing ? (
                <>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Редактировать
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Выйти
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}