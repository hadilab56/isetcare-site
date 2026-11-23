package com.isetcare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@SpringBootApplication
public class IsetCareApplication {
    public static void main(String[] args) {
        convertirUrlPostgres(System.getenv("DB_URL"));
        SpringApplication.run(IsetCareApplication.class, args);
    }

    /**
     * Accepte aussi l'adresse au format Neon / Render :
     * postgresql://utilisateur:motdepasse@hote/base?sslmode=require
     * et la convertit au format JDBC attendu par Spring.
     */
    static void convertirUrlPostgres(String url) {
        if (url == null || !(url.startsWith("postgresql://") || url.startsWith("postgres://"))) return;
        URI uri = URI.create(url.replaceFirst("^postgres(ql)?://", "http://"));
        String port = uri.getPort() > 0 ? ":" + uri.getPort() : "";
        // channel_binding n'est pas un paramètre du pilote Java : on le retire
        String query = uri.getRawQuery() == null ? "" : uri.getRawQuery()
                .replaceAll("(^|&)channel_binding=[^&]*", "").replaceFirst("^&", "");
        System.setProperty("spring.datasource.url",
                "jdbc:postgresql://" + uri.getHost() + port + uri.getRawPath() + (query.isEmpty() ? "" : "?" + query));
        String userInfo = uri.getRawUserInfo();
        if (userInfo != null) {
            String[] parts = userInfo.split(":", 2);
            System.setProperty("spring.datasource.username", URLDecoder.decode(parts[0], StandardCharsets.UTF_8));
            if (parts.length > 1)
                System.setProperty("spring.datasource.password", URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
        }
    }
}
