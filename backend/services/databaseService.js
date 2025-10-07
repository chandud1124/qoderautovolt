const { Sequelize, DataTypes } = require('sequelize');
const mysql = require('mysql2/promise');
const pg = require('pg');
const mssql = require('mssql');
const ContentFeed = require('../models/ContentFeed');
const Notice = require('../models/Notice');

class DatabaseService {
  constructor() {
    this.connections = new Map();
    this.updateIntervals = new Map();
  }

  // Add database feed
  async addFeed(feedConfig) {
    try {
      const {
        name,
        connectionString,
        dbType, // mysql, postgres, mssql
        query,
        updateInterval = 15, // minutes
        autoPublish = false,
        contentMapping = {},
        filters = {},
        primaryKey = 'id'
      } = feedConfig;

      // Test database connection
      const isValid = await this.testConnection(dbType, connectionString);
      if (!isValid) {
        throw new Error('Cannot connect to database');
      }

      // Test query
      const queryResult = await this.testQuery(dbType, connectionString, query);
      if (!queryResult.success) {
        throw new Error(`Query test failed: ${queryResult.error}`);
      }

      const feed = new ContentFeed({
        name,
        type: 'database',
        source: connectionString.split('@')[1]?.split('/')[0] || 'database', // Extract database name
        config: {
          connectionString,
          dbType,
          query,
          updateInterval,
          autoPublish,
          contentMapping,
          filters,
          primaryKey
        },
        status: 'active',
        lastUpdated: new Date(),
        metadata: {
          columnCount: queryResult.columns?.length || 0,
          sampleData: JSON.stringify(queryResult.sampleData).substring(0, 500)
        }
      });

      await feed.save();

      // Start periodic updates
      this.startFeedUpdates(feed._id, updateInterval);

      return { success: true, feed };
    } catch (error) {
      console.error('Error adding database feed:', error);
      throw error;
    }
  }

  // Test database connection
  async testConnection(dbType, connectionString) {
    try {
      switch (dbType) {
        case 'mysql':
          const mysqlConnection = await mysql.createConnection(connectionString);
          await mysqlConnection.execute('SELECT 1');
          await mysqlConnection.end();
          break;

        case 'postgres':
          const pgClient = new pg.Client({ connectionString });
          await pgClient.connect();
          await pgClient.query('SELECT 1');
          await pgClient.end();
          break;

        case 'mssql':
          const mssqlConfig = this.parseConnectionString(connectionString);
          const mssqlPool = new mssql.ConnectionPool(mssqlConfig);
          await mssqlPool.connect();
          await mssqlPool.request().query('SELECT 1');
          await mssqlPool.close();
          break;

        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }

      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // Test database query
  async testQuery(dbType, connectionString, query) {
    try {
      let result;

      switch (dbType) {
        case 'mysql':
          const mysqlConnection = await mysql.createConnection(connectionString);
          const [rows, fields] = await mysqlConnection.execute(query + ' LIMIT 1');
          result = { rows, columns: fields.map(f => f.name) };
          await mysqlConnection.end();
          break;

        case 'postgres':
          const pgClient = new pg.Client({ connectionString });
          await pgClient.connect();
          const pgResult = await pgClient.query(query + ' LIMIT 1');
          result = { rows: pgResult.rows, columns: pgResult.fields.map(f => f.name) };
          await pgClient.end();
          break;

        case 'mssql':
          const mssqlConfig = this.parseConnectionString(connectionString);
          const mssqlPool = new mssql.ConnectionPool(mssqlConfig);
          await mssqlPool.connect();
          const mssqlResult = await mssqlPool.request().query(query + ' TOP 1');
          result = { rows: mssqlResult.recordset, columns: Object.keys(mssqlResult.recordset[0] || {}) };
          await mssqlPool.close();
          break;
      }

      return {
        success: true,
        columns: result.columns,
        sampleData: result.rows[0] || {}
      };
    } catch (error) {
      console.error('Database query test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Parse connection string for MSSQL
  parseConnectionString(connectionString) {
    // Basic parsing for MSSQL connection string
    // Format: mssql://username:password@host:port/database
    const url = new URL(connectionString);

    return {
      user: url.username,
      password: url.password,
      server: url.hostname,
      port: url.port ? parseInt(url.port) : 1433,
      database: url.pathname.substring(1),
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    };
  }

  // Fetch data from database
  async fetchData(feedId) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || feed.type !== 'database') {
        throw new Error('Feed not found or not a database feed');
      }

      const { dbType, connectionString, query, filters, primaryKey } = feed.config;

      let rawData;

      switch (dbType) {
        case 'mysql':
          rawData = await this.fetchMySQLData(connectionString, query);
          break;

        case 'postgres':
          rawData = await this.fetchPostgresData(connectionString, query);
          break;

        case 'mssql':
          rawData = await this.fetchMSSQLData(connectionString, query);
          break;

        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }

      // Apply filters
      const filteredData = this.applyFilters(rawData, filters);

      // Process data into items
      const items = this.processDatabaseItems(filteredData, feed);

      // Cache the results
      this.connections.set(feedId.toString(), {
        data: filteredData,
        items: items,
        lastFetched: new Date()
      });

      // Update feed metadata
      feed.lastUpdated = new Date();
      feed.metadata = {
        itemCount: items.length,
        lastFetchStatus: 'success',
        lastQueryTime: new Date(),
        totalRowsFetched: filteredData.length
      };
      await feed.save();

      return { success: true, data: filteredData, items };
    } catch (error) {
      console.error('Error fetching database data:', error);

      await ContentFeed.findByIdAndUpdate(feedId, {
        'metadata.lastFetchStatus': 'error',
        'metadata.lastError': error.message
      });

      throw error;
    }
  }

  // Fetch data from MySQL
  async fetchMySQLData(connectionString, query) {
    const connection = await mysql.createConnection(connectionString);
    try {
      const [rows] = await connection.execute(query);
      return rows;
    } finally {
      await connection.end();
    }
  }

  // Fetch data from PostgreSQL
  async fetchPostgresData(connectionString, query) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      const result = await client.query(query);
      return result.rows;
    } finally {
      await client.end();
    }
  }

