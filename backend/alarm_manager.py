import time
import threading
import uuid
from clock_logic import CircularDoublyLinkedList

class Alarm:
    def __init__(self, name, time, sound_file, is_sleep_alarm=False):
        self.id = str(uuid.uuid4())  # Unique identifier
        self.name = name
        self.time = time  # Tuple (hours, minutes)
        self.sound_file = sound_file
        self.is_active = True
        self.is_sleep_alarm = is_sleep_alarm

class AlarmManager:
    def __init__(self):
        self.alarms = CircularDoublyLinkedList()
        self.is_running = False
        self.alarm_thread = None
    
    def add_alarm(self, alarm_name, alarm_time, sound_file, is_sleep_alarm=False):
        alarm = Alarm(alarm_name, alarm_time, sound_file, is_sleep_alarm)
        self.alarms.insert_at_end(alarm)
        return alarm
    
    def get_alarm_by_id(self, alarm_id):
        if self.alarms.head is None:
            return None
            
        current = self.alarms.head
        if current.data.id == alarm_id:
            return current.data
            
        current = current.next
        while current != self.alarms.head:
            if current.data.id == alarm_id:
                return current.data
            current = current.next
            
        return None
    
    def update_alarm(self, alarm_id, name=None, time=None, sound_file=None, is_active=None):
        alarm = self.get_alarm_by_id(alarm_id)
        if alarm:
            if name is not None:
                alarm.name = name
            if time is not None:
                alarm.time = time
            if sound_file is not None:
                alarm.sound_file = sound_file
            if is_active is not None:
                alarm.is_active = is_active
            return True
        return False
    
    def remove_alarm(self, alarm_id):
        alarm = self.get_alarm_by_id(alarm_id)
        if alarm:
            self.alarms.delete_node(alarm)
            return True
        return False
    
    def remove_alarm_by_time(self, alarm_time):
        current = self.alarms.head
        if current:
            if current.data.time == alarm_time:
                self.alarms.delete_node(current.data)
                return True
            current = current.next
            while current != self.alarms.head:
                if current.data.time == alarm_time:
                    self.alarms.delete_node(current.data)
                    return True
                current = current.next
        return False
    
    def get_alarms(self):
        alarms_list = []
        if self.alarms.head:
            current = self.alarms.head
            alarms_list.append({
                "id": current.data.id,
                "name": current.data.name,
                "time": current.data.time,
                "sound_file": current.data.sound_file,
                "is_active": current.data.is_active,
                "is_sleep_alarm": current.data.is_sleep_alarm
            })
            current = current.next
            while current != self.alarms.head:
                alarms_list.append({
                    "id": current.data.id,
                    "name": current.data.name,
                    "time": current.data.time,
                    "sound_file": current.data.sound_file,
                    "is_active": current.data.is_active,
                    "is_sleep_alarm": current.data.is_sleep_alarm
                })
                current = current.next
        return alarms_list
    
    def start_monitoring(self, callback):
        self.is_running = True
        self.alarm_thread = threading.Thread(target=self._monitor_alarms, args=(callback,))
        self.alarm_thread.daemon = True
        self.alarm_thread.start()
    
    def stop_monitoring(self):
        self.is_running = False
        if self.alarm_thread:
            self.alarm_thread.join()
    
    def _monitor_alarms(self, callback):
        while self.is_running:
            current_time = time.localtime()
            current_hour = current_time.tm_hour
            current_minute = current_time.tm_min
            
            if self.alarms.head:
                current = self.alarms.head
                if (current.data.is_active and 
                    current.data.time[0] == current_hour and 
                    current.data.time[1] == current_minute):
                    callback(current.data)
                
                current = current.next
                while current != self.alarms.head:
                    if (current.data.is_active and 
                        current.data.time[0] == current_hour and 
                        current.data.time[1] == current_minute):
                        callback(current.data)
                    current = current.next
            
            time.sleep(30)  # Check every 30 seconds