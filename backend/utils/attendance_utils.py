from datetime import datetime, time

def get_current_time_slot():
    now = datetime.now().time()
    
    slot1_start = time(7, 50)
    slot1_end = time(9, 30)
    
    slot2_start = time(9, 50)
    slot2_end = time(11, 30)
    
    slot3_start = time(12, 10)
    slot3_end = time(13, 40)
    
    if slot1_start <= now <= slot1_end:
        return "7:50 AM - 9:30 AM"
    elif slot2_start <= now <= slot2_end:
        return "9:50 AM - 11:30 AM"
    elif slot3_start <= now <= slot3_end:
        return "12:10 PM - 1:40 PM"
    
    return None
