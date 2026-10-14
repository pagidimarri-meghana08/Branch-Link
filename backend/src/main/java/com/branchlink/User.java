package com.branchlink;
import jakarta.persistence.*;
@Entity @Table(name="users")
public class User {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
  public String name;
  public @Column(unique=true) String email;
  public @com.fasterxml.jackson.annotation.JsonIgnore String passwordHash;
  public String role;
  public Long branchId;
}
