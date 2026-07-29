-- Proyecto: DayFlow
-- Versión del esquema académico: 4.0
-- Motor objetivo: MySQL 8.0.46
-- Alineado con los modelos vigentes y las migraciones hasta
-- catalogs.0004 y tickets.0002.
-- Este script crea exclusivamente las nueve tablas funcionales de DayFlow.
-- Para funcionar también fuera del ORM, CURRENT_TIMESTAMP(6) y ON UPDATE
-- reproducen en MySQL el comportamiento de auto_now_add y auto_now de Django.

CREATE DATABASE IF NOT EXISTS `dayflow_db`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE `dayflow_db`;

-- 1. Catálogo cerrado de roles canónicos.
CREATE TABLE IF NOT EXISTS `roles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    `code` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    CONSTRAINT `pk_roles` PRIMARY KEY (`id`),
    CONSTRAINT `roles_code_uniq` UNIQUE (`code`),
    CONSTRAINT `roles_code_canonical_ck`
        CHECK (`code` IN ('ADMINISTRATOR', 'TECHNICIAN', 'EMPLOYEE')),
    INDEX `roles_active_code_idx` (`active`, `code`)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 2. Catálogo de departamentos.
CREATE TABLE IF NOT EXISTS `departments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    `name` VARCHAR(150) NOT NULL,
    `description` LONGTEXT NULL,
    CONSTRAINT `pk_departments` PRIMARY KEY (`id`),
    CONSTRAINT `departments_name_uniq` UNIQUE (`name`),
    CONSTRAINT `departments_name_not_empty` CHECK (`name` <> ''),
    INDEX `departments_active_name_idx` (`active`, `name`)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 3. Catálogo de categorías.
CREATE TABLE IF NOT EXISTS `categories` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    `name` VARCHAR(150) NOT NULL,
    `description` LONGTEXT NULL,
    CONSTRAINT `pk_categories` PRIMARY KEY (`id`),
    CONSTRAINT `categories_name_uniq` UNIQUE (`name`),
    CONSTRAINT `categories_name_not_empty` CHECK (`name` <> ''),
    INDEX `categories_active_name_idx` (`active`, `name`)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 4. Usuarios de la aplicación.
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `password` VARCHAR(128) NOT NULL,
    `last_login` DATETIME(6) NULL DEFAULT NULL,
    `first_name` VARCHAR(150) NOT NULL,
    `last_name` VARCHAR(150) NOT NULL,
    `username` VARCHAR(150) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `job_position` VARCHAR(150) NULL DEFAULT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    `department_id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    CONSTRAINT `pk_users` PRIMARY KEY (`id`),
    CONSTRAINT `users_username_uniq` UNIQUE (`username`),
    CONSTRAINT `users_email_uniq` UNIQUE (`email`),
    INDEX `users_department_idx` (`department_id`),
    INDEX `users_role_idx` (`role_id`),
    CONSTRAINT `fk_users_department`
        FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_users_role`
        FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 5. Tickets y su ciclo operativo.