  // Fetch data from MSSQL
  async fetchMSSQLData(connectionString, query) {
    const config = this.parseConnectionString(connectionString);
    const pool = new mssql.ConnectionPool(config);
    try {
      await pool.connect();
      const result = await pool.request().query(query);
      return result.recordset;
    } finally {
      await pool.close();
    }
  }

  // Apply filters to database data
  applyFilters(data, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter(row => {
      // Date filters
      if (filters.dateColumn && filters.dateFrom) {
        const rowDate = new Date(row[filters.dateColumn]);
        const fromDate = new Date(filters.dateFrom);
        if (rowDate < fromDate) return false;
      }

      if (filters.dateColumn && filters.dateTo) {
        const rowDate = new Date(row[filters.dateColumn]);
        const toDate = new Date(filters.dateTo);
        if (rowDate > toDate) return false;
      }

      // Status filters
      if (filters.statusColumn && filters.allowedStatuses) {
        if (!filters.allowedStatuses.includes(row[filters.statusColumn])) return false;
      }

      // Custom filters
      if (filters.custom && Array.isArray(filters.custom)) {
        for (const filter of filters.custom) {
          const value = row[filter.column];
          switch (filter.operator) {
            case 'equals':
              if (value !== filter.value) return false;
              break;
            case 'not_equals':
              if (value === filter.value) return false;
              break;
            case 'contains':
              if (!String(value).includes(filter.value)) return false;
              break;
            case 'greater_than':
              if (value <= filter.value) return false;
              break;
            case 'less_than':
              if (value >= filter.value) return false;
              break;
          }
        }
      }

      return true;
    });
  }

  // Process database rows into display items
  processDatabaseItems(data, feed) {
    const items = [];

    for (const row of data) {
      const processedItem = {
        id: row[feed.config.primaryKey] || `db_${feed._id}_${Date.now()}_${Math.random()}`,
        title: this.mapField(row, feed.config.contentMapping.title) || 'Database Record',
        content: this.mapField(row, feed.config.contentMapping.content) || JSON.stringify(row),
        publishedAt: new Date(),
        feedId: feed._id,
        feedName: feed.name,
        type: 'database',
        rawData: row
      };

      // Add additional mapped fields
      if (feed.config.contentMapping.priority) {
        processedItem.priority = this.mapField(row, feed.config.contentMapping.priority);
      }

      if (feed.config.contentMapping.category) {
        processedItem.category = this.mapField(row, feed.config.contentMapping.category);
      }

      if (feed.config.contentMapping.tags) {
        processedItem.tags = this.mapField(row, feed.config.contentMapping.tags);
        if (!Array.isArray(processedItem.tags)) {
          processedItem.tags = [processedItem.tags];
        }
      }

      items.push(processedItem);
    }

    return items;
  }

