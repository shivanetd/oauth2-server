package com.example.oauth2server.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.Set;

@Entity
@Table(name = "oauth2_registered_client")
@Data
public class Client {
    @Id
    private String id;
    private String clientId;
    private Instant clientIdIssuedAt;
    private String clientSecret;
    private Instant clientSecretExpiresAt;
    private String clientName;
    @Column(length = 1000)
    @ElementCollection
    private Set<String> clientAuthenticationMethods;
    @Column(length = 1000)
    @ElementCollection
    private Set<String> authorizationGrantTypes;
    @Column(length = 1000)
    @ElementCollection
    private Set<String> redirectUris;
    @Column(length = 1000)
    @ElementCollection
    private Set<String> scopes;
    @Column(length = 2000)
    private String clientSettings;
    @Column(length = 2000)
    private String tokenSettings;
}
