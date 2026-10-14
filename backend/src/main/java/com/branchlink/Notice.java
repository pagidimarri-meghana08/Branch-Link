package com.branchlink;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="notices")
public class Notice {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
  public Long userId;
  public String message;
  public String target;
  public LocalDateTime ts;
  public boolean seen;
}
