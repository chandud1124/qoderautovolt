#!/usr/bin/env node
/**
 * Test script to debug notice submission validation
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function testNoticeSubmission() {
  try {
    console.log('🔍 Testing notice submission validation...\n');

    // Login
    console.log('Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@company.com',
      password: 'admin123456'
    });

    const token = loginResponse.data.token;
    console.log('Login successful, token received');

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    };

    // Get available boards first
    console.log('Fetching available boards...');
    const boardsResponse = await axios.get(`${BASE_URL}/boards?status=active&includeInactive=false`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const boards = boardsResponse.data.boards || [];
    console.log(`Found ${boards.length} active boards:`);
    boards.forEach(board => {
      console.log(`  - ${board.name} (${board._id}) - Type: ${board.type}`);
    });

    if (boards.length === 0) {
      console.log('❌ No active boards found. Cannot test notice submission.');
      return;
    }

    // Test notice submission with minimal data
    console.log('\nTesting notice submission...');

    const formData = new FormData();
    formData.append('title', 'Test Notice for Validation');
    formData.append('content', 'This is a test notice to check validation.');
    formData.append('contentType', 'text');
    formData.append('tags', JSON.stringify(['test', 'validation']));
    formData.append('priority', 'medium');
    formData.append('category', 'general');

    // Add selected boards (use the first available board)
    const selectedBoardIds = [boards[0]._id];
    formData.append('selectedBoards', JSON.stringify(selectedBoardIds));

    console.log('Submitting with selectedBoards:', selectedBoardIds);

    const response = await axios.post(`${BASE_URL}/notices/submit`, formData, { headers });

    console.log('✅ Notice submitted successfully!');
    console.log('Response:', response.data);

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error type:', error.constructor.name);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      if (error.response.data.errors) {
        console.error('Validation Errors:');
        error.response.data.errors.forEach(err => {
          console.error(`  - ${err.msg} (field: ${err.param})`);
        });
      }
    } else if (error.request) {
      console.error('No response received. Request details:', error.request);
    } else {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testNoticeSubmission();