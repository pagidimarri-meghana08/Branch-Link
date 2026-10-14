package com.branchlink;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="documents")
public class Doc {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
  public Long appointmentId;
  public Long customerId;
  public String customerName;
  public Long branchId;
  public String fileName;
  public @com.fasterxml.jackson.annotation.JsonIgnore String storedName;
  public String status;
  public String remarks;
  public LocalDateTime uploadedAt;
}
