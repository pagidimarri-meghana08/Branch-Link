package com.branchlink;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;
@Configuration @EnableWebSocket
public class WsConfig implements WebSocketConfigurer {
  final Signal signal; public WsConfig(Signal s) { signal = s; }
  public void registerWebSocketHandlers(WebSocketHandlerRegistry r) { r.addHandler(signal, "/ws").setAllowedOrigins("*"); }
}
