const axios = require('axios');
const crypto = require('crypto');
const TelegramUser = require('../models/TelegramUser');
const User = require('../models/User');
const DeviceQueryService = require('./deviceQueryService');
// Removed circular import: const smartNotificationService = require('./smartNotificationService');

class TelegramService {
  constructor() {
    // Defer environment variable access until initialize() is called
    this.botToken = null;
    this.baseUrl = null;
    this.webhookUrl = null;
    this.isInitialized = false;
    this.pollingInterval = null;
    this.lastUpdateId = 0;
  }

  // Initialize the bot
  async initialize() {
    if (this.isInitialized) return;

    // Load environment variables here, after dotenv has been configured
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

    try {
      // Validate required environment variables
      if (!this.botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
      }

      // Try to set webhook if URL is provided
      let webhookSet = false;
      if (this.webhookUrl) {
        try {
          await this.setWebhook(this.webhookUrl);
          webhookSet = true;
          console.log('Telegram webhook mode enabled');
        } catch (webhookError) {
          console.warn('Webhook setup failed, falling back to polling mode:', webhookError.message);
        }
      }

      // If webhook is not set or failed, start polling
      if (!webhookSet) {
        this.startPolling();
        console.log('Telegram polling mode enabled');
      }

      // Clean up expired registration tokens
      await TelegramUser.cleanupExpiredTokens();

      this.isInitialized = true;
      console.log('Telegram service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Telegram service:', error);
      throw error;
    }
  }

  // Set webhook for receiving updates
  async setWebhook(url) {
    try {
      const response = await axios.post(`${this.baseUrl}/setWebhook`, {
        url: url,
        allowed_updates: ['message', 'callback_query']
      });

      if (!response.data.ok) {
        throw new Error(`Webhook setup failed: ${response.data.description}`);
      }

      console.log('Telegram webhook set successfully');
      return response.data;
    } catch (error) {
      console.error('Error setting webhook:', error);
      throw error;
    }
  }

  // Send message to a specific chat
  async sendMessage(chatId, text, options = {}) {
    try {
      const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...options
      };

      const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);

      if (!response.data.ok) {
        throw new Error(`Failed to send message: ${response.data.description}`);
      }

      // Update message count for the user
      await this.updateMessageCount(chatId);

      return response.data.result;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  // Update message count for user
  async updateMessageCount(chatId) {
    try {
      await TelegramUser.findOneAndUpdate(
        { chatId },
        { $inc: { messagesReceived: 1 }, lastInteraction: new Date() }
      );
    } catch (error) {
      console.error('Error updating message count:', error);
    }
  }

