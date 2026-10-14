package com.branchlink;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="appointments")
public class Appointment {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
  public Long customerId;
  public String customerName;
  public Long branchId;
  public Long slotId;
  public LocalDateTime startTime;
  public String purpose;
  public String status;
  public String remarks;
}
