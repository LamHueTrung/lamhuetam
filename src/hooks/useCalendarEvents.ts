import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { CalendarEvent } from "../types";
import {
  getCalendarEvents,
  saveCalendarEvent,
  deleteCalendarEvent,
  getEventsForSolarDate,
  getUpcomingEvents,
  MatchedDayEvent,
  UpcomingEventItem,
} from "../services/calendarEventService";

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCalendarEvents();
      setEvents(data);
    } catch (err) {
      console.error("Lỗi khi tải danh sách sự kiện:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = useCallback(
    async (eventData: Omit<CalendarEvent, "id">) => {
      try {
        const newEvent: CalendarEvent = {
          ...eventData,
          id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        };
        const saved = await saveCalendarEvent(newEvent);
        setEvents((prev) => [...prev, saved]);
        toast.success(`Đã thêm sự kiện: ${saved.title}!`);
        return saved;
      } catch (err: any) {
        toast.error("Không thể thêm sự kiện!");
        throw err;
      }
    },
    []
  );

  const updateEvent = useCallback(
    async (eventData: CalendarEvent) => {
      try {
        const saved = await saveCalendarEvent(eventData);
        setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
        toast.success(`Đã cập nhật sự kiện: ${saved.title}!`);
        return saved;
      } catch (err: any) {
        toast.error("Không thể cập nhật sự kiện!");
        throw err;
      }
    },
    []
  );

  const deleteEvent = useCallback(
    async (id: string, title?: string) => {
      try {
        await deleteCalendarEvent(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
        toast.success(`Đã xóa sự kiện ${title ? `"${title}"` : ""}!`);
      } catch (err: any) {
        toast.error("Không thể xóa sự kiện!");
        throw err;
      }
    },
    []
  );

  const getEventsForDate = useCallback(
    (solarDateStr: string, includeHolidays = true): MatchedDayEvent[] => {
      return getEventsForSolarDate(solarDateStr, events, includeHolidays);
    },
    [events]
  );

  const upcomingEvents = useMemo<UpcomingEventItem[]>(() => {
    return getUpcomingEvents(events, 60, true);
  }, [events]);

  return {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    upcomingEvents,
    refetch: fetchEvents,
  };
}
