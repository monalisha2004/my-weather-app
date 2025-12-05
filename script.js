// Your API key (replace if you want another)
const API_KEY = '66936735fa4af5281977644a32e422c6';

const cityInput = document.getElementById('city');
const searchBtn = document.getElementById('search');
const result = document.getElementById('result');
const errorBox = document.getElementById('error');
const unitToggle = document.getElementById('unitToggle');
const unitLabel = document.getElementById('unitLabel');

const STORAGE_KEY = 'weather_last_city';

// small helpers
function showError(msg) {
  errorBox.hidden = false;
  errorBox.textContent = msg;
  result.innerHTML = '';
}
function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
}
function showLoading() {
  clearError();
  result.innerHTML = `<div class="loader">Loading…</div>`;
}
function pad(n){ return n.toString().padStart(2,'0'); }
function formatTime(ts, tzSec){
  const d = new Date((ts + tzSec) * 1000);
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  return `${hh}:${mm}`;
}

// image backgrounds (Unsplash)
function applyBackground(main) {
  const images = {
    Clear: 'https://images.unsplash.com/photo-1505666283801-6f3a8b07f4b4?auto=format&fit=crop&w=1600&q=80',
    Clouds: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80',
    Rain: 'https://images.unsplash.com/photo-1527766833261-b09c3163a791?auto=format&fit=crop&w=1600&q=80',
    Drizzle: 'https://images.unsplash.com/photo-1527761939622-9119094630cf?auto=format&fit=crop&w=1600&q=80',
    Thunderstorm: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1600&q=80',
    Snow: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
    Mist: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1600&q=80'
  };
  const url = images[main] || images['Clear'];
  document.body.style.backgroundImage =
    `linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.08)), url("${url}")`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
}

// fetch current weather (with debug logging)
async function fetchWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  console.log('[fetchWeather] URL:', url);
  const r = await fetch(url);
  console.log('[fetchWeather] status', r.status);
  if (!r.ok) {
    const body = await r.text().catch(()=>null);
    console.warn('[fetchWeather] body', body);
    const err = await r.json().catch(()=>({message: body || 'Error'}));
    throw new Error(err.message || 'Failed to fetch weather');
  }
  return r.json();
}

// fetch forecast (5 day / 3 hour)
async function fetchForecast(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  console.log('[fetchForecast] URL:', url);
  const r = await fetch(url);
  console.log('[fetchForecast] status', r.status);
  if (!r.ok) {
    const body = await r.text().catch(()=>null);
    console.warn('[fetchForecast] body', body);
    const err = await r.json().catch(()=>({message: body || 'Error'}));
    throw new Error(err.message || 'Failed to fetch forecast');
  }
  return r.json();
}

function buildForecastHtml(forecastData, needed = 5) {
  if (!forecastData || !Array.isArray(forecastData.list)) return '';
  const list = forecastData.list;
  const picked = [];
  for (const item of list) {
    if (item.dt_txt && item.dt_txt.includes('12:00:00')) {
      picked.push(item);
      if (picked.length === needed) break;
    }
  }
  if (picked.length < needed) {
    picked.length = 0;
    for (let i = 0; i < list.length && picked.length < needed; i += 8) {
      picked.push(list[i]);
    }
  }
  const cards = picked.map(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toLocaleDateString(undefined, { weekday: 'short', month:'short', day:'numeric' });
    const icon = item.weather?.[0]?.icon || '';
    const desc = item.weather?.[0]?.description || '';
    const temp = Math.round(item.main?.temp ?? '-');
    return `
      <div class="forecast-card" aria-hidden="false">
        <div class="fc-date">${day}</div>
        ${icon ? `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">` : ''}
        <div class="fc-temp">${temp}°</div>
        <div class="fc-desc">${desc}</div>
      </div>
    `.trim();
  }).join('');
  return `<div class="forecast">${cards}</div>`;
}

function render(data, forecastData, unit) {
  clearError();
  if (!data || !data.main) { showError('No data to display.'); return; }

  const name = `${data.name}${data.sys && data.sys.country ? ', ' + data.sys.country : ''}`;
  const tempC = data.main.temp;
  const feelsC = data.main.feels_like;
  const temp = unit === 'C' ? Math.round(tempC) : Math.round(tempC * 9/5 + 32);
  const feels = unit === 'C' ? Math.round(feelsC) : Math.round(feelsC * 9/5 + 32);
  const desc = data.weather && data.weather[0] ? data.weather[0].description : '';
  const icon = data.weather && data.weather[0] ? data.weather[0].icon : '';
  const main = data.weather && data.weather[0] ? data.weather[0].main : '';

  const tz = data.timezone ?? 0;
  const sunrise = data.sys?.sunrise ? formatTime(data.sys.sunrise, tz) : '-';
  const sunset = data.sys?.sunset ? formatTime(data.sys.sunset, tz) : '-';

  applyBackground(main);

  const forecastHtml = buildForecastHtml(forecastData, 5);

  result.innerHTML = `
    <div class="card-body">
      <div class="left">
        <div class="temp">${temp}°${unit}</div>
        <div class="desc">${desc}</div>
        <div class="extra">
          <div>Humidity: ${data.main.humidity}%</div>
          <div>Feels like: ${feels}°${unit}</div>
        </div>
        <div class="small-row">
          <div>Sunrise: ${sunrise}</div>
          <div>Sunset: ${sunset}</div>
        </div>
        <div class="extra" style="margin-top:8px;font-size:12px;color:var(--muted)">
          Location: ${name} · Wind: ${data.wind?.speed ?? '-'} m/s · Pressure: ${data.main.pressure} hPa
        </div>
      </div>
      <div class="icon">
        ${icon ? `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">` : ''}
      </div>
    </div>
    ${forecastHtml}
  `;
}

async function search() {
  const city = cityInput.value.trim();
  if (!city) { showError('Please enter a city name.'); return; }
  showLoading();
  try {
    const [current, forecast] = await Promise.all([
      fetchWeather(city),
      fetchForecast(city)
    ]);
    const unit = unitToggle.checked ? 'F' : 'C';
    render(current, forecast, unit);
    localStorage.setItem(STORAGE_KEY, city);
  } catch (e) {
    console.error('[search] error', e);
    if (e.message && e.message.toLowerCase().includes('city not found')) {
      showError('City not found. Try another name.');
    } else if (e.message && e.message.toLowerCase().includes('invalid api key')) {
      showError('Invalid API key. Please check your key at OpenWeatherMap.');
    } else {
      showError('Could not fetch weather or forecast. Check network or API key.');
    }
  }
}

function loadLastCity() {
  const last = localStorage.getItem(STORAGE_KEY);
  if (last) {
    cityInput.value = last;
    search();
  }
}

unitToggle.addEventListener('change', () => {
  unitLabel.textContent = unitToggle.checked ? '°F' : '°C';
  const last = localStorage.getItem(STORAGE_KEY);
  if (last && result.innerHTML.trim() !== '') {
    search();
  }
});

searchBtn.addEventListener('click', search);
cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });

clearError();
loadLastCity();
