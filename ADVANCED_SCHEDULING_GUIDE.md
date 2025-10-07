# Advanced Scheduling Guide for PiSignage Integration

This guide explains how to use the advanced scheduling features to control content playback order and sequencing on your digital signage displays.

## 🎯 Scheduling Concepts

### Priority Levels
- **1** = Highest priority (plays first)
- **2-5** = Medium priority
- **6+** = Lower priority

### Playback Modes
- **sequential**: Play content in order
- **random**: Random playback
- **priority**: Priority-based playback

## 📋 API Endpoints

### 1. Create Sequenced Playlist
**POST** `/api/notices/sequenced-playlist`

Creates a playlist that plays multiple notices in a specific order.

```json
{
  "name": "Morning Announcements",
  "sequence": [
    {
      "noticeId": "64f1a2b3c4d5e6f7g8h9i0j1",
      "duration": 15
    },
    {
      "noticeId": "64f1a2b3c4d5e6f7g8h9i0j2",
      "duration": 30
    }
  ],
  "targetBoards": ["64f1a2b3c4d5e6f7g8h9i0j3"],
  "schedule": {
    "startTime": "08:00",
    "endTime": "09:00",
    "daysOfWeek": [1,2,3,4,5]
  }
}
```

### 2. Create Advanced Schedule
**POST** `/api/notices/advanced-schedule`

Schedule multiple playlists with different priorities and time slots.

```json
{
  "boardId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "schedules": [
    {
      "playlistId": "playlist_urgent_notices",
      "priority": 1,
      "startTime": "00:00",
      "endTime": "23:59",
      "daysOfWeek": [0,1,2,3,4,5,6]
    },
    {
      "playlistId": "playlist_regular_news",
      "priority": 3,
      "startTime": "09:00",
      "endTime": "17:00",
      "daysOfWeek": [1,2,3,4,5]
    },
    {
      "playlistId": "playlist_evening_events",
      "priority": 2,
      "startTime": "17:00",
      "endTime": "22:00",
      "daysOfWeek": [1,2,3,4,5]
    }
  ]
}
```

### 3. Update Playlist Sequence
**PATCH** `/api/notices/playlist/{playlistId}/sequence`

Reorder assets within a playlist or update settings.

```json
{
  "assets": [
    {"_id": "asset1", "duration": 10},
    {"_id": "asset2", "duration": 20},
    {"_id": "asset3", "duration": 15}
  ],
  "settings": {
    "loop": true,
    "shuffle": false,
    "transition": "slide",
    "transitionDuration": 1500
  }
}
```

### 4. Update Board Settings
**PATCH** `/api/notices/board/{boardId}/settings`

Configure how content plays on a specific board.

```json
{
  "playbackMode": "priority",
  "defaultDuration": 15,
  "enableTransitions": true
}
```

### 5. Get Board Schedules
**GET** `/api/notices/board/{boardId}/schedules`

View current schedules for a board.

## 🎬 Scheduling Examples

### Example 1: Daily Routine
```
08:00-09:00: Morning announcements (Priority 1)
09:00-12:00: Regular notices (Priority 3)
12:00-13:00: Lunch menu (Priority 2)
13:00-17:00: Afternoon notices (Priority 3)
17:00-18:00: End-of-day announcements (Priority 1)
```

### Example 2: Emergency Override
```
Normal schedule (Priority 3)
+ Emergency alerts (Priority 1) - Always play first
+ Important updates (Priority 2) - Play before regular content
```

### Example 3: Event-Based Sequencing
```
Event 1 → Event 2 → Event 3 (no loop)
Or
Continuous loop: Notice A → Notice B → Notice C → Notice A...
```

## 🔧 Configuration Options

### Playlist Settings
- **loop**: Whether to loop the playlist
- **shuffle**: Randomize playback order
- **transition**: fade, slide, zoom, none
- **transitionDuration**: milliseconds

### Schedule Options
- **startTime/endTime**: Time range (HH:MM)
- **daysOfWeek**: [0=Sunday, 6=Saturday]
- **startDate/endDate**: Date range
- **priority**: Playback priority

### Board Settings
- **playbackMode**: sequential/random/priority
- **defaultDuration**: Fallback duration in seconds
- **enableTransitions**: Smooth transitions between content

## 🚀 Usage Workflow

1. **Create Content**: Submit and approve notices
2. **Build Sequences**: Use sequenced playlists for ordered content
3. **Set Priorities**: Configure priority levels for different content types
4. **Schedule**: Assign to boards with time slots and priorities
5. **Monitor**: Check schedules and adjust as needed

This advanced scheduling system gives you complete control over content sequencing and playback order on your digital signage displays.</content>
<parameter name="filePath">C:\Users\IOT\Downloads\aims_smart_class\new-autovolt\ADVANCED_SCHEDULING_GUIDE.md