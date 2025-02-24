package com.example.oauth2server.dto;

import lombok.Data;

@Data
public class ClientRegistrationRequest {
    private String name;
    private String redirectUri;
}
