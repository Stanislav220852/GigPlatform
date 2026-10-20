import type React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import type { User } from '../types';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Star,
  LogOut,
  Edit3,
  Check,
  X,
  Plus,
  AlertCircle,
  Wrench,
  Award,
  CheckCircle2,
  FileText
} from 'lucide-react';

export function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<User | null>(user);

  // Поля мастера
  const [bio, setBio] = useState(user?.contractor_profile?.bio || '');
  const [hasOwnTools, setHasOwnTools] = useState(user?.contractor_profile?.has_own_tools || false);

  useEffect(() => {
    if (user) {
      setFormData(user);
      setBio(user.contractor_profile?.bio || '');
      setHasOwnTools(user.contractor_profile?.has_own_tools || false);
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.put('/users/me', {
        full_name: formData?.full_name,
        phone: formData?.phone,
      });

      if (user?.role === 'contractor') {
        await api.put('/users/me/contractor-profile', {
          bio,
          has_own_tools: hasOwnTools,
        });
      }

      await refreshUser();
      setEditing(false);
      setSuccessMessage('Профиль успешно обновлен!');
    } catch {
      setError('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  }

  if (!user || !formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-semibold text-slate-500">Загрузка профиля...</div>
      </div>
    );
  }

  const isContractor = user.role === 'contractor';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-xs flex items-center">
        <div className="max-w-3xl mx-auto w-full px-6 flex items-center justify-between">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Вернуться на карту</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/my-tasks"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs transition"
            >
              <span>Мои задания</span>
            </Link>
            <Link
              to="/tasks/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Создать заказ</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8">
          {/* Аватар и имя */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100 text-center sm:text-left">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=2563EB&color=fff&size=160&bold=true`}
              alt="Avatar"
              className="w-20 h-20 rounded-2xl shadow-md border-2 border-white ring-2 ring-blue-500/20"
            />
            <div className="flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {user.full_name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isContractor
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {isContractor ? 'Исполнитель' : 'Заказчик'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{user.email}</p>

              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-700 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Рейтинг: {user.rating ? user.rating.toFixed(1) : '5.0'}</span>
                </div>

                {isContractor && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-50 border border-violet-200/70 text-violet-700 text-xs font-bold">
                    <Award className="w-3.5 h-3.5 text-violet-600" />
                    <span>
                      Выполнено: {user.contractor_profile?.completed_tasks_count || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {successMessage && (
            <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900"
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Форма данных пользователя */}
          <form onSubmit={handleSave} className="space-y-4 pt-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Имя и Фамилия
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.full_name}
                  disabled={!editing}
                  onChange={(e) =>
                    setFormData((prev) => (prev ? { ...prev, full_name: e.target.value } : null))
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Электронная почта
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Номер телефона
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  disabled={!editing}
                  onChange={(e) =>
                    setFormData((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed transition"
                />
              </div>
            </div>

            {/* Дополнительные параметры мастера */}
            {isContractor && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                  <span>Параметры мастера</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Опыт и специализация
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    disabled={!editing}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Опишите ваши навыки, образование, опыт выполнения аналогичных заказов..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed transition"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <input
                    type="checkbox"
                    id="hasOwnTools"
                    checked={hasOwnTools}
                    disabled={!editing}
                    onChange={(e) => setHasOwnTools(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 disabled:opacity-60 cursor-pointer"
                  />
                  <label
                    htmlFor="hasOwnTools"
                    className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                  >
                    Есть собственный профессиональный инструмент и оборудование
                  </label>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100">
              {editing ? (
                <>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFormData(user);
                      setBio(user.contractor_profile?.bio || '');
                      setHasOwnTools(user.contractor_profile?.has_own_tools || false);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Отмена</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Редактировать профиль</span>
                </button>
              )}

              <button
                type="button"
                onClick={logout}
                className="w-full sm:w-auto sm:ml-auto px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs border border-rose-200/60 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти из аккаунта</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
