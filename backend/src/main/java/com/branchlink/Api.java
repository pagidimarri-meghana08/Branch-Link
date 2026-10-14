package com.branchlink;
import jakarta.persistence.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.File;
import java.nio.file.*;
import java.time.*;
import java.util.*;

@RestController @RequestMapping("/api") @Transactional
public class Api {
  @PersistenceContext EntityManager em;
  final Auth auth;
  final BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
  static final File UP = new File("uploads");
  public Api(Auth auth) { this.auth = auth; }

  public record Reg(String name, String email, String password, Long branchId) {}
  public record Login(String email, String password) {}
  public record Book(Long slotId, String purpose) {}
  public record Gen(String date, int fromHour, int toHour) {}
  public record ProfileReq(String name, String email, String currentPassword, String newPassword) {}
  public record CreateCustomerReq(String name, String email, String password) {}
  public record CreateBranchReq(String name, String city) {}
  public record CreateStaffReq(String name, String email, String password, Long branchId) {}

  // ---------- helpers ----------
  static ResponseStatusException err(int c, String m) { return new ResponseStatusException(HttpStatus.valueOf(c), m); }
  static boolean blank(String s) { return s == null || s.isBlank(); }
  static String fmt(LocalDateTime t) { return t.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM, hh:mm a")); }
  User me(HttpServletRequest r) { User u = em.find(User.class, (Long) r.getAttribute("uid")); if (u == null) throw err(401, "Please log in again"); return u; }
  boolean staff(User u) { return "STAFF".equals(u.role); }
  boolean admin(User u) { return "ADMIN".equals(u.role); }
  User staffOnly(HttpServletRequest r) { User u = me(r); if (!staff(u) && !admin(u)) throw err(403, "Staff only"); return u; }
  User adminOnly(HttpServletRequest r) { User u = me(r); if (!admin(u)) throw err(403, "Admin only"); return u; }
  <T> List<T> q(Class<T> c, String jpql, Object... kv) {
    TypedQuery<T> t = em.createQuery(jpql, c);
    for (int i = 0; i < kv.length; i += 2) t.setParameter((String) kv[i], kv[i + 1]);
    return t.getResultList();
  }
  void audit(User u, Long branch, String action, String details) {
    Audit a = new Audit(); a.branchId = branch; a.actor = u.name + " (" + u.role + ")"; a.action = action; a.details = details; a.ts = LocalDateTime.now(); em.persist(a);
  }
  void note(Long uid, String msg, String target) { Notice n = new Notice(); n.userId = uid; n.message = msg; n.target = target; n.ts = LocalDateTime.now(); em.persist(n); }
  void note(Long uid, String msg) { note(uid, msg, "APPOINTMENTS"); }
  void noteStaff(Long branch, String msg, String target) { for (User s : q(User.class, "select u from User u where u.role='STAFF' and u.branchId=:b", "b", branch)) note(s.id, msg, target); }
  void noteStaff(Long branch, String msg) { noteStaff(branch, msg, "APPOINTMENTS"); }
  void need(boolean ok) { if (!ok) throw err(403, "Not allowed"); }
  void must(Appointment a, String... s) { if (!List.of(s).contains(a.status)) throw err(409, "Not allowed while appointment is " + a.status); }
  void free(Appointment a) { Slot s = em.find(Slot.class, a.slotId); if (s != null) s.booked = false; }
  Appointment access(Long id, User u) {
    Appointment a = em.find(Appointment.class, id); if (a == null) throw err(404, "Appointment not found");
    need(admin(u) || (staff(u) ? a.branchId.equals(u.branchId) : a.customerId.equals(u.id))); return a;
  }
  Map<String, Object> view(User u) {
    Map<String, Object> m = new LinkedHashMap<>(); m.put("id", u.id); m.put("name", u.name); m.put("email", u.email); m.put("role", u.role); m.put("branchId", u.branchId); return m;
  }
  Map<String, Object> session(User u) { Map<String, Object> m = new LinkedHashMap<>(); m.put("token", auth.token(u)); m.put("user", view(u)); return m; }
  Slot addSlot(Long b, LocalDateTime t) {
    if (!q(Slot.class, "select s from Slot s where s.branchId=:b and s.startTime=:t", "b", b, "t", t).isEmpty()) return null;
    Slot s = new Slot(); s.branchId = b; s.startTime = t; s.booked = false; em.persist(s); return s;
  }

  // ---------- auth ----------
  @PostMapping("/auth/register")
  public Map<String, Object> register(@RequestBody Reg r) {
    if (blank(r.name()) || blank(r.email()) || blank(r.password()) || r.branchId() == null) throw err(400, "All fields are required");
    if (r.password().length() < 6) throw err(400, "Password must be at least 6 characters");
    if (em.find(Branch.class, r.branchId()) == null) throw err(400, "Select a valid base branch");
    String email = r.email().trim().toLowerCase();
    if (!q(User.class, "select u from User u where u.email=:e", "e", email).isEmpty()) throw err(409, "Email already registered");
    User u = new User(); u.name = r.name().trim(); u.email = email; u.passwordHash = enc.encode(r.password()); u.role = "CUSTOMER"; u.branchId = r.branchId();
    em.persist(u); audit(u, u.branchId, "REGISTER", email); return session(u);
  }
  @PostMapping("/auth/login")
  public Map<String, Object> login(@RequestBody Login l) {
    List<User> us = q(User.class, "select u from User u where u.email=:e", "e", l.email() == null ? "" : l.email().trim().toLowerCase());
    if (us.isEmpty() || !enc.matches(l.password() == null ? "" : l.password(), us.get(0).passwordHash)) throw err(401, "Invalid email or password");
    User u = us.get(0); audit(u, u.branchId, "LOGIN", u.email); return session(u);
  }
  @GetMapping("/branches") public List<Branch> branches() { return q(Branch.class, "select b from Branch b order by b.name"); }

  // ---------- slots ----------
  @GetMapping("/slots")
  public List<Slot> slots(@RequestParam(required = false) Long branchId, HttpServletRequest r) {
    User u = me(r);
    return q(Slot.class, "select s from Slot s where s.branchId=:b and s.booked=false and s.startTime>:n order by s.startTime", "b", branchId != null ? branchId : u.branchId, "n", LocalDateTime.now());
  }
  @PostMapping("/slots/generate")
  public Map<String, Object> generate(@RequestBody Gen g, HttpServletRequest r) {
    User u = staffOnly(r); int n = 0;
    if (g.fromHour() < 0 || g.toHour() > 24 || g.fromHour() >= g.toHour()) throw err(400, "Invalid hour range");
    LocalDate d; try { d = LocalDate.parse(g.date()); } catch (Exception e) { throw err(400, "Invalid date"); }
    for (LocalDateTime t = d.atTime(g.fromHour(), 0); t.isBefore(d.atStartOfDay().plusHours(g.toHour())); t = t.plusMinutes(30))
      if (t.isAfter(LocalDateTime.now()) && addSlot(u.branchId, t) != null) n++;
    audit(u, u.branchId, "SLOTS_PUBLISHED", n + " slots on " + g.date());
    return Map.of("created", n);
  }
  /** Demo helper: publishes a slot starting in ~2 minutes so the full flow can be shown live. */
  @PostMapping("/slots/quick")
  public Slot quick(HttpServletRequest r) {
    User u = staffOnly(r); LocalDateTime t = LocalDateTime.now().plusMinutes(2).withSecond(0).withNano(0); Slot s;
    while ((s = addSlot(u.branchId, t)) == null) t = t.plusMinutes(1);
    return s;
  }

  // ---------- appointments ----------
  @PostMapping("/appointments")
  public Appointment book(@RequestBody Book b, HttpServletRequest r) {
    User u = me(r); need(!staff(u));
    if (blank(b.purpose()) || b.slotId() == null) throw err(400, "Select a slot and purpose");
    Slot s = em.find(Slot.class, b.slotId(), LockModeType.PESSIMISTIC_WRITE);
    if (s == null || s.booked || s.startTime.isBefore(LocalDateTime.now())) throw err(409, "Slot is no longer available");
    s.booked = true;
    Appointment a = new Appointment(); a.customerId = u.id; a.customerName = u.name; a.branchId = s.branchId; a.slotId = s.id; a.startTime = s.startTime; a.purpose = b.purpose(); a.status = "BOOKED";
    em.persist(a); audit(u, a.branchId, "APPT_BOOKED", a.purpose + " @ " + fmt(a.startTime));
    note(u.id, "Appointment requested for " + fmt(a.startTime) + ". Waiting for branch confirmation.");
    noteStaff(a.branchId, "New appointment request from " + u.name + " for " + fmt(a.startTime) + ".");
    return a;
  }
  @GetMapping("/appointments")
  public List<Appointment> appts(HttpServletRequest r) {
    User u = me(r);
    if (admin(u)) return q(Appointment.class, "select a from Appointment a order by a.startTime desc");
    return staff(u) ? q(Appointment.class, "select a from Appointment a where a.branchId=:b order by a.startTime", "b", u.branchId)
                    : q(Appointment.class, "select a from Appointment a where a.customerId=:c order by a.startTime", "c", u.id);
  }
  @PostMapping("/appointments/{id}/{action}")
  public Appointment act(@PathVariable Long id, @PathVariable String action, @RequestBody(required = false) Map<String, Object> body, HttpServletRequest r) {
    User u = me(r); Appointment a = access(id, u); boolean st = staff(u); String t = fmt(a.startTime);
    switch (action) {
      case "confirm" -> { need(st); must(a, "BOOKED"); a.status = "CONFIRMED"; note(a.customerId, "Your appointment on " + t + " is confirmed. Join the video call at the scheduled time."); }
      case "cancel" -> {
        must(a, "BOOKED", "CONFIRMED"); free(a); a.status = "CANCELLED";
        if (st) note(a.customerId, "Your appointment on " + t + " was cancelled by the branch."); else noteStaff(a.branchId, a.customerName + " cancelled the appointment on " + t + ".");
      }
      case "complete" -> {
        need(st); must(a, "CONFIRMED", "IN_PROGRESS"); a.status = "COMPLETED";
        if (body != null && body.get("remarks") != null) a.remarks = String.valueOf(body.get("remarks"));
        note(a.customerId, "Your session on " + t + " is completed.");
      }
      case "join" -> {
        must(a, "CONFIRMED", "IN_PROGRESS");
        if (LocalDateTime.now().isBefore(a.startTime)) {
          throw err(400, "Cannot join call before the scheduled booking time (" + fmt(a.startTime) + ").");
        }
        a.status = "IN_PROGRESS";
        audit(u, a.branchId, "CALL_JOIN", "Appointment #" + a.id);
      }
      case "reschedule" -> {
        need(st); must(a, "BOOKED", "CONFIRMED");
        if (body == null || body.get("slotId") == null) throw err(400, "slotId required");
        Slot n = em.find(Slot.class, Long.valueOf(String.valueOf(body.get("slotId"))), LockModeType.PESSIMISTIC_WRITE);
        if (n == null || n.booked || !n.branchId.equals(a.branchId) || n.startTime.isBefore(LocalDateTime.now())) throw err(409, "Slot not available");
        free(a); n.booked = true; a.slotId = n.id; a.startTime = n.startTime; a.status = "CONFIRMED";
        note(a.customerId, "Your appointment was rescheduled to " + fmt(n.startTime) + " and is confirmed.");
      }
      default -> throw err(404, "Unknown action");
    }
    if (!action.equals("join")) audit(u, a.branchId, "APPT_" + action.toUpperCase(), "Appointment #" + a.id + " (" + a.customerName + ")");
    return a;
  }

  // ---------- documents ----------
  @PostMapping("/appointments/{id}/documents")
  public Doc upload(@PathVariable Long id, @RequestParam("file") MultipartFile f, HttpServletRequest r) throws Exception {
    User u = me(r); Appointment a = access(id, u); need(!staff(u)); must(a, "BOOKED", "CONFIRMED", "IN_PROGRESS");
    if (f.isEmpty()) throw err(400, "Empty file");
    String name = Optional.ofNullable(f.getOriginalFilename()).orElse("file").replaceAll("[^A-Za-z0-9._-]", "_");
    String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
    if (!List.of("pdf", "png", "jpg", "jpeg").contains(ext)) throw err(400, "Only PDF, PNG or JPG files are allowed");
    UP.mkdirs(); String stored = UUID.randomUUID() + "." + ext;
    Files.copy(f.getInputStream(), UP.toPath().toAbsolutePath().resolve(stored));
    Doc d = new Doc(); d.appointmentId = a.id; d.customerId = u.id; d.customerName = u.name; d.branchId = a.branchId; d.fileName = name; d.storedName = stored; d.status = "PENDING"; d.remarks = ""; d.uploadedAt = LocalDateTime.now();
    em.persist(d); audit(u, a.branchId, "DOC_UPLOAD", name); noteStaff(a.branchId, u.name + " uploaded " + name + " for verification.", "DOCUMENTS");
    return d;
  }
  @GetMapping("/appointments/{id}/documents")
  public List<Doc> apptDocs(@PathVariable Long id, HttpServletRequest r) { access(id, me(r)); return q(Doc.class, "select d from Doc d where d.appointmentId=:a order by d.uploadedAt desc", "a", id); }
  @GetMapping("/documents")
  public List<Doc> docs(HttpServletRequest r) {
    User u = me(r);
    if (admin(u)) return q(Doc.class, "select d from Doc d order by d.uploadedAt desc");
    return staff(u) ? q(Doc.class, "select d from Doc d where d.branchId=:b order by d.uploadedAt desc", "b", u.branchId)
                    : q(Doc.class, "select d from Doc d where d.customerId=:c order by d.uploadedAt desc", "c", u.id);
  }
  @PostMapping("/documents/{id}/review")
  public Doc review(@PathVariable Long id, @RequestBody Map<String, String> b, HttpServletRequest r) {
    User u = staffOnly(r); Doc d = em.find(Doc.class, id);
    if (d == null || (!admin(u) && !d.branchId.equals(u.branchId))) throw err(404, "Document not found");
    String s = b.get("status"); if (!List.of("VERIFIED", "REJECTED").contains(s)) throw err(400, "Invalid status");
    d.status = s; d.remarks = b.getOrDefault("remarks", "");
    audit(u, d.branchId, "DOC_" + s, d.fileName); note(d.customerId, "Your document " + d.fileName + " was " + s.toLowerCase() + (d.remarks.isBlank() ? "." : ": " + d.remarks), "DOCUMENTS");
    return d;
  }
  @GetMapping("/documents/{id}/file")
  public ResponseEntity<FileSystemResource> file(@PathVariable Long id, HttpServletRequest r) {
    User u = me(r); Doc d = em.find(Doc.class, id); if (d == null) throw err(404, "Document not found");
    need(admin(u) || (staff(u) ? d.branchId.equals(u.branchId) : d.customerId.equals(u.id)));
    audit(u, d.branchId, "DOC_VIEW", d.fileName);
    String e = d.storedName.substring(d.storedName.lastIndexOf('.') + 1);
    MediaType mt = e.equals("pdf") ? MediaType.APPLICATION_PDF : e.equals("png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
    return ResponseEntity.ok().contentType(mt).header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + d.fileName + "\"").body(new FileSystemResource(new File(UP, d.storedName)));
  }

  // ---------- notices & audit ----------
  @GetMapping("/notices")
  public List<Notice> notices(HttpServletRequest r) { return em.createQuery("select n from Notice n where n.userId=:u order by n.ts desc", Notice.class).setParameter("u", me(r).id).setMaxResults(30).getResultList(); }
  @PostMapping("/notices/read")
  public void read(HttpServletRequest r) { em.createQuery("update Notice n set n.seen=true where n.userId=:u").setParameter("u", me(r).id).executeUpdate(); }
  @GetMapping("/audit")
  public List<Audit> audit(HttpServletRequest r) {
    User u = me(r);
    if (admin(u)) return em.createQuery("select a from Audit a order by a.ts desc", Audit.class).setMaxResults(100).getResultList();
    if (!staff(u)) throw err(403, "Staff only");
    return em.createQuery("select a from Audit a where a.branchId=:b order by a.ts desc", Audit.class).setParameter("b", u.branchId).setMaxResults(100).getResultList();
  }

  // ---------- user profile update ----------
  @PostMapping("/user/profile")
  public Map<String, Object> updateProfile(@RequestBody ProfileReq req, HttpServletRequest r) {
    User u = me(r);
    if (blank(req.name()) && blank(req.email()) && blank(req.newPassword())) throw err(400, "No changes provided");
    if (!blank(req.name())) u.name = req.name().trim();
    if (!blank(req.email())) {
      String newEmail = req.email().trim().toLowerCase();
      if (!newEmail.equalsIgnoreCase(u.email)) {
        if (!q(User.class, "select u from User u where u.email=:e and u.id!=:id", "e", newEmail, "id", u.id).isEmpty())
          throw err(409, "Email is already registered to another account");
        u.email = newEmail;
      }
    }
    if (!blank(req.newPassword())) {
      if (blank(req.currentPassword()) || !enc.matches(req.currentPassword(), u.passwordHash)) {
        throw err(400, "Current password does not match");
      }
      if (req.newPassword().length() < 6) throw err(400, "New password must be at least 6 characters");
      u.passwordHash = enc.encode(req.newPassword());
    }
    em.merge(u);
    audit(u, u.branchId, "PROFILE_UPDATE", "Updated user details for " + u.email);
    return session(u);
  }

  // ---------- customer management by base branch ----------
  @PostMapping("/customers")
  public Map<String, Object> createCustomer(@RequestBody CreateCustomerReq req, HttpServletRequest r) {
    User staffUser = staffOnly(r);
    if (blank(req.name()) || blank(req.email()) || blank(req.password())) throw err(400, "All fields are required");
    if (req.password().length() < 6) throw err(400, "Password must be at least 6 characters");
    String email = req.email().trim().toLowerCase();
    if (!q(User.class, "select u from User u where u.email=:e", "e", email).isEmpty()) throw err(409, "Email already registered");
    User c = new User();
    c.name = req.name().trim();
    c.email = email;
    c.passwordHash = enc.encode(req.password());
    c.role = "CUSTOMER";
    c.branchId = staffUser.branchId != null ? staffUser.branchId : 1L;
    em.persist(c);
    audit(staffUser, c.branchId, "CUSTOMER_CREATED", "Registered customer " + c.name + " (" + email + ")");
    note(c.id, "Welcome to BranchLink! Your virtual banking account was activated by branch staff.", "APPOINTMENTS");
    return view(c);
  }

  @GetMapping("/customers")
  public List<Map<String, Object>> customers(HttpServletRequest r) {
    User u = me(r);
    List<User> list;
    if (admin(u)) {
      list = q(User.class, "select u from User u where u.role='CUSTOMER' order by u.id desc");
    } else if (staff(u)) {
      list = q(User.class, "select u from User u where u.role='CUSTOMER' and u.branchId=:b order by u.id desc", "b", u.branchId);
    } else {
      throw err(403, "Not allowed");
    }
    return list.stream().map(this::view).toList();
  }

  // ---------- admin endpoints ----------
  @PostMapping("/admin/branches")
  public Branch createBranch(@RequestBody CreateBranchReq req, HttpServletRequest r) {
    User adm = adminOnly(r);
    if (blank(req.name()) || blank(req.city())) throw err(400, "Branch name and city are required");
    Branch b = new Branch();
    b.name = req.name().trim();
    b.city = req.city().trim();
    em.persist(b);
    audit(adm, b.id, "BRANCH_CREATED", "Created base branch: " + b.name + " (" + b.city + ")");
    return b;
  }

  @PostMapping("/admin/staff")
  public Map<String, Object> createStaff(@RequestBody CreateStaffReq req, HttpServletRequest r) {
    User adm = adminOnly(r);
    if (blank(req.name()) || blank(req.email()) || blank(req.password()) || req.branchId() == null) {
      throw err(400, "All fields are required");
    }
    if (req.password().length() < 6) throw err(400, "Password must be at least 6 characters");
    Branch b = em.find(Branch.class, req.branchId());
    if (b == null) throw err(404, "Branch not found");
    String email = req.email().trim().toLowerCase();
    if (!q(User.class, "select u from User u where u.email=:e", "e", email).isEmpty()) {
      throw err(409, "Email is already registered");
    }
    User s = new User();
    s.name = req.name().trim();
    s.email = email;
    s.passwordHash = enc.encode(req.password());
    s.role = "STAFF";
    s.branchId = b.id;
    em.persist(s);
    audit(adm, b.id, "STAFF_CREATED", "Created branch staff account " + s.name + " (" + email + ") for " + b.name);
    return view(s);
  }

  @GetMapping("/admin/staff")
  public List<Map<String, Object>> listStaff(HttpServletRequest r) {
    adminOnly(r);
    List<User> list = q(User.class, "select u from User u where u.role='STAFF' order by u.id desc");
    return list.stream().map(this::view).toList();
  }

  @GetMapping("/admin/stats")
  public Map<String, Object> adminStats(HttpServletRequest r) {
    adminOnly(r);
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("branches", em.createQuery("select count(b) from Branch b", Long.class).getSingleResult());
    m.put("staff", em.createQuery("select count(u) from User u where u.role='STAFF'", Long.class).getSingleResult());
    m.put("customers", em.createQuery("select count(u) from User u where u.role='CUSTOMER'", Long.class).getSingleResult());
    m.put("appointments", em.createQuery("select count(a) from Appointment a", Long.class).getSingleResult());
    return m;
  }
}
