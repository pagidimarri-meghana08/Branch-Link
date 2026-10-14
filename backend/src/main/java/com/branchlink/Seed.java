package com.branchlink;
import jakarta.persistence.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class Seed implements CommandLineRunner {
  @PersistenceContext EntityManager em;
  @Override @Transactional
  public void run(String... args) {
    if (em.createQuery("select count(u) from User u where u.email='admin@branchlink.com'", Long.class).getSingleResult() == 0) {
      user("System Administrator", "admin@branchlink.com", "admin123", "ADMIN", null);
    }
    if (em.createQuery("select count(b) from Branch b", Long.class).getSingleResult() > 0) return;
    Branch b1 = branch("Vijayawada Main Branch", "Vijayawada"), b2 = branch("Warangal Hanamkonda Branch", "Warangal");
    user("Vijayawada Branch Staff", "staff1@branchlink.com", "staff123", "STAFF", b1.id);
    user("Warangal Branch Staff", "staff2@branchlink.com", "staff123", "STAFF", b2.id);
    user("Demo Customer", "customer@branchlink.com", "demo123", "CUSTOMER", b1.id);
  }
  Branch branch(String n, String c) { Branch b = new Branch(); b.name = n; b.city = c; em.persist(b); return b; }
  void user(String n, String e, String p, String r, Long b) {
    User u = new User(); u.name = n; u.email = e; u.passwordHash = new BCryptPasswordEncoder().encode(p); u.role = r; u.branchId = b; em.persist(u);
  }
}
