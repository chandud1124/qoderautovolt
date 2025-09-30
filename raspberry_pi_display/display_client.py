#!/usr/bin/env python3
"""
Raspberry Pi Display Client for AIMS Smart Class System
Displays notices and content from the backend server on connected displays.
"""

import os
import sys
import time
import json
import requests
import logging
import io
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pygame
import pygame.freetype
from pygame.locals import *
import threading
import signal
from dotenv import load_dotenv
import urllib.request
import paho.mqtt.client as mqtt

# Load environment variables from .env file
load_dotenv()

# Configuration
class Config:
    # Server settings
    SERVER_URL = os.getenv('SERVER_URL', 'http://localhost:3001')
    BOARD_ID = os.getenv('BOARD_ID', '')  # Must be set
    API_KEY = os.getenv('API_KEY', '')    # Optional API key for authentication

    # Display settings
    DISPLAY_WIDTH = int(os.getenv('DISPLAY_WIDTH', '1920'))
    DISPLAY_HEIGHT = int(os.getenv('DISPLAY_HEIGHT', '1080'))
    FULLSCREEN = os.getenv('FULLSCREEN', 'true').lower() == 'true'

    # Update intervals (seconds)
    CONTENT_UPDATE_INTERVAL = int(os.getenv('CONTENT_UPDATE_INTERVAL', '30'))
    STATUS_UPDATE_INTERVAL = int(os.getenv('STATUS_UPDATE_INTERVAL', '60'))

    # Display settings
    FONT_SIZE_TITLE = int(os.getenv('FONT_SIZE_TITLE', '48'))
    FONT_SIZE_CONTENT = int(os.getenv('FONT_SIZE_CONTENT', '32'))
    FONT_SIZE_FOOTER = int(os.getenv('FONT_SIZE_FOOTER', '24'))

    # MQTT Configuration
    MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
    MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
    MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'notices/published')

