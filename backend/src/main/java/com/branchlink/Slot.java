package com.branchlink;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="slots")
public class Slot {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
  public Long branchId;
  public LocalDateTime startTime;
  public boolean booked;
}
