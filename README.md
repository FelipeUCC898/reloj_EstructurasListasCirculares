# Sleep Clock Manager

A comprehensive sleep management application designed for university students to improve their sleep schedule through customizable alarms and world clock tracking.

## Features

### Core Functionality
- **Analog & Digital Clock**: Real-time clock display with both analog and digital formats
- **Custom Alarms**: Set multiple alarms with custom sounds for different purposes
- **Sleep Schedule Management**: Define bedtime and wake-up time with separate alarm sounds
- **World Time Display**: View current time across different time zones
- **Alarm Monitoring**: Background monitoring for active alarms

### Technical Implementation
- **Backend**: Python with custom HTTP server
- **Frontend**: HTML5, CSS3, and vanilla JavaScript
- **Data Structures**: Circular Doubly Linked Lists for clock and alarm management
- **Real-time Updates**: Automatic clock and timezone updates

## Project Structure
sleep-clock-manager/
├── backend/
│ ├── main.py # HTTP server and request handling
│ ├── clock_logic.py # Clock and timezone management
│ └── alarm_manager.py # Alarm system implementation
├── frontend/
│ ├── index.html # Main application interface
│ ├── style.css # Styling and responsive design
│ └── script.js # Frontend functionality
└── README.md # Project documentation


## Installation & Setup

### Prerequisites
- Python 3.7 or higher
- Modern web browser with JavaScript support

### Running the Application

1. **Start the Backend Server**:
   ```bash
   cd backend
   python main.py