class DisplayManager:
    def __init__(self):
        pygame.init()
        pygame.freetype.init()

        # Set up display
        if Config.FULLSCREEN:
            self.screen = pygame.display.set_mode((Config.DISPLAY_WIDTH, Config.DISPLAY_HEIGHT), pygame.FULLSCREEN)
        else:
            self.screen = pygame.display.set_mode((Config.DISPLAY_WIDTH, Config.DISPLAY_HEIGHT))

        pygame.display.set_caption("AIMS Smart Class Display")
        pygame.mouse.set_visible(False)  # Hide mouse cursor

        # Load fonts
        self.font_title = pygame.freetype.SysFont('Arial', Config.FONT_SIZE_TITLE, bold=True)
        self.font_content = pygame.freetype.SysFont('Arial', Config.FONT_SIZE_CONTENT)
        self.font_footer = pygame.freetype.SysFont('Arial', Config.FONT_SIZE_FOOTER)

        self.current_content = None
        self.last_update = datetime.now()
        self.running = True
        self.image_cache = {}  # Cache for downloaded images

    def clear_screen(self):
        self.screen.fill(Config.BG_COLOR)

    def draw_text(self, text: str, font, color: tuple, x: int, y: int, max_width: Optional[int] = None):
        """Draw text with optional word wrapping"""
        if max_width:
            # Simple word wrapping
            words = text.split(' ')
            lines = []
            current_line = ""

            for word in words:
                test_line = current_line + " " + word if current_line else word
                if font.get_rect(test_line)[2] <= max_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word
            if current_line:
                lines.append(current_line)

            line_height = font.get_sized_height()
            for i, line in enumerate(lines):
                font.render_to(self.screen, (x, y + i * line_height), line, color)
        else:
            font.render_to(self.screen, (x, y), text, color)

    def display_notice(self, notice: Dict[str, Any]):
        """Display a single notice"""
        self.clear_screen()

        # Title
        if 'title' in notice:
            self.draw_text(notice['title'], self.font_title, Config.TITLE_COLOR,
                         50, 50, Config.DISPLAY_WIDTH - 100)

        logging.info(f"Displaying notice: {notice.get('title', 'No title')}")
        logging.info(f"Content: {notice.get('content', 'No content')}")
        logging.info(f"Attachments: {len(notice.get('attachments', []))} found")

        # Check for image attachments
        has_image = False
        if 'attachments' in notice and notice['attachments']:
            for attachment in notice['attachments']:
                logging.info(f"Checking attachment: {attachment.get('originalName')} - {attachment.get('mimetype')}")
                if attachment.get('mimetype', '').startswith('image/'):
                    # Construct full URL if it's a relative path
                    image_url = attachment['url']
                    if image_url.startswith('/'):
                        # It's a relative URL, prepend server URL
                        base_url = Config.SERVER_URL.rstrip('/')
                        image_url = f"{base_url}{image_url}"
                    
                    logging.info(f"Downloading image from: {image_url}")
                    image = self.download_image(image_url)
                    if image:
                        # Display image in center area
                        image_y = 150
                        image_height = Config.DISPLAY_HEIGHT - 250  # Leave space for title and footer
                        self.display_image(image, 50, image_y, Config.DISPLAY_WIDTH - 100, image_height)
                        has_image = True
                        logging.info(f"Displayed image: {attachment['originalName']}")
                        break
                    else:
                        logging.error(f"Failed to load image: {attachment['originalName']}")
        else:
            logging.info("No attachments found in notice")

        # Content (only show if no image or if content exists)
        if not has_image and 'content' in notice:
            content_y = 150
            self.draw_text(notice['content'], self.font_content, Config.TEXT_COLOR,
                         50, content_y, Config.DISPLAY_WIDTH - 100)
            logging.info("Displayed text content")
        elif has_image and 'content' in notice and notice['content'].strip():
            # Show content below image if both exist
            content_y = Config.DISPLAY_HEIGHT - 150
            self.draw_text(notice['content'], self.font_content, Config.TEXT_COLOR,
                         50, content_y, Config.DISPLAY_WIDTH - 100)
            logging.info("Displayed text content below image")
        elif has_image:
            logging.info("Displayed image only (no text content)")

        # Footer with timestamp
        footer_text = f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        self.draw_text(footer_text, self.font_footer, Config.TEXT_COLOR,
                     50, Config.DISPLAY_HEIGHT - 50)

        pygame.display.flip()

    def download_image(self, url: str) -> Optional[pygame.Surface]:
        """Download and load an image from URL"""
        try:
            logging.info(f"Attempting to download image from: {url}")
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            logging.info(f"Image download successful, status: {response.status_code}, content length: {len(response.content)}")
            
            # Load image from bytes
            image = pygame.image.load(io.BytesIO(response.content))
            logging.info(f"Image loaded successfully, size: {image.get_size()}")
            return image
        except requests.RequestException as e:
            logging.error(f"Failed to download image from {url}: {e}")
            return None
        except pygame.error as e:
            logging.error(f"Failed to load image data: {e}")
            return None
        except Exception as e:
            logging.error(f"Unexpected error downloading image: {e}")
            return None

    def display_image(self, image: pygame.Surface, x: int, y: int, max_width: int, max_height: int):
        """Display an image scaled to fit within max dimensions"""
        img_width, img_height = image.get_size()

        # Calculate scaling factor to fit within max dimensions
        scale_x = max_width / img_width
        scale_y = max_height / img_height
        scale = min(scale_x, scale_y, 1.0)  # Don't scale up, only down

        if scale < 1.0:
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)
            image = pygame.transform.smoothscale(image, (new_width, new_height))

        # Center the image
        final_width, final_height = image.get_size()
        center_x = x + (max_width - final_width) // 2
        center_y = y + (max_height - final_height) // 2

        self.screen.blit(image, (center_x, center_y))

    def display_no_content(self):
        """Display when no content is available"""
        self.clear_screen()

        center_x = Config.DISPLAY_WIDTH // 2
        center_y = Config.DISPLAY_HEIGHT // 2

        self.draw_text("No Content Available", self.font_title, Config.TITLE_COLOR,
                     center_x - 200, center_y - 50)

        self.draw_text("Waiting for notices...", self.font_content, Config.TEXT_COLOR,
                     center_x - 150, center_y + 20)

        pygame.display.flip()

    def update_content(self, content_data: Dict[str, Any]):
        """Update the content to be displayed"""
        self.current_content = content_data
        self.last_update = datetime.now()

        # Find the highest priority content to display
        notices = content_data.get('boardNotices', []) + content_data.get('groupContent', [])

        if notices:
            # Sort by priority (highest first) and pick the first one
            notices.sort(key=lambda x: x.get('priority', 0), reverse=True)
            self.display_notice(notices[0])
        else:
            self.display_no_content()

    def run(self):
        """Main display loop"""
        clock = pygame.time.Clock()

        while self.running:
            # Handle events
            for event in pygame.event.get():
                if event.type == pygame.QUIT or (event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE):
                    self.running = False

            # Update display if we have content
            if self.current_content:
                # Check if we need to cycle through multiple notices
                notices = self.current_content.get('boardNotices', []) + self.current_content.get('groupContent', [])
                if len(notices) > 1:
                    # Simple cycling every 10 seconds
                    cycle_time = 10
                    notice_index = int(time.time() / cycle_time) % len(notices)
                    self.display_notice(notices[notice_index])

            clock.tick(30)  # 30 FPS

        pygame.quit()

