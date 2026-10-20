import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { CreateTaskRequest } from '../types';
import { CATEGORIES } from '../utils/categories';
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  Wrench,
  Package,
  Truck,
  Layers,
  Banknote,
  AlertCircle,
  Locate,
  CheckCircle2,
  Loader2,
  Search,
  Navigation
} from 'lucide-react';

export function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateTaskRequest>(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    return {
      title: '',
      description: '',
      category: 'repair',
      price: 1000,
      urgency: 'today',
      latitude: latParam ? parseFloat(latParam) : 53.9045,
      longitude: lngParam ? parseFloat(lngParam) : 27.5615,
      address_name: '',
    };
  });

  const [geocoding, setGeocoding] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ value: string; displayName: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const miniMapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const isInternalUpdate = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  const updateField = (key: keyof CreateTaskRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Обратное геокодирование: [lat, lng] -> строка адреса
  const reverseGeocode = useCallback((coords: [number, number] | number[]) => {
    const ymaps = (window as any).ymaps;
    if (!ymaps || !coords || coords.length < 2) return;

    setGeocoding(true);
    ymaps
      .geocode([coords[0], coords[1]], { results: 1 })
      .then((res: any) => {
        const obj = res.geoObjects.get(0);
        if (obj) {
          const addr = obj.getAddressLine();
          if (addr) {
            isInternalUpdate.current = true;
            setFormData((prev) => ({
              ...prev,
              latitude: coords[0],
              longitude: coords[1],
              address_name: addr,
            }));
            setGeocodedAddress(addr);
          }
        }
      })
      .catch(() => {})
      .finally(() => setGeocoding(false));
  }, []);

  // Прямое геокодирование: строка адреса -> [lat, lng]
  const forwardGeocode = useCallback(
    (addressQuery: string, shouldCenter = true) => {
      const ymaps = (window as any).ymaps;
      if (!ymaps || !addressQuery.trim()) return Promise.resolve(null);

      setGeocoding(true);
      return ymaps
        .geocode(addressQuery, { results: 1 })
        .then((res: any) => {
          const obj = res.geoObjects.get(0);
          if (obj) {
            const coords = obj.geometry.getCoordinates(); // [lat, lng]
            const formatted = obj.getAddressLine();

            setFormData((prev) => ({
              ...prev,
              latitude: coords[0],
              longitude: coords[1],
            }));
            setGeocodedAddress(formatted);

            if (placemarkRef.current) {
              placemarkRef.current.geometry.setCoordinates(coords);
            }
            if (shouldCenter && mapInstance.current) {
              mapInstance.current.setCenter(coords, 16, { duration: 250 });
            }
            return { lat: coords[0], lng: coords[1], address: formatted };
          }
          return null;
        })
        .catch(() => null)
        .finally(() => setGeocoding(false));
    },
    []
  );

  // Инициализация интерактивной мини-карты
  useEffect(() => {
    let isCancelled = false;

    function initMiniMap() {
      if (!miniMapRef.current || mapInstance.current || isCancelled) return;
      const ymaps = (window as any).ymaps;
      if (!ymaps) return;

      ymaps.ready(() => {
        if (!miniMapRef.current || mapInstance.current || isCancelled) return;

        const initialCoords = [formData.latitude, formData.longitude];
        const map = new ymaps.Map(
          miniMapRef.current,
          {
            center: initialCoords,
            zoom: 15,
            controls: ['zoomControl'],
          },
          {
            suppressMapOpenBlock: true,
            autoFitToViewport: 'always',
          }
        );

        const placemark = new ymaps.Placemark(
          initialCoords,
          { hintContent: 'Перетащите метку для точной настройки адреса' },
          {
            preset: 'islands#redDotIcon',
            draggable: true,
          }
        );

        // Перетаскивание метки мышью
        placemark.events.add('dragend', () => {
          const newCoords = placemark.geometry.getCoordinates();
          reverseGeocode(newCoords);
        });

        // Клик по карте переносит метку
        map.events.add('click', (e: any) => {
          const newCoords = e.get('coords');
          placemark.geometry.setCoordinates(newCoords);
          reverseGeocode(newCoords);
        });

        map.geoObjects.add(placemark);
        mapInstance.current = map;
        placemarkRef.current = placemark;

        // Если координаты переданы через URL или начальные, но адрес пуст — определяем адрес
        if (!formData.address_name) {
          reverseGeocode(initialCoords);
        }
      });
    }

    if ((window as any).ymaps) {
      initMiniMap();
    } else {
      const interval = setInterval(() => {
        if ((window as any).ymaps) {
          clearInterval(interval);
          initMiniMap();
        }
      }, 60);
      return () => clearInterval(interval);
    }

    return () => {
      isCancelled = true;
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
        placemarkRef.current = null;
      }
    };
  }, []);

  // Первоначальное автоопределение местоположения, если нет URL параметров
  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (!latParam && !lngParam && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setFormData((prev) => ({
            ...prev,
            latitude: userCoords[0],
            longitude: userCoords[1],
          }));
          if (mapInstance.current) {
            mapInstance.current.setCenter(userCoords, 15);
          }
          if (placemarkRef.current) {
            placemarkRef.current.geometry.setCoordinates(userCoords);
          }
          reverseGeocode(userCoords);
        },
        () => {
          // fallback
        },
        { timeout: 4000 }
      );
    }
  }, [searchParams, reverseGeocode]);

  // Обработка ручного ввода адреса пользователем с поиском подсказок и дебаунсом геокодера
  const handleAddressInputChange = (val: string) => {
    updateField('address_name', val);

    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const ymaps = (window as any).ymaps;
    if (!ymaps) return;

    // Подсказки (Suggest API)
    if (val.trim().length >= 2) {
      ymaps
        .suggest(val, { results: 5 })
        .then((items: any[]) => {
          setSuggestions(
            items.map((item) => ({
              value: item.value,
              displayName: item.displayName || item.value,
            }))
          );
          setShowSuggestions(items.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    // Дебаунс прямого геокодирования (600 мс)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        forwardGeocode(val, true);
      }, 600);
    }
  };

  // Выбор подсказки из выпадающего списка
  const handleSelectSuggestion = (suggestionValue: string) => {
    isInternalUpdate.current = true;
    updateField('address_name', suggestionValue);
    setShowSuggestions(false);
    forwardGeocode(suggestionValue, true);
  };

  // Кнопка "Определить мое местоположение"
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setFormData((prev) => ({
          ...prev,
          latitude: userCoords[0],
          longitude: userCoords[1],
        }));
        if (mapInstance.current) {
          mapInstance.current.setCenter(userCoords, 16, { duration: 300 });
        }
        if (placemarkRef.current) {
          placemarkRef.current.geometry.setCoordinates(userCoords);
        }
        reverseGeocode(userCoords);
      },
      () => {
        setGeocoding(false);
        setError('Не удалось получить ваше текущее местоположение.');
      },
      { timeout: 6000 }
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Укажите название задачи');
      return;
    }
    if (!formData.address_name.trim()) {
      setError('Укажите адрес выполнения');
      return;
    }

    setLoading(true);
    setError(null);

    let finalLat = formData.latitude;
    let finalLng = formData.longitude;

    // Гарантированное геокодирование адреса перед отправкой:
    // если пользователь только что ввёл улицу и нажал Submit, мы точно находим её реальные координаты!
    const ymaps = (window as any).ymaps;
    if (ymaps && formData.address_name.trim()) {
      try {
        const res = await ymaps.geocode(formData.address_name, { results: 1 });
        const obj = res.geoObjects.get(0);
        if (obj) {
          const coords = obj.geometry.getCoordinates();
          finalLat = coords[0];
          finalLng = coords[1];
        } else if (!finalLat || !finalLng) {
          setError(
            'Не удалось определить координаты для указанного адреса. Уточните город, улицу или кликните по карте.'
          );
          setLoading(false);
          return;
        }
      } catch {
        // Fallback к существующим координатам
      }
    }

    const payload: CreateTaskRequest = {
      ...formData,
      latitude: finalLat,
      longitude: finalLng,
    };

    try {
      await api.post('/tasks', payload);
      navigate('/map');
    } catch {
      setError('Не удалось создать задачу. Попробуйте снова.');
      setLoading(false);
    }
  }

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'repair':
        return <Wrench className="w-5 h-5" />;
      case 'delivery':
        return <Package className="w-5 h-5" />;
      case 'cleaning':
        return <Sparkles className="w-5 h-5" />;
      case 'moving':
        return <Truck className="w-5 h-5" />;
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  const urgencyOptions: Array<{
    id: 'today' | 'week' | 'flexible';
    label: string;
    desc: string;
  }> = [
    { id: 'today', label: 'Сегодня', desc: 'Срочно требуется решение' },
    { id: 'week', label: 'На неделе', desc: 'В ближайшие 2-7 дней' },
    { id: 'flexible', label: 'Гибко', desc: 'По согласованию с исполнителем' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* Навигация */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 shadow-xs flex items-center">
        <div className="max-w-3xl mx-auto w-full px-6 flex items-center justify-between">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Вернуться на карту</span>
          </Link>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Новое задание
          </div>
        </div>
      </header>

      {/* Основной контейнер формы */}
      <main className="max-w-2xl mx-auto px-4 pt-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Опубликовать задание
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Заполните детали, и исполнители неподалёку увидят ваш заказ на карте и предложат свои условия.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Название */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Что нужно сделать?
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Например: Заменить смеситель в ванной"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                required
              />
            </div>

            {/* Категория */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                Категория работы
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.values(CATEGORIES).map((cat) => {
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => updateField('category', cat.id)}
                      className={`p-3.5 rounded-2xl border text-left transition flex flex-col gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {getCategoryIcon(cat.id)}
                      </div>
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Описание */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Подробное описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Опишите объём работы, наличие материалов, этаж, особенности..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition leading-relaxed"
                required
              />
            </div>

            {/* Бюджет и Срочность */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Бюджет (₽)
                </label>
                <div className="relative">
                  <Banknote className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.price}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateField('price', isNaN(val) ? 0 : val);
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Когда приступить
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) => updateField('urgency', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  {urgencyOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label} — {u.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Место выполнения: Интерактивный поиск улицы + Мини-карта */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Адрес выполнения заказа
                </label>

                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  <Locate className="w-3.5 h-3.5" />
                  <span>Моё местоположение</span>
                </button>
              </div>

              {/* Поле ввода адреса с выпадающими подсказками */}
              <div className="relative mb-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.address_name}
                    onChange={(e) => handleAddressInputChange(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    placeholder="Введите город, улицу и номер дома (напр. Колесникова 37)"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                    required
                  />
                  {geocoding && (
                    <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" />
                  )}
                </div>

                {/* Выпадающий список подсказок от Яндекс.Карт */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto overflow-hidden divide-y divide-slate-100">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(item.value)}
                        className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-2 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Индикатор подтверждённого адреса */}
              {geocodedAddress && (
                <div className="mb-3 px-3.5 py-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Точка на карте: <strong>{geocodedAddress}</strong>
                  </span>
                </div>
              )}

              {/* Интерактивная мини-карта выбора точки */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner bg-slate-100">
                <div
                  ref={miniMapRef}
                  className="w-full"
                  style={{ height: '230px' }}
                />

                {/* Информационная плашка поверх карты */}
                <div className="absolute top-2.5 left-2.5 right-2.5 pointer-events-none flex justify-between items-center">
                  <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-3 py-1 rounded-xl shadow-md">
                    Кликните или перетащите красную метку для уточнения
                  </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5 pointer-events-none bg-white/90 backdrop-blur-xs text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                  {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Кнопка отправки */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || geocoding}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Публикуем задание...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Разместить заказ на карте</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
