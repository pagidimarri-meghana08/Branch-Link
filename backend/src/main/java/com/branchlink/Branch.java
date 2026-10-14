package com.branchlink;
import jakarta.persistence.*;
@Entity @Table(name="branches")
public class Branch {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
  public String name;
  public String city;
}
