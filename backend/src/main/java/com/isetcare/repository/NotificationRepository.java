package com.isetcare.repository;

import com.isetcare.model.Notification;
import com.isetcare.model.TypeNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop50ByUtilisateurIdOrderByDateEnvoiDesc(Long utilisateurId);

    long countByUtilisateurIdAndLueFalse(Long utilisateurId);

    boolean existsByUtilisateurIdAndTypeAndMessage(Long utilisateurId, TypeNotification type, String message);

    @Modifying
    @Query("update Notification n set n.lue = true where n.utilisateur.id = :uid and n.lue = false")
    int marquerToutesLues(@Param("uid") Long utilisateurId);
}
