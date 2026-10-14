package com.branchlink;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/** JWT creation/validation + servlet filter that protects every /api route except login, register and branch list. */
@Component
public class Auth extends OncePerRequestFilter {
  final SecretKey key = Keys.hmacShaKeyFor(System.getenv().getOrDefault("JWT_SECRET", "branchlink-demo-secret-key-change-me-0123456789").getBytes(StandardCharsets.UTF_8));
  public String token(User u) { return Jwts.builder().subject(String.valueOf(u.id)).expiration(new Date(System.currentTimeMillis() + 8 * 3600_000L)).signWith(key).compact(); }
  public Claims parse(String t) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(t).getPayload(); }
  @Override protected boolean shouldNotFilter(HttpServletRequest r) {
    if ("OPTIONS".equalsIgnoreCase(r.getMethod())) return true;
    String p = r.getRequestURI(); return !p.startsWith("/api/") || p.startsWith("/api/auth/") || p.equals("/api/branches");
  }
  @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws IOException, jakarta.servlet.ServletException {
    try {
      String h = req.getHeader("Authorization");
      if (h == null || !h.startsWith("Bearer ")) throw new JwtException("missing");
      req.setAttribute("uid", Long.valueOf(parse(h.substring(7)).getSubject()));
    } catch (Exception e) {
      res.setStatus(401); res.setContentType("application/json");
      res.getWriter().write("{\"message\":\"Session expired. Please log in again.\"}"); return;
    }
    chain.doFilter(req, res);
  }
}
