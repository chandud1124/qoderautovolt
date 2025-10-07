const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class PiSignageService {
  constructor() {
    this.baseURL = process.env.PISIGNAGE_SERVER_URL || 'http://localhost:3000';
    this.username = process.env.PISIGNAGE_USERNAME || 'pi';
    this.password = process.env.PISIGNAGE_PASSWORD || 'pi';
    this.apiKey = process.env.PISIGNAGE_API_KEY;
  }

  // Upload asset to PiSignage
  async uploadAsset(filePath, filename) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath), { filename });

      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.post(`${this.baseURL}/api/assets`, formData, {
        headers: {
          'Authorization': `Basic ${auth}`,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage asset upload error:', error.response?.data || error.message);
      throw error;
    }
  }  // Create playlist in PiSignage with advanced options
  async createPlaylist(name, assets, options = {}) {
    try {
      const playlistData = {
        name,
        assets: assets.map(asset => ({
          _id: asset._id,
          duration: asset.duration || 10,
          order: asset.order || 0
        })),
        settings: {
          loop: options.loop !== false, // default true
          shuffle: options.shuffle || false,
          transition: options.transition || 'fade',
          transitionDuration: options.transitionDuration || 1000
        }
      };

      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.post(`${this.baseURL}/api/playlists`, playlistData, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage playlist creation error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update existing playlist
  async updatePlaylist(playlistId, updates) {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.put(`${this.baseURL}/api/playlists/${playlistId}`, updates, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage playlist update error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create advanced schedule with multiple playlists and priorities
  async createAdvancedSchedule(groupId, schedules) {
    try {
      // schedules should be an array of:
      // [{ playlistId, priority, startTime, endTime, daysOfWeek, startDate, endDate }]
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.post(`${this.baseURL}/api/groups/${groupId}/schedule`, {
        schedules: schedules
      }, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage advanced scheduling error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Schedule playlist with priority levels
  async schedulePlaylistWithPriority(playlistId, groupId, schedule, priority = 1) {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.post(`${this.baseURL}/api/schedules`, {
        playlist: playlistId,
        group: groupId,
        priority: priority, // 1 = highest, higher numbers = lower priority
        ...schedule
      }, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage priority scheduling error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create sequenced playlist (combines multiple notices/assets in order)
  async createSequencedPlaylist(name, sequence) {
    try {
      // sequence should be array of: [{ type: 'notice'|'asset', id, duration, order }]
      const assets = [];

      for (let i = 0; i < sequence.length; i++) {
        const item = sequence[i];
        if (item.type === 'asset') {
          assets.push({
            _id: item.id,
            duration: item.duration || 10,
            order: i
          });
        } else if (item.type === 'text') {
          // For text content, we might need to create a text asset first
          assets.push({
            _id: item.id,
            duration: item.duration || 10,
            order: i,
            content: item.content
          });
        }
      }

      return await this.createPlaylist(name, assets, {
        loop: false, // sequenced playlists typically don't loop
        shuffle: false
      });
    } catch (error) {
      console.error('PiSignage sequenced playlist creation error:', error);
      throw error;
    }
  }

  // Get current schedules for a group
  async getGroupSchedules(groupId) {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.get(`${this.baseURL}/api/groups/${groupId}/schedules`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage get group schedules error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update group settings (for advanced playback control)
  async updateGroupSettings(groupId, settings) {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.put(`${this.baseURL}/api/groups/${groupId}`, {
        settings: {
          playbackMode: settings.playbackMode || 'sequential', // sequential, random, priority
          defaultDuration: settings.defaultDuration || 10,
          enableTransitions: settings.enableTransitions !== false,
          ...settings
        }
      }, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage group settings update error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get all groups (boards)
  async getGroups() {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.get(`${this.baseURL}/api/groups`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage get groups error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create a new group
  async createGroup(name, settings = {}) {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.post(`${this.baseURL}/api/groups`, {
        name,
        ...settings
      }, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      return response.data;
    } catch (error) {
      console.error('PiSignage create group error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Delete asset
  async deleteAsset(assetId) {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      await axios.delete(`${this.baseURL}/api/assets/${assetId}`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
    } catch (error) {
      console.error('PiSignage delete asset error:', error.response?.data || error.message);
    }
  }

  // Delete playlist
  async deletePlaylist(playlistId) {
    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      await axios.delete(`${this.baseURL}/api/playlists/${playlistId}`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
    } catch (error) {
      console.error('PiSignage delete playlist error:', error.response?.data || error.message);
    }
  }
}

module.exports = new PiSignageService();