class APIManager:
    def __init__(self):
        self.session = requests.Session()
        self.last_content_update = datetime.now() - timedelta(seconds=Config.CONTENT_UPDATE_INTERVAL)
        self.last_status_update = datetime.now() - timedelta(seconds=Config.STATUS_UPDATE_INTERVAL)

    def get_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        headers = {'Content-Type': 'application/json'}
        if Config.API_KEY:
            headers['Authorization'] = f'Bearer {Config.API_KEY}'
        return headers

    def get_board_content(self) -> Optional[Dict[str, Any]]:
        """Fetch board content from the server"""
        try:
            url = f"{Config.SERVER_URL}/api/boards/{Config.BOARD_ID}/content"
            response = self.session.get(url, headers=self.get_headers(), timeout=10)

            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return data.get('content', {})
                else:
                    logging.error(f"API returned error: {data.get('message')}")
            else:
                logging.error(f"HTTP {response.status_code}: {response.text}")

        except requests.RequestException as e:
            logging.error(f"Request failed: {e}")

        return None

    def update_board_status(self, status: str = 'active'):
        """Update board online status"""
        try:
            url = f"{Config.SERVER_URL}/api/boards/{Config.BOARD_ID}/status"
            data = {
                'status': status,
                'lastSeen': datetime.now().isoformat(),
                'isOnline': True
            }
            response = self.session.patch(url, json=data, headers=self.get_headers(), timeout=10)

            if response.status_code == 200:
                logging.info("Board status updated successfully")
            else:
                logging.warning(f"Failed to update board status: HTTP {response.status_code}")

        except requests.RequestException as e:
            logging.error(f"Status update failed: {e}")

class MQTTManager:
    def __init__(self, display_manager):
        self.display_manager = display_manager
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        self.connected = False

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logging.info("Connected to MQTT broker")
            self.connected = True
            # Subscribe to notice published topic
            self.client.subscribe(Config.MQTT_TOPIC)
            logging.info(f"Subscribed to topic: {Config.MQTT_TOPIC}")
        else:
            logging.error(f"Failed to connect to MQTT broker: {rc}")

    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            logging.info(f"Received MQTT message on {msg.topic}: {payload}")

            if msg.topic == Config.MQTT_TOPIC:
                # New notice published, update content immediately
                logging.info("Notice published notification received, updating content...")
                api_manager = APIManager()
                content = api_manager.get_board_content()
                if content:
                    self.display_manager.update_content(content)
                    logging.info("Content updated via MQTT notification")

        except Exception as e:
            logging.error(f"Error processing MQTT message: {e}")

    def on_disconnect(self, client, userdata, rc):
        logging.warning(f"Disconnected from MQTT broker: {rc}")
        self.connected = False

    def connect(self):
        try:
            self.client.connect(Config.MQTT_BROKER, Config.MQTT_PORT, 60)
            self.client.loop_start()
            logging.info(f"Attempting to connect to MQTT broker at {Config.MQTT_BROKER}:{Config.MQTT_PORT}")
        except Exception as e:
            logging.error(f"Failed to connect to MQTT broker: {e}")
            logging.info("Falling back to polling-only mode")

    def disconnect(self):
        if self.connected:
            self.client.loop_stop()
            self.client.disconnect()

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/var/log/raspberry_display.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logging.info("Shutdown signal received")
    global display_manager
    if display_manager:
        display_manager.running = False

def main():
    global display_manager

    # Setup logging
    setup_logging()
    logging.info("Starting Raspberry Pi Display Client")

    # Validate configuration
    if not Config.BOARD_ID:
        logging.error("BOARD_ID environment variable is required")
        sys.exit(1)

    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Initialize components
    api_manager = APIManager()
    display_manager = DisplayManager()
    mqtt_manager = MQTTManager(display_manager)

    # Connect to MQTT broker for real-time updates
    mqtt_manager.connect()

    # Update board status on startup
    api_manager.update_board_status('active')

    # Start display thread
    display_thread = threading.Thread(target=display_manager.run, daemon=True)
    display_thread.start()

    logging.info("Display client started successfully")

    try:
        while display_manager.running:
            current_time = datetime.now()

            # Update content periodically
            if (current_time - api_manager.last_content_update).seconds >= Config.CONTENT_UPDATE_INTERVAL:
                content = api_manager.get_board_content()
                if content:
                    display_manager.update_content(content)
                    api_manager.last_content_update = current_time
                    logging.info("Content updated")

            # Update status periodically
            if (current_time - api_manager.last_status_update).seconds >= Config.STATUS_UPDATE_INTERVAL:
                api_manager.update_board_status('active')
                api_manager.last_status_update = current_time

            time.sleep(1)

    except KeyboardInterrupt:
        logging.info("Keyboard interrupt received")
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
    finally:
        # Update status on shutdown
        api_manager.update_board_status('offline')
        # Disconnect from MQTT
        mqtt_manager.disconnect()
        logging.info("Display client stopped")

if __name__ == "__main__":
    main()