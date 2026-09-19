import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';

export function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.ymaps) {
      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=YOUR_API_KEY';
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      script.onerror = () => setError('Не удалось загрузить Яндекс Карты');
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current || mapInstance.current) return;

      const ymaps = (window as any).ymaps;
      ymaps.ready(() => {
        try {
          const map = new ymaps.Map(mapRef.current, {
            center: [55.7558, 37.6173],
            zoom: 12,
            controls: ['zoomControl', 'fullscreenControl'],
          }, {
            searchControlProvider: 'yandex#search',
          });

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                map.setCenter([pos.coords.latitude, pos.coords.longitude], 14);
                map.geoObjects.add(new ymaps.Placemark(
                  [pos.coords.latitude, pos.coords.longitude],
                  { iconCaption: 'Ваше местоположение' },
                  { preset: 'islands#blueCircleIcon' }
                ));
                loadTasks(pos.coords.latitude, pos.coords.longitude);
              },
              () => loadTasks(55.7558, 37.6173),
              { enableHighAccuracy: false, timeout: 10000 }
            );
          } else {
            loadTasks(55.7558, 37.6173);
          }

          map.events.add('click', (e: any) => {
            const coords = e.get('coords');
            navigate(`/tasks/create?lat=${coords[0]}&lng=${coords[1]}`);
          });

          mapInstance.current = map;
        } catch (err) {
          setError('Ошибка инициализации карты');
          setLoading(false);
        }
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
        mapInstance.current = null;
      }
    };
  }, []);

  async function loadTasks(lat: number, lng: number) {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<Task[]>('/tasks', {
        latitude: lat,
        longitude: lng,
        radius: 5000,
      });
      const filtered = selectedCategory === 'all'
        ? result
        : result.filter(t => t.category === selectedCategory);
      setTasks(filtered);
      renderMarkers(filtered, lat, lng);
    } catch (err) {
      setError('Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }

  function renderMarkers(tasksToRender: Task[], lat?: number, lng?: number) {
    if (!mapInstance.current || !window.ymaps) return;

    const ymaps = (window as any).ymaps;
    const map = mapInstance.current;

    markersRef.current.forEach(m => map.geoObjects.remove(m));
    markersRef.current = [];

    tasksToRender.forEach((task) => {
      const coords = task.location ? [task.location.lat, task.location.lng] : [55.7558, 37.6173];
      const marker = new ymaps.Placemark(coords, {
        iconCaption: task.title,
        balloonContent: `<div>
          <h3>${task.title}</h3>
          <p>${task.description}</p>
          <p>Цена: ${task.price} ₽</p>
          <p>Статус: ${task.status}</p>
        </div>`,
      }, {
        preset: task.status === 'open' ? 'islands#greenCircleIcon' : 'islands#redCircleIcon',
        draggable: false,
      });

      marker.events.add('click', () => {
        navigate(`/tasks/${task.id}`);
      });

      map.geoObjects.add(marker);
      markersRef.current.push(marker);
    });
  }

  useEffect(() => {
    if (tasks.length > 0 && mapInstance.current) {
      renderMarkers(tasks, undefined, undefined);
    }
  }, [selectedCategory]);

  const categories = ['all', 'repair', 'delivery', 'cleaning', 'moving', 'other'];

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <h1 className="text-xl font-bold">GigPlatform</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="all">Все категории</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <a href="/tasks/create" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Создать задачу
          </a>
          <a href="/profile" className="text-gray-600 hover:text-gray-900">
            <img
              src={user?.photo_url || 'https://ui-avatars.com/api/?name={user?.full_name || "U"}&background=0D8ABC&color=fff'}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          </a>
        </div>
      </header>

      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
            Загрузка задач...
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-50 px-4 py-2 rounded-lg shadow-lg text-red-600">
            {error}
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg p-4 max-w-md w-full mx-4 max-h-48 overflow-y-auto">
          <h2 className="font-semibold mb-2">Задачи на карте ({tasks.length})</h2>
          {tasks.length === 0 && !loading && (
            <p className="text-gray-500 text-sm">Нет доступных задач. Кликните на карту для создания.</p>
          )}
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border-b last:border-0"
            >
              <div className="font-medium text-sm">{task.title}</div>
              <div className="text-xs text-gray-500">{task.category} • {task.price} ₽ • {task.address_name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
