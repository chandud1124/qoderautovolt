#!/usr/bin/env node
/**
 * Script to find your Raspberry Pi board details
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function findBoard() {
  try {
    console.log('🔍 Finding your Raspberry Pi board...\n');

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@company.com',
      password: 'admin123456'
    });

    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // Get all boards
    const boardsResponse = await axios.get(`${BASE_URL}/boards`, { headers });
    const boards = boardsResponse.data.boards;

    console.log(`📋 Found ${boards.length} total boards:\n`);

    // Find Raspberry Pi boards
    const raspberryPiBoards = boards.filter(board => board.type === 'raspberry_pi');

    if (raspberryPiBoards.length === 0) {
      console.log('❌ No Raspberry Pi boards found');
      return;
    }

    console.log('🍓 Raspberry Pi Boards:');
    raspberryPiBoards.forEach((board, index) => {
      console.log(`${index + 1}. ${board.name}`);
      console.log(`   📍 Location: ${board.location}`);
      console.log(`   🆔 Board ID: ${board._id}`);
      console.log(`   📊 Status: ${board.status}`);
      console.log(`   🌐 Online: ${board.isOnline ? '✅' : '❌'}`);
      console.log(`   📺 MAC: ${board.macAddress || 'Not set'}`);
      console.log(`   🔗 IP: ${board.ipAddress || 'Not set'}`);
      console.log('');
    });

    // Find the "berry" board specifically
    const berryBoard = boards.find(board => board.name.toLowerCase().includes('berry'));

    if (berryBoard) {
      console.log('🎯 Found your "berry" board!');
      console.log('📋 Use this Board ID in your Raspberry Pi configuration:');
      console.log(`🔑 BOARD_ID=${berryBoard._id}`);
      console.log('');
      console.log('📄 Complete .env configuration for Raspberry Pi:');
      console.log('```');
      console.log(`SERVER_URL=http://localhost:3001`);
      console.log(`BOARD_ID=${berryBoard._id}`);
      console.log(`DISPLAY_WIDTH=1920`);
      console.log(`DISPLAY_HEIGHT=1080`);
      console.log(`FULLSCREEN=true`);
      console.log(`CONTENT_UPDATE_INTERVAL=30`);
      console.log(`STATUS_UPDATE_INTERVAL=60`);
      console.log('```');
    } else {
      console.log('⚠️  "berry" board not found. Please check the board name in the web interface.');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

findBoard();