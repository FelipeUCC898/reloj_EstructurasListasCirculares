import time
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from clock_logic import ClockManager
from alarm_manager import AlarmManager

# Get the absolute path to the project directory
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(PROJECT_DIR, 'frontend')


class SleepClockHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.clock_manager = ClockManager()
        self.alarm_manager = AlarmManager()
        # Start alarm monitoring
        self.alarm_manager.start_monitoring(self.handle_alarm_trigger)
        super().__init__(*args, **kwargs)

    def handle_alarm_trigger(self, alarm):
        print(f"ALARM TRIGGERED: {alarm.time} - Sleep Alarm: {alarm.is_sleep_alarm}")
        # In a real implementation, you would send this to the frontend via WebSocket

    def do_PUT(self):
        parsed_path = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        put_data = self.rfile.read(content_length).decode('utf-8')

        if parsed_path.path == '/update-alarm':
            self.update_alarm(put_data)
        else:
            self.send_error(404, "Endpoint not found")

    def update_alarm(self, put_data):
        try:
            data = json.loads(put_data)
            alarm_id = data['id']
            name = data.get('name')
            time_value = data.get('time')
            sound_file = data.get('sound_file')
            is_active = data.get('is_active')

            success = self.alarm_manager.update_alarm(
                alarm_id,
                name=name,
                time=tuple(time_value) if time_value else None,
                sound_file=sound_file,
                is_active=is_active
            )

            if success:
                self.send_json_response({'status': 'success', 'message': 'Alarm updated successfully'})
            else:
                self.send_json_response({'status': 'error', 'message': 'Alarm not found'}, 404)
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 400)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Map URLs to files
        if path == '/' or path == '':
            self.serve_file('index.html', 'text/html')
        elif path == '/style.css':
            self.serve_file('style.css', 'text/css')
        elif path == '/script.js':
            self.serve_file('script.js', 'application/javascript')
        elif path == '/time':
            self.get_current_time()
        elif path == '/timezones':
            self.get_timezones()
        elif path == '/alarms':
            self.get_alarms()
        else:
            self.send_error(404, f"File not found: {path}")

    def do_POST(self):
        parsed_path = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')

        if parsed_path.path == '/set-alarm':
            self.set_alarm(post_data)
        elif parsed_path.path == '/set-sleep-schedule':
            self.set_sleep_schedule(post_data)
        elif parsed_path.path == '/add-timezone':
            self.add_timezone(post_data)
        elif parsed_path.path == '/remove-alarm':
            self.remove_alarm(post_data)
        else:
            self.send_error(404, "Endpoint not found")

    def serve_file(self, filename, content_type):
        try:
            filepath = os.path.join(FRONTEND_DIR, filename)
            with open(filepath, 'rb') as file:
                self.send_response(200)
                self.send_header('Content-type', content_type)
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(file.read())
        except FileNotFoundError:
            self.send_error(404, f"File not found: {filename}")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

    def get_current_time(self):
        current_time = time.localtime()
        response = {
            'hours': current_time.tm_hour,
            'minutes': current_time.tm_min,
            'seconds': current_time.tm_sec,
            'timestamp': time.time()
        }
        self.send_json_response(response)

    def get_timezones(self):
        timezones = self.clock_manager.get_timezones()
        current_time = time.localtime()

        for tz in timezones:
            tz_time = self.clock_manager.calculate_time_for_timezone(
                (current_time.tm_hour, current_time.tm_min, current_time.tm_sec),
                tz['offset']
            )
            tz['current_time'] = f"{tz_time[0]:02d}:{tz_time[1]:02d}:{tz_time[2]:02d}"

        self.send_json_response(timezones)

    def get_alarms(self):
        alarms = self.alarm_manager.get_alarms()
        self.send_json_response(alarms)

    def set_alarm(self, post_data):
        try:
            data = json.loads(post_data)
            alarm_name = data.get('name', 'Unnamed Alarm')
            alarm_time = tuple(data['time'])
            sound_file = data['sound_file']
            is_sleep_alarm = data.get('is_sleep_alarm', False)

            self.alarm_manager.add_alarm(alarm_name, alarm_time, sound_file, is_sleep_alarm)
            self.send_json_response({'status': 'success', 'message': 'Alarm set successfully'})
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 400)

    def set_sleep_schedule(self, post_data):
        try:
            data = json.loads(post_data)
            bedtime = tuple(data['bedtime'])
            wakeup_time = tuple(data['wakeup_time'])
            bedtime_sound = data.get('bedtime_sound', '')
            wakeup_sound = data.get('wakeup_sound', '')

            alarms = self.alarm_manager.get_alarms()
            for alarm in alarms:
                if alarm['is_sleep_alarm']:
                    self.alarm_manager.remove_alarm(alarm['time'])

            if bedtime_sound:
                self.alarm_manager.add_alarm(bedtime, bedtime_sound, True)
            if wakeup_sound:
                self.alarm_manager.add_alarm(wakeup_time, wakeup_sound, False)

            self.send_json_response({'status': 'success', 'message': 'Sleep schedule saved successfully'})
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 400)

    def add_timezone(self, post_data):
        try:
            data = json.loads(post_data)
            name = data['name']
            offset = data['offset']

            self.clock_manager.add_timezone(name, offset)
            self.send_json_response({'status': 'success', 'message': 'Timezone added successfully'})
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 400)

    def remove_alarm(self, post_data):
        try:
            data = json.loads(post_data)
            alarm_id = data['id']

            success = self.alarm_manager.remove_alarm(alarm_id)
            if success:
                self.send_json_response({'status': 'success', 'message': 'Alarm removed successfully'})
            else:
                self.send_json_response({'status': 'error', 'message': 'Alarm not found'}, 404)
        except Exception as e:
            self.send_json_response({'status': 'error', 'message': str(e)}, 400)

    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def log_message(self, format, *args):
        # Override to reduce console noise
        pass


def run_server():
    os.makedirs(FRONTEND_DIR, exist_ok=True)

    server = HTTPServer(('localhost', 8080), SleepClockHandler)


    print("=" * 60)
    print("Sleep Clock Manager Server")
    print("=" * 60)
    print("Server running on: http://localhost:8080")
    print("Frontend directory:", FRONTEND_DIR)
    print("Press Ctrl+C to stop the server")
    print("=" * 60)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.shutdown()


if __name__ == '__main__':
    run_server()
