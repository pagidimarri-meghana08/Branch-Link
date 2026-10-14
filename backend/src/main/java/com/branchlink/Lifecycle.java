package com.branchlink;
import jakarta.persistence.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

/** Moves appointments through their lifecycle automatically (30-minute sessions). */
@Component
public class Lifecycle {
  @PersistenceContext EntityManager em;
  @Scheduled(fixedDelay = 15000) @Transactional
  public void tick() {
    LocalDateTime now = LocalDateTime.now(), old = now.minusMinutes(30);
    upd("MISSED", "'CONFIRMED'", "a.startTime<=:t", old);      // confirmed but nobody joined
    upd("EXPIRED", "'BOOKED'", "a.startTime<=:t", old);        // never confirmed by staff
    upd("COMPLETED", "'IN_PROGRESS'", "a.startTime<=:t", old); // session time over
    upd("IN_PROGRESS", "'CONFIRMED'", "a.startTime<=:t", now); // session time reached
  }
  void upd(String to, String from, String cond, LocalDateTime t) {
    em.createQuery("update Appointment a set a.status='" + to + "' where a.status=" + from + " and " + cond).setParameter("t", t).executeUpdate();
  }
}
