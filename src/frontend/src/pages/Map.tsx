import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { CATEGORIES, URGENCY_LABELS } from '../utils/categories';
import {
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Compass,
  RefreshCw,
  X,
  Clock,
  Sparkles,
  Wrench,
  Package,
  Truck,
  Layers,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

declare global {
  interface Window {
    ymaps?: any;
  }
}

export function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const collectionRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const hasFittedBounds = useRef<boolean>(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Дебаунс поисковой строки для моментального отклика ввода
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 180);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<Task[]>('/tasks');
      setTasks(result);
    } catch {
      setError('Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }, []);

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'repair': return <Wrench className="w-3.5 h-3.5" />;
      case 'delivery': return <Package className="w-3.5 h-3.5" />;
      case 'cleaning': return <Sparkles className="w-3.5 h-3.5" />;
      case 'moving': return <Truck className="w-3.5 h-3.5" />;
      default: return <Layers className="w-3.5 h-3.5" />;
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
      const q = debouncedQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        (task.address_name && task.address_name.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [tasks, selectedCategory, debouncedQuery]);

  // Быстрый рендер меток через GeoObjectCollection
  const renderMarkers = useCallback((tasksToRender: Task[], map: any) => {
    if (!map || !window.ymaps) return;

    const ymaps = window.ymaps;

    if (collectionRef.current) {
      map.geoObjects.remove(collectionRef.current);
      collectionRef.current.removeAll();
    }

    const collection = new ymaps.GeoObjectCollection(null, {});

    tasksToRender.forEach((task) => {
      const lat = task.location?.lat != null ? Number(task.location.lat) : 53.9045;
      const lng = task.location?.lng != null ? Number(task.location.lng) : 27.5615;

      const catMeta = CATEGORIES[task.category] || CATEGORIES.other;

      const marker = new ymaps.Placemark([lat, lng], {
        iconCaption: `${task.price} ₽ · ${task.title.slice(0, 18)}...`,
        hintContent: task.title,
        balloonContent: `
          <div style="padding: 10px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 260px;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${catMeta.color}; margin-bottom: 4px;">
              ${catMeta.label}
            </div>
            <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px; color: #111827; line-height: 1.2;">
              ${task.title}
            </div>
            <div style="font-size: 13px; color: #4b5563; margin-bottom: 8px; line-height: 1.4;">
              ${task.description.length > 80 ? task.description.slice(0, 80) + '...' : task.description}
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #059669; margin-bottom: 6px;">
              ${task.price.toLocaleString()} ₽
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">
              📍 ${task.address_name || 'Адрес не указан'}
            </div>
            <a href="/tasks/${task.id}" style="display: block; text-align: center; background: #2563eb; color: #ffffff; padding: 7px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none;">
              Посмотреть задание →
            </a>
          </div>
        `,
      }, {
        preset: 'islands#violetStretchyIcon',
        iconColor: catMeta.pinColor,
        draggable: false,
      });

      marker.events.add('click', () => {
        setSelectedTaskId(task.id);
      });

      collection.add(marker);
    });

    map.geoObjects.add(collection);
    collectionRef.current = collection;

    // Автоматическая подгонка области карты — только один раз при первой загрузке данных!
    if (!hasFittedBounds.current && tasksToRender.length > 0) {
      hasFittedBounds.current = true;
      try {
        const bounds = collection.getBounds();
        if (bounds) {
          map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 60 });
        }
      } catch {
        // fallback
      }
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Мгновенная инициализация карты
  useEffect(() => {
    let isCancelled = false;

    function initMap() {
      if (!mapRef.current || mapInstance.current || isCancelled) return;

      const ymaps = window.ymaps;
      if (!ymaps) return;

      ymaps.ready(() => {
        if (isCancelled || !mapRef.current || mapInstance.current) return;

        try {
          const map = new ymaps.Map(mapRef.current, {
            center: [53.9045, 27.5615],
            zoom: 12,
            controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
          }, {
            searchControlProvider: 'yandex#search',
            suppressMapOpenBlock: true,
            autoFitToViewport: 'always',
          });

          map.events.add('click', (e: any) => {
            const coords = e.get('coords');
            navigate(`/tasks/create?lat=${coords[0]}&lng=${coords[1]}`);
          });

          mapInstance.current = map;
          setIsMapReady(true);

          // Фоновая ненавязчивая геолокация
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (isCancelled || !mapInstance.current) return;
                const userCoords = [pos.coords.latitude, pos.coords.longitude];

                if (!userMarkerRef.current) {
                  userMarkerRef.current = new ymaps.Placemark(
                    userCoords,
                    { hintContent: 'Вы находитесь здесь' },
                    { preset: 'islands#geolocationIcon' }
                  );
                  map.geoObjects.add(userMarkerRef.current);
                }
              },
              () => {},
              { enableHighAccuracy: false, timeout: 4000 }
            );
          }
        } catch {
          setError('Ошибка инициализации Яндекс Карт');
        }
      });
    }

    if (window.ymaps) {
      initMap();
    } else {
      // Если скрипт ещё загружается из index.html
      const checkInterval = setInterval(() => {
        if (window.ymaps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 50);
      return () => clearInterval(checkInterval);
    }

    return () => {
      isCancelled = true;
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
        userMarkerRef.current = null;
        collectionRef.current = null;
        setIsMapReady(false);
      }
    };
  }, [navigate]);

  // Обновление меток при изменении отфильтрованного списка (без повторной анимации зума)
  useEffect(() => {
    if (!isMapReady || !mapInstance.current) return;
    renderMarkers(filteredTasks, mapInstance.current);
  }, [isMapReady, filteredTasks, renderMarkers]);

  const handleCenterOnTask = (task: Task) => {
    setSelectedTaskId(task.id);
    if (!mapInstance.current || !task.location) return;
    const lat = Number(task.location.lat);
    const lng = Number(task.location.lng);
    mapInstance.current.setCenter([lat, lng], 15, {
      checkZoomRange: true,
      duration: 250,
    });
  };

  const handleLocateMe = () => {
    if (navigator.geolocation && mapInstance.current) {
      navigator.geolocation.getCurrentPosition((pos) => {
        mapInstance.current.setCenter([pos.coords.latitude, pos.coords.longitude], 14, {
          duration: 300,
        });
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Верхняя навигационная панель */}
      <header className="h-16 px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between z-20 shadow-xs">
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
                Карта заданий
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/my-tasks"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs transition"
          >
            <span>Мои задания</span>
          </Link>

          <Link
            to="/tasks/create"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
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

      {/* Основная рабочая область: Боковая панель + Интерактивная карта */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Боковая панель задач */}
        <aside
          className={`absolute lg:relative z-10 h-full w-full max-w-sm sm:max-w-md bg-white/95 backdrop-blur-xl border-r border-slate-200 shadow-2xl lg:shadow-none flex flex-col transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:pointer-events-none'
          }`}
        >
          {/* Поиск и фильтры */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  Поиск заказов
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    hasFittedBounds.current = false;
                    loadTasks();
                  }}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                  title="Обновить задания"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Поле поиска с моментальным откликом */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию или адресу..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Категории (чипсы с иконками) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Все</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategory === 'all' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                  {tasks.length}
                </span>
              </button>

              {Object.values(CATEGORIES).map((cat) => {
                const count = tasks.filter(t => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {getCategoryIcon(cat.id)}
                    <span>{cat.label.split(' ')[0]}</span>
                    {count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategory === cat.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Список карточек задач */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loading && tasks.length === 0 && (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Загружаем задачи с карты...</p>
              </div>
            )}

            {filteredTasks.length === 0 && !loading && (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-3 shadow-xs">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">Задач пока нет</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'По вашему фильтру ничего не найдено. Попробуйте сбросить параметры.'
                    : 'Кликните на карту в любом месте, чтобы опубликовать первый заказ!'}
                </p>
                <Link
                  to="/tasks/create"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Создать задачу
                </Link>
              </div>
            )}

            {filteredTasks.map((task) => {
              const catMeta = CATEGORIES[task.category] || CATEGORIES.other;
              const urgencyMeta = URGENCY_LABELS[task.urgency] || URGENCY_LABELS.flexible;
              const isSelected = selectedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => handleCenterOnTask(task)}
                  className={`p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer bg-white group hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${catMeta.badgeBg} ${catMeta.badgeText}`}>
                        {getCategoryIcon(task.category)}
                        {catMeta.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${urgencyMeta.color}`}>
                        <Clock className="w-2.5 h-2.5" />
                        {urgencyMeta.label}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-emerald-600 tracking-tight">
                        {task.price > 0 ? `${task.price.toLocaleString()} ₽` : 'По договор.'}
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition leading-snug mb-1">
                    {task.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-2.5 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 truncate max-w-[220px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{task.address_name || 'Точка на карте'}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tasks/${task.id}`);
                      }}
                      className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    >
                      Открыть <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Карта Яндекс */}
        <div className="flex-1 relative h-full">
          <div ref={mapRef} className="w-full h-full" />

          {/* Плавающая подсказка сверху */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg border border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Кликните на карту в любой точке, чтобы создать заказ</span>
            </div>
          </div>

          {/* Плавающие кнопки управления картой */}
          <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2.5">
            <button
              onClick={handleLocateMe}
              className="w-11 h-11 rounded-xl bg-white shadow-lg border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-700 hover:text-blue-600 transition cursor-pointer"
              title="Моё местоположение"
            >
              <Compass className="w-5 h-5" />
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-11 h-11 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 flex items-center justify-center transition cursor-pointer"
              title="Список заданий"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Уведомление об ошибке */}
          {error && (
            <div className="absolute bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:max-w-md z-10 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