CREATE TABLE IF NOT EXISTS `tickets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `priority` VARCHAR(8) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),
    `taken_at` DATETIME(6) NULL DEFAULT NULL,
    `closed_at` DATETIME(6) NULL DEFAULT NULL,
    `due_date` DATE NULL DEFAULT NULL,
    `assigned_technician_id` BIGINT NULL DEFAULT NULL,
    `category_id` BIGINT NOT NULL,
    `requester_id` BIGINT NOT NULL,
    `requester_department_id` BIGINT NOT NULL,
    CONSTRAINT `pk_tickets` PRIMARY KEY (`id`),
    CONSTRAINT `tickets_title_not_empty` CHECK (`title` <> ''),
    CONSTRAINT `tickets_description_not_empty` CHECK (`description` <> ''),
    CONSTRAINT `tickets_status_valid`
        CHECK (
            `status` IN (
                'OPEN',
                'IN_PROGRESS',
                'ON_HOLD',
                'COMPLETED',
                'DISMISSED'
            )
        ),
    CONSTRAINT `tickets_priority_valid`
        CHECK (`priority` IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT `tickets_taken_after_created`
        CHECK (`taken_at` IS NULL OR `taken_at` >= `created_at`),
    CONSTRAINT `tickets_closed_after_created`
        CHECK (`closed_at` IS NULL OR `closed_at` >= `created_at`),
    CONSTRAINT `tickets_due_on_after_created`
        CHECK (
            `due_date` IS NULL
            OR `due_date` >= CAST(`created_at` AS DATE)
        ),
    CONSTRAINT `tickets_closed_status_consistent`
        CHECK (
            (
                `status` IN ('COMPLETED', 'DISMISSED')
                AND `closed_at` IS NOT NULL
            )
            OR (
                `status` IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD')
                AND `closed_at` IS NULL
            )
        ),
    INDEX `tickets_status_created_idx` (`status`, `created_at`),
    INDEX `tickets_priority_created_idx` (`priority`, `created_at`),
    INDEX `tickets_requester_created_idx` (`requester_id`, `created_at`),
    INDEX `tickets_assignee_status_idx` (`assigned_technician_id`, `status`),
    INDEX `tickets_category_status_idx` (`category_id`, `status`),
    INDEX `tickets_department_created_idx`
        (`requester_department_id`, `created_at`),
    INDEX `tickets_due_status_idx` (`due_date`, `status`),
    INDEX `tickets_created_idx` (`created_at`),
    INDEX `tickets_taken_idx` (`taken_at`),
    INDEX `tickets_closed_idx` (`closed_at`),
    INDEX `tickets_updated_idx` (`updated_at`),
    CONSTRAINT `fk_tickets_assigned_technician`
        FOREIGN KEY (`assigned_technician_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_tickets_category`
        FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_tickets_requester`
        FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_tickets_requester_department`
        FOREIGN KEY (`requester_department_id`) REFERENCES `departments` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 6. Comentarios asociados a los tickets.
CREATE TABLE IF NOT EXISTS `ticket_comments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `message` LONGTEXT NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `author_id` BIGINT NOT NULL,
    `author_role_id` BIGINT NOT NULL,
    `ticket_id` BIGINT NOT NULL,
    CONSTRAINT `pk_ticket_comments` PRIMARY KEY (`id`),
    CONSTRAINT `ticket_comments_message_not_empty`
        CHECK (`message` <> ''),
    INDEX `comments_ticket_created_idx` (`ticket_id`, `created_at`),
    INDEX `comments_author_created_idx` (`author_id`, `created_at`),
    INDEX `comments_author_role_idx` (`author_role_id`),
    CONSTRAINT `fk_ticket_comments_author`
        FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_ticket_comments_author_role`
        FOREIGN KEY (`author_role_id`) REFERENCES `roles` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_ticket_comments_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 7. Eventos del historial de tickets.
CREATE TABLE IF NOT EXISTS `ticket_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `action_code` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `actor_id` BIGINT NOT NULL,
    `ticket_id` BIGINT NOT NULL,
    CONSTRAINT `pk_ticket_history` PRIMARY KEY (`id`),
    CONSTRAINT `ticket_history_action_not_empty`
        CHECK (`action_code` <> ''),
    INDEX `history_ticket_created_idx` (`ticket_id`, `created_at`),
    INDEX `history_actor_created_idx` (`actor_id`, `created_at`),
    INDEX `history_action_created_idx` (`action_code`, `created_at`),
    CONSTRAINT `fk_ticket_history_actor`
        FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_ticket_history_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 8. Valores modificados por cada evento del historial.
CREATE TABLE IF NOT EXISTS `ticket_history_changes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `field_code` VARCHAR(64) NOT NULL,
    `old_value` LONGTEXT NULL,
    `new_value` LONGTEXT NULL,
    `history_id` BIGINT NOT NULL,
    CONSTRAINT `pk_ticket_history_changes` PRIMARY KEY (`id`),
    CONSTRAINT `history_changes_history_field_uniq`
        UNIQUE (`history_id`, `field_code`),
    CONSTRAINT `history_changes_field_not_empty`
        CHECK (`field_code` <> ''),
    CONSTRAINT `history_changes_has_value`
        CHECK (`old_value` IS NOT NULL OR `new_value` IS NOT NULL),
    CONSTRAINT `fk_history_changes_history`
        FOREIGN KEY (`history_id`) REFERENCES `ticket_history` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- 9. Metadatos de los archivos adjuntos.
CREATE TABLE IF NOT EXISTS `ticket_attachments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL,
    `storage_path` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(255) NOT NULL,
    `size_bytes` BIGINT NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `ticket_id` BIGINT NOT NULL,
    `uploaded_by_id` BIGINT NOT NULL,
    CONSTRAINT `pk_ticket_attachments` PRIMARY KEY (`id`),
    CONSTRAINT `ticket_attachments_storage_path_uniq`
        UNIQUE (`storage_path`),
    CONSTRAINT `attachments_file_name_not_empty`
        CHECK (`file_name` <> ''),
    CONSTRAINT `attachments_mime_type_not_empty`
        CHECK (`mime_type` <> ''),
    CONSTRAINT `attachments_size_nonnegative`
        CHECK (`size_bytes` >= 0),
    INDEX `attachments_ticket_created_idx` (`ticket_id`, `created_at`),
    INDEX `attach_uploader_created_idx` (`uploaded_by_id`, `created_at`),
    CONSTRAINT `fk_ticket_attachments_ticket`
        FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_ticket_attachments_uploaded_by`
        FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
