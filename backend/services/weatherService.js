const axios = require('axios');
const cron = require('node-cron');
const ContentFeed = require('../models/ContentFeed');
const Notice = require('../models/Notice');

class WeatherService {
  constructor() {
    this.apiBaseUrl = 'https://api.openweathermap.org/data/2.5';
    this.feedCache = new Map();
    this.updateIntervals = new Map();
  }

  // Add weather feed
  async addFeed(feedConfig) {
    try {
      const {
        name,
        apiKey,
        location,
        units = 'metric', // metric, imperial
        updateInterval = 60, // minutes
        autoPublish = false,
        includeForecast = false,
        forecastDays = 3,
        weatherTypes = ['current', 'forecast'] // current, forecast, alerts
      } = feedConfig;

      // Validate API key and location
      const isValid = await this.validateApiKey(apiKey, location);
      if (!isValid) {
        throw new Error('Invalid API key or location');
      }

      const feed = new ContentFeed({
        name,
        type: 'weather',
        source: `weather_${location}`,
        config: {
          apiKey,
          location,
          units,
          updateInterval,
          autoPublish,
          includeForecast,
          forecastDays,
          weatherTypes
        },
        status: 'active',
        lastUpdated: new Date()
      });

      await feed.save();

      // Start periodic updates
      this.startFeedUpdates(feed._id, updateInterval);

      return { success: true, feed };
    } catch (error) {
      console.error('Error adding weather feed:', error);
      throw error;
    }
  }

  // Validate OpenWeatherMap API key
  async validateApiKey(apiKey, location) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/weather`, {
        params: {
          q: location,
          appid: apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      return response.data && response.data.cod === 200;
    } catch (error) {
      console.error('Error validating weather API key:', error);
      return false;
    }
  }

  // Fetch weather data
  async fetchWeather(feedId) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'weather') {
        throw new Error('Feed not found or not a weather feed');
      }

      const { apiKey, location, units, weatherTypes, includeForecast, forecastDays } = feed.config;

      const weatherData = {};

      // Fetch current weather
      if (weatherTypes.includes('current')) {
        weatherData.current = await this.fetchCurrentWeather(apiKey, location, units);
      }

      // Fetch forecast
      if (weatherTypes.includes('forecast') && includeForecast) {
        weatherData.forecast = await this.fetchWeatherForecast(apiKey, location, units, forecastDays);
      }

      // Fetch weather alerts
      if (weatherTypes.includes('alerts')) {
        weatherData.alerts = await this.fetchWeatherAlerts(apiKey, location);
      }

      // Process weather data into items
      const items = this.processWeatherData(weatherData, feed);

      // Cache the results
      this.feedCache.set(feedId.toString(), {
        data: weatherData,
        items: items,
        lastFetched: new Date()
      });

      // Update feed metadata
      feed.lastUpdated = new Date();
      feed.metadata = {
        itemCount: items.length,
        lastFetchStatus: 'success',
        location: location,
        lastTemperature: weatherData.current?.main?.temp,
        lastCondition: weatherData.current?.weather?.[0]?.description
      };
      await feed.save();

      return { success: true, data: weatherData, items };
    } catch (error) {
      console.error('Error fetching weather data:', error);

      await ContentFeed.findByIdAndUpdate(feedId, {
        'metadata.lastFetchStatus': 'error',
        'metadata.lastError': error.message
      });

      throw error;
    }
  }

  // Fetch current weather
  async fetchCurrentWeather(apiKey, location, units) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/weather`, {
        params: {
          q: location,
          appid: apiKey,
          units: units
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching current weather:', error);
      throw error;
    }
  }