  // Map field from database row
  mapField(row, mapping) {
    if (!mapping) return null;

    if (typeof mapping === 'string') {
      return row[mapping];
    }

    if (typeof mapping === 'object' && mapping.column) {
      let value = row[mapping.column];

      // Apply transformations
      if (mapping.transform) {
        switch (mapping.transform) {
          case 'uppercase':
            value = String(value).toUpperCase();
            break;
          case 'lowercase':
            value = String(value).toLowerCase();
            break;
          case 'date_format':
            value = new Date(value).toLocaleDateString();
            break;
          case 'json_parse':
            try {
              value = JSON.parse(value);
            } catch (e) {
              // Keep original value
            }
            break;
        }
      }

      return value;
    }

    return null;
  }

  // Create notices from database data
  async createNoticesFromDatabase(feedId, items = null) {
    try {
      const feed = await ContentFeed.findById(feedId);
      if (!feed || !feed.config.autoPublish) {
        return { success: false, message: 'Auto-publish not enabled for this feed' };
      }

      if (!items) {
        const fetchResult = await this.fetchData(feedId);
        items = fetchResult.items;
      }

      const createdNotices = [];

      for (const item of items) {
        // Check if notice already exists
        const existingNotice = await Notice.findOne({
          'metadata.dbRecordId': item.id,
          'metadata.feedId': feedId
        });

        if (existingNotice) continue;

        // Create notice from database item
        const notice = new Notice({
          title: item.title,
          content: item.content,
          contentType: 'text',
          priority: item.priority || 'medium',
          category: item.category || 'database',
          submittedBy: null, // System generated
          status: 'approved', // Auto-approved for database feeds
          attachments: [],
          tags: item.tags || ['database', 'auto-generated'],
          expiryDate: new Date(Date.now() + (feed.config.contentRetentionDays || 7) * 24 * 60 * 60 * 1000),
          metadata: {
            dbRecordId: item.id,
            feedId: feedId,
            dbType: feed.config.dbType,
            rawData: JSON.stringify(item.rawData).substring(0, 1000)
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
      console.error('Error creating notices from database feed:', error);
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
        await this.fetchData(feedId);

        // Auto-publish if enabled
        const feed = await ContentFeed.findById(feedId);
        if (feed && feed.config.autoPublish) {
          await this.createNoticesFromDatabase(feedId);
        }
      } catch (error) {
        console.error(`Error updating database feed ${feedId}:`, error);
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

  // Get cached database data
  getCachedData(feedId) {
    return this.connections.get(feedId.toString());
  }

  // Get all active database feeds
  async getActiveFeeds() {
    try {
      const feeds = await ContentFeed.find({
        type: 'database',
        status: 'active'
      }).sort({ lastUpdated: -1 });

      return feeds.map(feed => ({
        id: feed._id,
        name: feed.name,
        dbType: feed.config.dbType,
        database: feed.source,
        config: feed.config,
        lastUpdated: feed.lastUpdated,
        metadata: feed.metadata,
        cachedData: this.connections.get(feed._id.toString())
      }));
    } catch (error) {
      console.error('Error getting active database feeds:', error);
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
      console.error('Error updating database feed:', error);
      throw error;
    }
  }

  // Delete database feed
  async deleteFeed(feedId) {
    try {
      this.stopFeedUpdates(feedId);
      this.connections.delete(feedId.toString());

      await ContentFeed.findByIdAndDelete(feedId);

      return { success: true, message: 'Database feed deleted successfully' };
    } catch (error) {
      console.error('Error deleting database feed:', error);
      throw error;
    }
  }

  // Initialize all active feeds on startup
  async initializeFeeds() {
    try {
      const feeds = await ContentFeed.find({
        type: 'database',
        status: 'active'
      });

      for (const feed of feeds) {
        this.startFeedUpdates(feed._id, feed.config.updateInterval);
      }

      console.log(`Initialized ${feeds.length} database feeds`);
    } catch (error) {
      console.error('Error initializing database feeds:', error);
    }
  }

  // Test database connection and query
  async testFeedConfig(feedConfig) {
    try {
      const { dbType, connectionString, query } = feedConfig;

      const connectionValid = await this.testConnection(dbType, connectionString);
      if (!connectionValid) {
        return { success: false, error: 'Database connection failed' };
      }

      const queryResult = await this.testQuery(dbType, connectionString, query);
      if (!queryResult.success) {
        return { success: false, error: queryResult.error };
      }

      return {
        success: true,
        columns: queryResult.columns,
        sampleData: queryResult.sampleData
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DatabaseService();