package com.isetcare.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

/** Enregistre les photos des réclamations dans un dossier du disque (app.upload-dir, "uploads" par défaut). */
@Service
public class FileStorageService {
    private static final long MAX_SIZE = 5L * 1024 * 1024; // 5 Mo
    private static final Map<String, String> EXT_BY_TYPE = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp", "image/gif", "gif");
    private static final Map<String, MediaType> TYPE_BY_EXT = Map.of(
            "jpg", MediaType.IMAGE_JPEG, "png", MediaType.IMAGE_PNG,
            "webp", MediaType.parseMediaType("image/webp"), "gif", MediaType.IMAGE_GIF);

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir:uploads}") String dir) {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Impossible de créer le dossier d'upload : " + root, e);
        }
    }

    /** Vérifie et enregistre une image. Retourne le nom généré (UUID.ext), ou null si aucun fichier. */
    public String saveImage(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String ext = EXT_BY_TYPE.get(type);
        if (ext == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format d'image non accepté (JPEG, PNG, WebP ou GIF).");
        if (file.getSize() > MAX_SIZE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo trop volumineuse (5 Mo maximum).");
        // Le nom d'origine n'est jamais utilisé : on génère le nôtre (évite les attaques par nom de fichier).
        String name = UUID.randomUUID() + "." + ext;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(name));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer la photo.");
        }
        return name;
    }

    public byte[] read(String name) {
        Path p = root.resolve(name).normalize();
        if (!p.startsWith(root) || !Files.isRegularFile(p))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo introuvable.");
        try {
            return Files.readAllBytes(p);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lecture de la photo impossible.");
        }
    }

    public MediaType mediaType(String name) {
        String ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
        return TYPE_BY_EXT.getOrDefault(ext, MediaType.APPLICATION_OCTET_STREAM);
    }
}
