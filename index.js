'use strict';

document.addEventListener('DOMContentLoaded', () => {

    /* ========= DOM ========= */
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-input');

    const cityNameEl = document.getElementById('city-name');
    const tempEl = document.getElementById('temp-value');
    const feelsLikeEl = document.getElementById('feels-like');
    const humidityEl = document.getElementById('humidity');

    const windRadios = document.querySelectorAll('input[name="wind"]');
    const windValueEl = document.getElementById('wind-value');
    const windUnitEl = document.getElementById('wind-unit');

    const tempRadios = document.querySelectorAll('input[name="units"]');

    const precipRadios = document.querySelectorAll('input[name="precipitation"]');
    const precipValueEl = document.getElementById('precip-value');
    const precipUnitEl = document.getElementById('precip-unit');

    const dateEl = document.querySelector('.date');
    const weekEls = document.querySelectorAll('.week');
    const daySelect = document.getElementById('day');
    const weatherHours = document.getElementById('weatherHours');

    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    /* ========= 状態 ========= */
    const API_KEY = 'YOUR_API_KEY';

    function checkApiKey() {
        if (!API_KEY || API_KEY === "YOUR_API_KEY") {
            alert("APIキーを設定してください");
            return false;
        }
        return true;
    }

    let weeklyDataCache = null;
    let currentCity = 'Tokyo';

    let currentTempC = null;
    let currentFeelsLikeC = null;
    let currentDailyTempsC = [];
    let currentHourlyTempsC = [];

    let currentWind = 0;     // km/h
    let currentPrecip = 0;  // mm

    /* ========= 日付 ========= */
    const now = new Date();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    dateEl.textContent =
        `${weekdays[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    /* ========= ドロップダウン ========= */
    dropdownBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = dropdownMenu.classList.toggle('active');
        dropdownBtn.setAttribute('aria-expanded', open);
    });

    dropdownMenu.addEventListener('click', e => e.stopPropagation());

    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
        dropdownBtn.setAttribute('aria-expanded', 'false');
    });

    /* ========= 変換 ========= */
    const cToF = c => c * 9 / 5 + 32;

    /* ========= 天気画像 ========= */
    function getWeatherImage(main) {
        switch (main) {
            case 'Clear': return './assets/images/icon-sunny.webp';
            case 'Clouds': return './assets/images/icon-overcast.webp';
            case 'Rain': return './assets/images/icon-rain.webp';
            case 'Snow': return './assets/images/icon-snow.webp';
            case 'Thunderstorm': return './assets/images/icon-storm.webp';
            case 'Drizzle': return './assets/images/icon-drizzle.webp';
            case 'Fog':
            case 'Mist':
            case 'Haze': return './assets/images/icon-fog.webp';
            default: return './assets/images/icon-overcast.webp';
        }
    }

    /* ========= 温度一括更新 ========= */
    function updateTemperature(unit) {
        const isF = unit === 'fahrenheit';

        if (currentTempC !== null)
            tempEl.textContent = Math.round(isF ? cToF(currentTempC) : currentTempC);

        if (currentFeelsLikeC !== null)
            feelsLikeEl.textContent = Math.round(isF ? cToF(currentFeelsLikeC) : currentFeelsLikeC);

        weekEls.forEach((weekEl, i) => {
            if (!currentDailyTempsC[i]) return;
            const { max, min } = currentDailyTempsC[i];

            weekEl.querySelector('h5').childNodes[0].textContent =
                `${Math.round(isF ? cToF(max) : max)}°`;
            weekEl.querySelector('h5 span').textContent =
                `${Math.round(isF ? cToF(min) : min)}°`;
        });

        [...weatherHours.children].forEach((li, i) => {
            if (currentHourlyTempsC[i] == null) return;
            li.querySelectorAll('span')[1].textContent =
                `${Math.round(isF ? cToF(currentHourlyTempsC[i]) : currentHourlyTempsC[i])}°`;
        });
    }

    tempRadios.forEach(radio => {
        radio.addEventListener('change', () => updateTemperature(radio.value));
    });

    /* ========= 風速 ========= */
    function updateWind(unit) {
        if (unit === 'mph') {
            windValueEl.textContent = (currentWind * 0.621371).toFixed(1);
            windUnitEl.textContent = 'mph';
        } else {
            windValueEl.textContent = Math.round(currentWind);
            windUnitEl.textContent = 'km/h';
        }
    }

    windRadios.forEach(radio =>
        radio.addEventListener('change', () => updateWind(radio.value))
    );

    /* ========= 降水量 ========= */
    function updatePrecip(unit) {
        if (unit === 'in') {
            precipValueEl.textContent = (currentPrecip / 25.4).toFixed(2);
            precipUnitEl.textContent = 'in';
        } else {
            precipValueEl.textContent = currentPrecip.toFixed(1);
            precipUnitEl.textContent = 'mm';
        }
    }

    precipRadios.forEach(radio =>
        radio.addEventListener('change', () => updatePrecip(radio.value))
    );

    /* ========= 現在の天気 ========= */
    async function fetchWeather(city) {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
        );
        const data = await res.json();

        cityNameEl.textContent = data.name;
        humidityEl.textContent = data.main.humidity;

        currentTempC = data.main.temp;
        currentFeelsLikeC = data.main.feels_like;
        currentWind = data.wind.speed * 3.6;

        updateTemperature(
            document.querySelector('input[name="units"]:checked')?.value || 'celsius'
        );
        updateWind(
            document.querySelector('input[name="wind"]:checked')?.value || 'kmh'
        );
    }

    /* ========= 週間 ========= */
    async function fetchWeeklyWeather(city) {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`
        );
        const data = await res.json();

        const daily = {};
        data.list.forEach(item => {
            const key = new Date(item.dt * 1000).toDateString();
            if (!daily[key]) {
                daily[key] = {
                    min: item.main.temp_min,
                    max: item.main.temp_max,
                    main: item.weather[0].main,
                    dt: item.dt
                };
            } else {
                daily[key].min = Math.min(daily[key].min, item.main.temp_min);
                daily[key].max = Math.max(daily[key].max, item.main.temp_max);
            }
        });

        currentDailyTempsC = [];

        Object.values(daily).slice(1, 8).forEach((day, i) => {
            currentDailyTempsC.push({ min: day.min, max: day.max });
            if (!weekEls[i]) return;

            const date = new Date(day.dt * 1000);
            weekEls[i].querySelector('h4').textContent =
                date.toLocaleDateString('en-US', { weekday: 'short' });
            weekEls[i].querySelector('img').src = getWeatherImage(day.main);
        });

        return data;
    }

    /* ========= 時間別 ========= */
    function renderHourlyWeather(data, targetDate) {
        weatherHours.innerHTML = '';
        currentHourlyTempsC = [];

        for (let hour = 0; hour < 24; hour++) {
            const target = new Date(targetDate);
            target.setHours(hour, 0, 0, 0);
            const targetTime = Math.floor(target.getTime() / 1000);

            const closest = data.list.reduce((a, b) =>
                Math.abs(b.dt - targetTime) < Math.abs(a.dt - targetTime) ? b : a
            );

            currentHourlyTempsC.push(closest.main.temp);

            const label =
                hour === 0 ? '0AM' :
                    hour < 12 ? `${hour}AM` :
                        hour === 12 ? '12PM' :
                            `${hour - 12}PM`;

            const li = document.createElement('li');
            li.innerHTML = `
        <img src="${getWeatherImage(closest.weather[0].main)}" alt="">
        <span>${label}</span>
        <span class="temp">${Math.round(closest.main.temp)}°</span>
      `;
            weatherHours.appendChild(li);
        }

        updateTemperature(
            document.querySelector('input[name="units"]:checked')?.value || 'celsius'
        );
    }

    /* ========= 曜日切替 ========= */
    function getDateFromWeekday(value) {
        const today = new Date();
        const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const diff = (map.indexOf(value) - today.getDay() + 7) % 7;
        const d = new Date(today);
        d.setDate(today.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    daySelect.addEventListener('change', () => {
        renderHourlyWeather(weeklyDataCache, getDateFromWeekday(daySelect.value));
    });

    /* ========= 検索 ========= */
    searchBtn.addEventListener('click', async () => {
        const city = cityInput.value.trim();
        if (!city) return;
        currentCity = city;
        await fetchWeather(city);
        weeklyDataCache = await fetchWeeklyWeather(city);
        renderHourlyWeather(weeklyDataCache, new Date());
    });

    /* ========= 初期表示 ========= */
    (async () => {
        if (!checkApiKey()) return;
        await fetchWeather(currentCity);
        weeklyDataCache = await fetchWeeklyWeather(currentCity);
        renderHourlyWeather(weeklyDataCache, new Date());
    })();

});
