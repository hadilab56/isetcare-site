package com.isetcare.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Active les tâches planifiées (@Scheduled), utilisées pour les rappels de maintenance. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
