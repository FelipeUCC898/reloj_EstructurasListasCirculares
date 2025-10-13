class Node:
    def __init__(self, data):
        self.data = data
        self.next = None
        self.prev = None

class CircularDoublyLinkedList:
    def __init__(self):
        self.head = None
    
    def insert_at_beginning(self, data):
        new_node = Node(data)
        if not self.head:
            new_node.next = new_node
            new_node.prev = new_node
            self.head = new_node
        else:
            tail = self.head.prev
            new_node.next = self.head
            new_node.prev = tail
            tail.next = new_node
            self.head.prev = new_node
            self.head = new_node
    
    def insert_at_end(self, data):
        new_node = Node(data)
        if not self.head:
            new_node.next = new_node
            new_node.prev = new_node
            self.head = new_node
        else:
            tail = self.head.prev
            tail.next = new_node
            new_node.prev = tail
            new_node.next = self.head
            self.head.prev = new_node

    def delete_node(self, data):
        if self.head is None:
            print("List is empty")
            return

        current = self.head
        if current.data == data:
            if current.next == self.head:  # Only one node
                self.head = None
            else:
                tail = self.head.prev
                self.head = current.next
                tail.next = self.head
                self.head.prev = tail
            return

        while current.next != self.head:
            if current.data == data:
                current.prev.next = current.next
                current.next.prev = current.prev
                return
            current = current.next

        if current.data == data:
            current.prev.next = self.head
            self.head.prev = current.prev
            return

    def print_list(self):
        if self.head is None:
            print("List is empty")
            return
            
        current = self.head
        print(current.data)
        current = current.next
        while current != self.head:
            print(current.data)
            current = current.next

class TimeZone:
    def __init__(self, name, offset):
        self.name = name
        self.offset = offset  # UTC offset in hours

class ClockManager:
    def __init__(self):
        self.timezones = CircularDoublyLinkedList()
        self.alarms = CircularDoublyLinkedList()
        self.sleep_schedule = None
        
        # Add default timezones
        self.add_timezone("UTC", 0)
        self.add_timezone("New York", -5)
        self.add_timezone("London", 0)
        self.add_timezone("Tokyo", 9)
        self.add_timezone("Bogota", -5)
        self.add_timezone("Paris", 1)
        self.add_timezone("Sydney", 11)
    
    def add_timezone(self, name, offset):
        self.timezones.insert_at_end(TimeZone(name, offset))
    
    def remove_timezone(self, name):
        current = self.timezones.head
        if current:
            if current.data.name == name:
                self.timezones.delete_node(current.data)
                return
            current = current.next
            while current != self.timezones.head:
                if current.data.name == name:
                    self.timezones.delete_node(current.data)
                    return
                current = current.next
    
    def get_timezones(self):
        timezones_list = []
        if self.timezones.head:
            current = self.timezones.head
            timezones_list.append({"name": current.data.name, "offset": current.data.offset})
            current = current.next
            while current != self.timezones.head:
                timezones_list.append({"name": current.data.name, "offset": current.data.offset})
                current = current.next
        return timezones_list
    
    def calculate_time_for_timezone(self, base_time, offset):
        # base_time is a tuple (hours, minutes, seconds)
        # offset is in hours
        hours, minutes, seconds = base_time
        
        # Calculate new hours considering timezone offset
        new_hours = (hours + offset) % 24
        if new_hours < 0:
            new_hours += 24
            
        return (new_hours, minutes, seconds)