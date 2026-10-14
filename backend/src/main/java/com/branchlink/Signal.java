package com.branchlink;
import jakarta.persistence.*;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** WebRTC signalling: authenticates by JWT, allows only the 2 participants of an appointment, relays offer/answer/ICE. Media never touches the server. */
@Component
public class Signal extends TextWebSocketHandler {
  @PersistenceContext EntityManager em;
  final Auth auth;
  final Map<Long, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
  public Signal(Auth auth) { this.auth = auth; }

  @Override public void afterConnectionEstablished(WebSocketSession s) throws Exception {
    try {
      Map<String, String> q = UriComponentsBuilder.fromUri(s.getUri()).build().getQueryParams().toSingleValueMap();
      User u = em.find(User.class, Long.valueOf(auth.parse(q.get("token")).getSubject()));
      Appointment a = em.find(Appointment.class, Long.valueOf(q.get("appt")));
      boolean ok = u != null && a != null && ("STAFF".equals(u.role) ? a.branchId.equals(u.branchId) : a.customerId.equals(u.id))
          && (a.status.equals("CONFIRMED") || a.status.equals("IN_PROGRESS"))
          && !java.time.LocalDateTime.now().isBefore(a.startTime);
      Set<WebSocketSession> room = ok ? rooms.computeIfAbsent(a.id, k -> ConcurrentHashMap.newKeySet()) : null;
      if (room == null || room.size() >= 2) { s.close(CloseStatus.POLICY_VIOLATION); return; }
      room.add(s); s.getAttributes().put("room", a.id);
      for (WebSocketSession p : room) if (p != s) send(p, "{\"type\":\"ready\"}");
    } catch (Exception e) { s.close(CloseStatus.POLICY_VIOLATION); }
  }
  @Override protected void handleTextMessage(WebSocketSession s, TextMessage m) {
    Long a = (Long) s.getAttributes().get("room"); if (a == null) return;
    for (WebSocketSession p : rooms.getOrDefault(a, Set.of())) if (p != s && p.isOpen()) send(p, m.getPayload());
  }
  @Override public void afterConnectionClosed(WebSocketSession s, CloseStatus st) {
    Long a = (Long) s.getAttributes().get("room"); if (a == null) return;
    Set<WebSocketSession> r = rooms.get(a); if (r == null) return;
    r.remove(s); for (WebSocketSession p : r) send(p, "{\"type\":\"bye\"}");
    if (r.isEmpty()) rooms.remove(a);
  }
  void send(WebSocketSession p, String t) { try { synchronized (p) { p.sendMessage(new TextMessage(t)); } } catch (Exception ignored) {} }
}
