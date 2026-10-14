package com.branchlink;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="audit_log")
public class Audit {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
  public Long branchId;
  public String actor;
  public String action;
  public String details;
  public LocalDateTime ts;
}