  // Fetch weather forecast
  async fetchWeatherForecast(apiKey, location, units, days) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/forecast`, {
        params: {
          q: location,
          appid: apiKey,
          units: units,
          cnt: days * 8 // 8 data points per day (3-hour intervals)
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return null;
    }
  }

  // Fetch weather alerts
  async fetchWeatherAlerts(apiKey, location) {
    // Note: Weather alerts are not available in the free OpenWeatherMap tier
    // This would require a premium subscription
    console.log('Weather alerts not available in free OpenWeatherMap tier');
    return [];
  }

  // Process weather data into display items
  processWeatherData(weatherData, feed) {
    const items = [];

    // Current weather item
    if (weatherData.current) {
      const current = weatherData.current;
      const temp = Math.round(current.main.temp);
      const condition = current.weather[0].description;
      const icon = current.weather[0].icon;

      items.push({
        id: `current_${feed._id}_${Date.now()}`,
        type: 'current_weather',
        title: `Current Weather - ${feed.config.location}`,
        content: this.formatCurrentWeather(current, feed.config.units),
        temperature: temp,
        condition: condition,
        icon: icon,
        location: feed.config.location,
        publishedAt: new Date(),
        feedId: feed._id,
        feedName: feed.name,
        priority: this.getWeatherPriority(condition)
      });
    }

    // Forecast items
    if (weatherData.forecast && weatherData.forecast.list) {
      const dailyForecast = this.groupForecastByDay(weatherData.forecast.list);

      for (const [date, forecasts] of Object.entries(dailyForecast)) {
        const dayData = forecasts[0]; // Use first forecast of the day
        const temp = Math.round(dayData.main.temp);
        const condition = dayData.weather[0].description;
        const icon = dayData.weather[0].icon;

        items.push({
          id: `forecast_${feed._id}_${date}`,
          type: 'weather_forecast',
          title: `Weather Forecast - ${feed.config.location}`,
          content: this.formatForecastWeather(date, forecasts, feed.config.units),
          temperature: temp,
          condition: condition,
          icon: icon,
          location: feed.config.location,
          forecastDate: new Date(date),
          publishedAt: new Date(),
          feedId: feed._id,
          feedName: feed.name,
          priority: 'low'
        });
      }
    }

    // Weather alerts
    if (weatherData.alerts && weatherData.alerts.length > 0) {
      for (const alert of weatherData.alerts) {
        items.push({
          id: `alert_${feed._id}_${alert.start}`,
          type: 'weather_alert',
          title: `Weather Alert - ${feed.config.location}`,
          content: alert.description,
          severity: alert.tags?.[0] || 'warning',
          publishedAt: new Date(),
          feedId: feed._id,
          feedName: feed.name,
          priority: 'high'
        });
      }
    }

    return items;
  }

  // Format current weather content
  formatCurrentWeather(data, units) {
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const humidity = data.main.humidity;
    const windSpeed = Math.round(data.wind.speed * 3.6); // Convert to km/h
    const condition = data.weather[0].description;
    const location = data.name;

    const unitSymbol = units === 'metric' ? '°C' : '°F';
    const windUnit = units === 'metric' ? 'km/h' : 'mph';

    return `${location}: ${temp}${unitSymbol}, ${condition}. ` +
           `Feels like ${feelsLike}${unitSymbol}. ` +
           `Humidity: ${humidity}%. Wind: ${windSpeed} ${windUnit}.`;
  }

  // Format forecast weather content
  formatForecastWeather(date, forecasts, units) {
    const unitSymbol = units === 'metric' ? '°C' : '°F';
    const temps = forecasts.map(f => Math.round(f.main.temp));
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const conditions = [...new Set(forecasts.map(f => f.weather[0].description))];

    const dateStr = new Date(date).toLocaleDateString();
    const conditionStr = conditions.join(', ');

    return `${dateStr}: ${minTemp}-${maxTemp}${unitSymbol}, ${conditionStr}`;
  }

  // Group forecast by day
  groupForecastByDay(forecastList) {
    const daily = {};

    forecastList.forEach(item => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!daily[date]) {
        daily[date] = [];
      }
      daily[date].push(item);
    });

    return daily;
  }

  // Get weather priority based on conditions
  getWeatherPriority(condition) {
    const severeConditions = ['thunderstorm', 'tornado', 'hurricane', 'blizzard', 'heavy snow'];
    const moderateConditions = ['rain', 'snow', 'fog', 'mist'];

    const lowerCondition = condition.toLowerCase();

    if (severeConditions.some(c => lowerCondition.includes(c))) {
      return 'urgent';
    } else if (moderateConditions.some(c => lowerCondition.includes(c))) {
      return 'high';
    } else {
      return 'medium';
    }
  }

  // Create notices from weather data
  async createNoticesFromWeather(feedId, items = null) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || !feed.config.autoPublish) {
        return { success: false, message: 'Auto-publish not enabled for this feed' };
      }

      if (!items) {
        const fetchResult = await this.fetchWeather(feedId);
        items = fetchResult.items;
      }

      const createdNotices = [];

      for (const item of items) {
        // Check if notice already exists (avoid duplicates)
        const existingNotice = await Notice.findOne({
          'metadata.weatherId': item.id,
          'metadata.feedId': feedId
        });

        if (existingNotice) continue;

        // Create notice from weather item
        const notice = new Notice({
          title: item.title,
          content: item.content,
          contentType: 'text',
          priority: item.priority,
          category: 'weather',
          submittedBy: null, // System generated
          status: 'approved', // Auto-approved for weather feeds
          attachments: [],
          tags: ['weather', item.type, 'auto-generated'],
          expiryDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours for weather
          metadata: {
            weatherId: item.id,
            feedId: feedId,
            weatherType: item.type,
            location: item.location,
            temperature: item.temperature,
            condition: item.condition,
            forecastDate: item.forecastDate
          },
          targetBoards: [], // Will be assigned based on feed configuration
          driveLink: null
        });

        await notice.save();
        createdNotices.push(notice);
      }

      return {
        success: true,
        createdCount: createdNotices.length,
        notices: createdNotices
      };
    } catch (error) {
      console.error('Error creating notices from weather feed:', error);
      throw error;
    }
  }

  // Start periodic updates for a feed
  startFeedUpdates(feedId, intervalMinutes) {
    if (this.updateIntervals.has(feedId.toString())) {
      clearInterval(this.updateIntervals.get(feedId.toString()));
    }

    const interval = setInterval(async () => {
      try {
        await this.fetchWeather(feedId);

        // Auto-publish if enabled
        const feed = await ContentFeed.findById(feedId);
        if (feed && feed.config.autoPublish) {
          await this.createNoticesFromWeather(feedId);
        }
      } catch (error) {
        console.error(`Error updating weather feed ${feedId}:`, error);
      }
    }, intervalMinutes * 60 * 1000);

    this.updateIntervals.set(feedId.toString(), interval);
  }

  // Stop periodic updates for a feed
  stopFeedUpdates(feedId) {
    if (this.updateIntervals.has(feedId.toString())) {
      clearInterval(this.updateIntervals.get(feedId.toString()));
      this.updateIntervals.delete(feedId.toString());
    }
  }

  // Get cached weather data
  getCachedWeather(feedId) {
    return this.feedCache.get(feedId.toString());
  }

  // Get all active weather feeds
  async getActiveFeeds() {
    try {
      const feeds = await ContentFeed.find({
        type: 'weather',
        status: 'active'
      }).sort({ lastUpdated: -1 });

      return feeds.map(feed => ({
        id: feed._id,
        name: feed.name,
        location: feed.config.location,
        config: feed.config,
        lastUpdated: feed.lastUpdated,
        metadata: feed.metadata,
        cachedData: this.feedCache.get(feed._id.toString())
      }));
    } catch (error) {
      console.error('Error getting active weather feeds:', error);
      throw error;
    }
  }

  // Update feed configuration
  async updateFeed(feedId, updates) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed) {
        throw new Error('Feed not found');
      }

      // Update configuration
      if (updates.config) {
        Object.assign(feed.config, updates.config);
      }

      // Update other fields
      if (updates.name) feed.name = updates.name;
      if (updates.status) feed.status = updates.status;

      await feed.save();

      // Restart updates if interval changed
      if (updates.config?.updateInterval) {
        this.stopFeedUpdates(feedId);
        if (feed.status === 'active') {
          this.startFeedUpdates(feedId, updates.config.updateInterval);
        }
      }

      return { success: true, feed };
    } catch (error) {
      console.error('Error updating weather feed:', error);
      throw error;
    }
  }

  // Delete weather feed
  async deleteFeed(feedId) {
    try {
      this.stopFeedUpdates(feedId);
      this.feedCache.delete(feedId.toString());

      await ContentFeed.findByIdAndDelete(feedId);

      return { success: true, message: 'Weather feed deleted successfully' };
    } catch (error) {
      console.error('Error deleting weather feed:', error);
      throw error;
    }
  }

  // Initialize all active feeds on startup
  async initializeFeeds() {
    try {
      const feeds = await ContentFeed.find({
        type: 'weather',
        status: 'active'
      });

      for (const feed of feeds) {
        this.startFeedUpdates(feed._id, feed.config.updateInterval);
      }

      console.log(`Initialized ${feeds.length} weather feeds`);
    } catch (error) {
      console.error('Error initializing weather feeds:', error);
    }
  }

  // Get weather icon URL
  getWeatherIconUrl(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }
}

module.exports = new WeatherService();