  // Send alert to multiple users
  async sendAlert(alertType, alertData, alertLabels = {}) {
    try {
      const subscribers = await TelegramUser.getActiveSubscribers(alertType, alertLabels);

      if (subscribers.length === 0) {
        console.log(`No subscribers found for alert type: ${alertType}`);
        return []; // Return empty array instead of undefined
      }

      const message = this.formatAlertMessage(alertData);

      const results = [];
      for (const subscriber of subscribers) {
        try {
          await this.sendMessage(subscriber.chatId, message);
          await subscriber.recordAlert(alertType);
          results.push({ chatId: subscriber.chatId, success: true });
        } catch (error) {
          console.error(`Failed to send alert to ${subscriber.chatId}:`, error);
          results.push({ chatId: subscriber.chatId, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending alert to subscribers:', error);
      throw error;
    }
  }

  // Format alert message
  formatAlertMessage(alertData) {
    const {
      alertname,
      summary,
      description,
      severity = 'info',
      instance,
      value
    } = alertData;

    const emoji = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    }[severity] || '📢';

    let message = `${emoji} *IoT Classroom Alert* ${emoji}\n\n`;
    message += `*Alert:* ${alertname}\n`;
    message += `*Summary:* ${summary}\n`;

    // Description is already formatted, just add it as-is
    if (description) {
      message += `*Description:* ${description}\n`;
    }

    if (severity) message += `*Severity:* ${severity}\n`;
    if (instance) message += `*Instance:* ${instance}\n`;
    if (value) message += `*Value:* ${value}\n`;

    message += `\n*Time:* ${new Date().toLocaleString()}\n\n`;
    message += `Please take action immediately!`;

    return message;
  }

  // Handle incoming bot commands
  async handleCommand(chatId, command, args = [], telegramUser = null) {
    try {
      switch (command.toLowerCase()) {
        case '/start':
          return await this.handleStart(chatId, telegramUser);

        case '/register':
          return await this.handleRegister(chatId, args, telegramUser);

        case '/status':
          return await this.handleStatus(chatId, telegramUser);

        case '/subscribe':
          return await this.handleSubscribe(chatId, args, telegramUser);

        case '/unsubscribe':
          return await this.handleUnsubscribe(chatId, args, telegramUser);

        case '/devices':
        case '/device':
          return await DeviceQueryService.handleDeviceQuery(chatId, args.join(' '), this, telegramUser);

        case '/help':
          return await this.handleHelp(chatId);

        default:
          return await this.sendMessage(chatId, 'Unknown command. Use /help to see available commands.');
      }
    } catch (error) {
      console.error('Error handling command:', error);
      await this.sendMessage(chatId, 'Sorry, an error occurred while processing your command.');
    }
  }

  // Handle /start command
  async handleStart(chatId, telegramUser) {
    if (telegramUser) {
      return await this.sendMessage(
        chatId,
        `Welcome back! You're already registered with the IoT Classroom system.\n\nUse /help to see available commands.`
      );
    }

    const welcomeMessage = `🤖 *Welcome to IoT Classroom Bot!*\n\n` +
      `This bot sends you important notifications about:\n` +
      `- Device offline alerts\n` +
      `- Energy conservation reminders\n` +
      `- Security notifications\n` +
      `- System maintenance alerts\n\n` +
      `To get started, you need to register with your system account.\n\n` +
      `Use: \`/register <your-email>\`\n\n` +
      `Example: \`/register john@university.edu\`\n\n` +
      `Use /help for more commands.`;

    return await this.sendMessage(chatId, welcomeMessage);
  }

  // Handle /register command
  async handleRegister(chatId, args, telegramUser) {
    if (telegramUser) {
      return await this.sendMessage(
        chatId,
        `You're already registered! Use /status to check your current settings.`
      );
    }

    if (args.length === 0) {
      return await this.sendMessage(
        chatId,
        `Please provide your email address.\n\nUsage: \`/register <your-email>\`\nExample: \`/register john@university.edu\``
      );
    }

    const email = args[0].toLowerCase().trim();

    try {
      // Find user by email
      const user = await User.findOne({ email, isActive: true, isApproved: true });

      if (!user) {
        return await this.sendMessage(
          chatId,
          `❌ No active user found with email: ${email}\n\nPlease check your email address and try again.`
        );
      }

      // Check if user already has Telegram registration
      const existingTelegramUser = await TelegramUser.findOne({ user: user._id });
      if (existingTelegramUser) {
        return await this.sendMessage(
          chatId,
          `❌ This email is already registered with another Telegram account.\n\nIf you need to change your registration, please contact an administrator.`
        );
      }

      // Generate registration token
      const token = crypto.randomBytes(6).toString('hex').toUpperCase();

      // Create Telegram user record
      const newTelegramUser = new TelegramUser({
        user: user._id,
        telegramId: chatId, // Using chatId as telegramId for simplicity
        chatId: chatId,
        registrationToken: token,
        tokenExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        isVerified: false
      });

      await newTelegramUser.save();

      // Send verification message
      const verifyMessage = `✅ *Registration Started!*\n\n` +
        `Hello ${user.name}!\n\n` +
        `Your verification code is: \`${token}\`\n\n` +
        `Please verify your registration by replying with this code within 10 minutes.\n\n` +
        `This code will expire automatically.`;

      return await this.sendMessage(chatId, verifyMessage);

    } catch (error) {
      console.error('Error in registration:', error);
      return await this.sendMessage(
        chatId,
        `❌ An error occurred during registration. Please try again later.`
      );
    }
  }

  // Handle verification code
  async handleVerification(chatId, code) {
    try {
      const telegramUser = await TelegramUser.findOne({
        chatId,
        registrationToken: code.toUpperCase(),
        tokenExpires: { $gt: new Date() }
      }).populate('user');

      if (!telegramUser) {
        return await this.sendMessage(
          chatId,
          `❌ Invalid or expired verification code.\n\nPlease start registration again with \`/register <your-email>\``
        );
      }

      // Complete verification
      telegramUser.clearToken();
      await telegramUser.save();

      // Update user's notification preferences
      await User.findByIdAndUpdate(telegramUser.user._id, {
        'notificationPreferences.telegram': true
      });

      const successMessage = `🎉 *Registration Complete!*\n\n` +
        `Welcome ${telegramUser.user.name}!\n\n` +
        `You're now registered to receive IoT Classroom notifications.\n\n` +
        `Your current subscriptions:\n` +
        `- ${telegramUser.roleSubscriptions.join('\n- ')}\n\n` +
        `Use /help to see available commands.`;

      return await this.sendMessage(chatId, successMessage);

    } catch (error) {
      console.error('Error in verification:', error);
      return await this.sendMessage(
        chatId,
        `❌ An error occurred during verification. Please try again.`
      );
    }
  }

  // Handle /status command
  async handleStatus(chatId, telegramUser) {
    if (!telegramUser) {
      return await this.sendMessage(
        chatId,
        `❌ You're not registered yet.\n\nUse \`/register <your-email>\` to get started.`
      );
    }

    await telegramUser.populate('user');

    const statusMessage = `📊 *Your Status*\n\n` +
      `*Name:* ${telegramUser.user.name}\n` +
      `*Role:* ${telegramUser.user.role}\n` +
      `*Email:* ${telegramUser.user.email}\n\n` +
      `*Telegram Status:* ${telegramUser.isVerified ? '✅ Verified' : '⏳ Pending'}\n` +
      `*Active:* ${telegramUser.isActive ? '✅ Yes' : '❌ No'}\n\n` +
      `*Current Subscriptions:*\n${telegramUser.roleSubscriptions.map(sub => `- ${sub}`).join('\n')}\n\n` +
      `*Alerts Received:* ${telegramUser.alertsReceived}\n` +
      `*Last Alert:* ${telegramUser.lastAlertReceived ? telegramUser.lastAlertReceived.toLocaleString() : 'Never'}\n\n` +
      `Use /subscribe or /unsubscribe to manage your preferences.`;

    return await this.sendMessage(chatId, statusMessage);
  }

  // Handle /subscribe command
  async handleSubscribe(chatId, args, telegramUser) {
    if (!telegramUser) {
      return await this.sendMessage(
        chatId,
        `❌ You're not registered yet.\n\nUse \`/register <your-email>\` to get started.`
      );
    }

    if (args.length === 0) {
      const availableSubs = [
        'admin_alerts', 'security_alerts', 'maintenance_alerts',
        'energy_alerts', 'system_alerts', 'user_alerts'
      ];

      return await this.sendMessage(
        chatId,
        `📋 *Available Subscriptions:*\n\n${availableSubs.map(sub => `- ${sub}`).join('\n')}\n\n` +
        `Usage: \`/subscribe <subscription>\`\nExample: \`/subscribe energy_alerts\``
      );
    }

    const subscription = args[0].toLowerCase();

    if (!telegramUser.roleSubscriptions.includes(subscription)) {
      telegramUser.roleSubscriptions.push(subscription);
      await telegramUser.save();

      return await this.sendMessage(
        chatId,
        `✅ Successfully subscribed to: *${subscription}*`
      );
    } else {
      return await this.sendMessage(
        chatId,
        `ℹ️ You're already subscribed to: *${subscription}*`
      );
    }
  }

  // Handle /unsubscribe command
  async handleUnsubscribe(chatId, args, telegramUser) {
    if (!telegramUser) {
      return await this.sendMessage(
        chatId,
        `❌ You're not registered yet.\n\nUse \`/register <your-email>\` to get started.`
      );
    }

    if (args.length === 0) {
      return await this.sendMessage(
        chatId,
        `📋 *Your Current Subscriptions:*\n\n${telegramUser.roleSubscriptions.map(sub => `- ${sub}`).join('\n')}\n\n` +
        `Usage: \`/unsubscribe <subscription>\`\nExample: \`/unsubscribe energy_alerts\``
      );
    }

    const subscription = args[0].toLowerCase();
    const index = telegramUser.roleSubscriptions.indexOf(subscription);

    if (index > -1) {
      telegramUser.roleSubscriptions.splice(index, 1);
      await telegramUser.save();

      return await this.sendMessage(
        chatId,
        `✅ Successfully unsubscribed from: *${subscription}*`
      );
    } else {
      return await this.sendMessage(
        chatId,
        `ℹ️ You're not subscribed to: *${subscription}*`
      );
    }
  }

  // Handle /help command
  async handleHelp(chatId) {
    const helpMessage = `🤖 *IoT Classroom Bot Commands*\n\n` +
      `*Registration:*\n` +
      `/start - Welcome message and registration info\n` +
      `/register <email> - Register with your system email\n` +
      `/status - Check your registration and subscription status\n\n` +
      `*Subscriptions:*\n` +
      `/subscribe <type> - Subscribe to alert types\n` +
      `/unsubscribe <type> - Unsubscribe from alert types\n\n` +
      `*Device Queries:*\n` +
      `/devices - Device management commands\n` +
      `Or simply ask questions like:\n` +
      `- "Show offline devices"\n` +
      `- "What's the status of Computer_Lab?"\n` +
      `- "Devices in LH_19g"\n` +
      `- "List all devices"\n\n` +
      `*Available Alert Types:*\n` +
      `- admin_alerts - All administrative alerts\n` +
      `- security_alerts - Security-related notifications\n` +
      `- maintenance_alerts - Device maintenance alerts\n` +
      `- energy_alerts - Energy conservation alerts\n` +
      `- system_alerts - System health notifications\n` +
      `- user_alerts - User-related notifications\n\n` +
      `/help - Show this help message\n\n` +
      `💡 *Tip:* You can ask questions in natural language!`;

    return await this.sendMessage(chatId, helpMessage);
  }

  // Process incoming webhook updates
  async processWebhookUpdate(update) {
    try {
      const { message } = update;

      if (!message || !message.chat) return;

      const chatId = message.chat.id.toString();
      const text = message.text?.trim();

      if (!text) return;

      // Find or create telegram user record
      let telegramUser = await TelegramUser.findByChatId(chatId);

      // Handle verification codes (6-character alphanumeric)
      if (text.length === 6 && /^[A-Z0-9]+$/.test(text)) {
        return await this.handleVerification(chatId, text);
      }

      // Handle commands
      if (text.startsWith('/')) {
        const parts = text.split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        return await this.handleCommand(chatId, command, args, telegramUser);
      }

      // Handle natural language queries about devices
      if (telegramUser && this.isDeviceQuery(text)) {
        return await DeviceQueryService.handleDeviceQuery(chatId, text, this, telegramUser);
      }

      // Handle unknown messages
      if (telegramUser) {
        return await this.sendMessage(
          chatId,
          `I didn't understand that command. Use /help to see available commands, or ask me questions like:\n\n` +
          `- "Show offline devices"\n` +
          `- "What's the status of Computer_Lab?"\n` +
          `- "Devices in LH_19g"`
        );
      } else {
        return await this.sendMessage(
          chatId,
          `Please start by registering with /register <your-email> or use /help for more information.`
        );
      }

    } catch (error) {
      console.error('Error processing webhook update:', error);
    }
  }

  // Start polling for updates
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Poll every 2 seconds
    this.pollingInterval = setInterval(() => {
      this.pollUpdates().catch(error => {
        console.error('Error polling for updates:', error);
      });
    }, 2000);

    console.log('Telegram polling started');
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Telegram polling stopped');
    }
  }

  // Poll for updates
  async pollUpdates() {
    try {
      const response = await axios.get(`${this.baseUrl}/getUpdates`, {
        params: {
          offset: this.lastUpdateId + 1,
          timeout: 30, // Long polling timeout
          allowed_updates: ['message', 'callback_query']
        }
      });

      if (response.data.ok && response.data.result.length > 0) {
        for (const update of response.data.result) {
          // Process each update
          await this.processWebhookUpdate(update);

          // Update last processed update ID
          if (update.update_id > this.lastUpdateId) {
            this.lastUpdateId = update.update_id;
          }
        }
      }
    } catch (error) {
      console.error('Error polling updates:', error);
    }
  }
}

module.exports = new TelegramService();
