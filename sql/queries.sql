-- Compatible con MySQL 8.0.46.
-- Archivo de solo lectura: no modifica datos ni define credenciales.

USE dayflow_db;

SET @report_date = DATE('2026-08-03');

-- REPORTE 1: Resumen de tickets por estado.
-- Muestra el volumen actual en cada etapa del flujo y sirve para evaluar la carga operativa.
SELECT
    t.status AS status_code,
    CASE t.status
        WHEN 'OPEN' THEN 'Abierto'
        WHEN 'IN_PROGRESS' THEN 'En proceso'
        WHEN 'ON_HOLD' THEN 'En espera'
        WHEN 'COMPLETED' THEN 'Completado'
        WHEN 'DISMISSED' THEN 'Desestimado'
    END AS status_name,
    COUNT(*) AS ticket_count
FROM tickets AS t
GROUP BY t.status
ORDER BY FIELD(
    t.status,
    'OPEN',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
    'DISMISSED'
);

-- REPORTE 2: Distribución de tickets por prioridad.
-- Muestra cuántos tickets existen en cada nivel y sirve para dimensionar urgencia y riesgo.
SELECT
    t.priority AS priority_code,
    CASE t.priority
        WHEN 'CRITICAL' THEN 'Crítica'
        WHEN 'HIGH' THEN 'Alta'
        WHEN 'MEDIUM' THEN 'Media'
        WHEN 'LOW' THEN 'Baja'
    END AS priority_name,
    COUNT(*) AS ticket_count
FROM tickets AS t
GROUP BY t.priority
ORDER BY FIELD(t.priority, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- REPORTE 3: Tickets por categoría.
-- Muestra demanda y cierres por categoría; sirve para detectar áreas de soporte recurrentes.
SELECT
    c.id AS category_id,
    c.name AS category_name,
    COUNT(t.id) AS ticket_count,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed_count
FROM categories AS c
LEFT JOIN tickets AS t
    ON t.category_id = c.id
GROUP BY c.id, c.name
ORDER BY ticket_count DESC, c.name ASC;

-- REPORTE 4: Demanda de soporte por departamento solicitante.
-- Muestra tickets totales, activos y cerrados por departamento para orientar recursos.
SELECT
    d.id AS department_id,
    d.name AS department_name,
    COUNT(t.id) AS ticket_count,
    COUNT(
        CASE
            WHEN t.status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD') THEN 1
        END
    ) AS active_count,
    COUNT(
        CASE
            WHEN t.status IN ('COMPLETED', 'DISMISSED') THEN 1
        END
    ) AS closed_count
FROM departments AS d
LEFT JOIN tickets AS t
    ON t.requester_department_id = d.id
GROUP BY d.id, d.name
ORDER BY ticket_count DESC, d.name ASC;

-- REPORTE 5: Ranking de técnicos.
-- Ordena técnicos por cierres y carga; sirve para comparar desempeño y distribuir trabajo.
SELECT
    u.id AS technician_id,
    CONCAT_WS(' ', u.first_name, u.last_name) AS technician_name,
    d.name AS department_name,
    COUNT(t.id) AS assigned_count,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed_count,
    COUNT(
        CASE
            WHEN t.status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD') THEN 1
        END
    ) AS active_count
FROM users AS u
INNER JOIN roles AS r
    ON r.id = u.role_id
INNER JOIN departments AS d
    ON d.id = u.department_id
LEFT JOIN tickets AS t
    ON t.assigned_technician_id = u.id
WHERE r.code = 'TECHNICIAN'
GROUP BY
    u.id,
    u.first_name,
    u.last_name,
    d.id,
    d.name
ORDER BY
    completed_count DESC,
    assigned_count DESC,
    technician_name ASC;

-- REPORTE 6: Promedio de resolución por técnico.
-- Calcula horas desde creación hasta cierre de tickets completados para comparar eficiencia.
SELECT
    u.id AS technician_id,
    CONCAT_WS(' ', u.first_name, u.last_name) AS technician_name,
    COUNT(t.id) AS completed_count,
    ROUND(
        AVG(TIMESTAMPDIFF(MINUTE, t.created_at, t.closed_at)) / 60.0,
        2
    ) AS average_resolution_hours
FROM users AS u
INNER JOIN roles AS r
    ON r.id = u.role_id
LEFT JOIN tickets AS t
    ON t.assigned_technician_id = u.id
    AND t.status = 'COMPLETED'
    AND t.closed_at IS NOT NULL
WHERE r.code = 'TECHNICIAN'
GROUP BY u.id, u.first_name, u.last_name
ORDER BY
    average_resolution_hours IS NULL ASC,
    average_resolution_hours ASC,
    technician_name ASC;

-- REPORTE 7: Tickets vencidos que todavía no están cerrados.
-- Lista pendientes cuya fecha límite ya pasó y calcula sus días de atraso para priorizarlos.
SELECT
    t.id AS ticket_id,
    t.title,
    t.status,
    t.priority,
    c.name AS category_name,
    d.name AS department_name,
    CONCAT_WS(' ', u.first_name, u.last_name) AS technician_name,
    t.due_date,
    DATEDIFF(@report_date, t.due_date) AS overdue_days
FROM tickets AS t
INNER JOIN categories AS c
    ON c.id = t.category_id
INNER JOIN departments AS d
    ON d.id = t.requester_department_id
LEFT JOIN users AS u
    ON u.id = t.assigned_technician_id
WHERE
    t.due_date IS NOT NULL
    AND t.due_date < @report_date
    AND t.status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD')
ORDER BY
    t.due_date ASC,
    FIELD(t.priority, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
    t.id ASC;

-- REPORTE 8: Tickets próximos a vencer.
-- Lista tickets activos que vencen entre mañana y los próximos tres días para prevenir atrasos.
SELECT
    t.id AS ticket_id,
    t.title,
    t.status,
    t.priority,
    c.name AS category_name,
    CONCAT_WS(' ', u.first_name, u.last_name) AS technician_name,
    t.due_date,
    DATEDIFF(t.due_date, @report_date) AS days_remaining
FROM tickets AS t
INNER JOIN categories AS c
    ON c.id = t.category_id
LEFT JOIN users AS u
    ON u.id = t.assigned_technician_id
WHERE
    t.status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD')
    AND t.due_date BETWEEN
        DATE_ADD(@report_date, INTERVAL 1 DAY)
        AND DATE_ADD(@report_date, INTERVAL 3 DAY)
ORDER BY
    t.due_date ASC,
    FIELD(t.priority, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
    t.id ASC;

-- REPORTE 9: Evolución mensual disponible de tickets creados entre enero y agosto de 2026.
SELECT
    YEAR(t.created_at) AS report_year,
    MONTH(t.created_at) AS report_month,
    DATE_FORMAT(t.created_at, '%Y-%m') AS period,
    COUNT(*) AS created_count,
    COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN t.status = 'DISMISSED' THEN 1 END) AS dismissed_count,
    COUNT(
        CASE
            WHEN t.status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD') THEN 1
        END
    ) AS active_count
FROM tickets AS t
WHERE
    t.created_at >= '2026-01-01 00:00:00'
    AND t.created_at < '2027-01-01 00:00:00'
GROUP BY
    YEAR(t.created_at),
    MONTH(t.created_at),
    DATE_FORMAT(t.created_at, '%Y-%m')
ORDER BY report_year ASC, report_month ASC;

-- REPORTE 10: Informe anual de tickets completados en 2026.
-- Resume cierres por mes, técnicos participantes y tiempo medio de resolución para el informe anual.
SELECT
    YEAR(t.closed_at) AS report_year,
    MONTH(t.closed_at) AS report_month,
    DATE_FORMAT(t.closed_at, '%Y-%m') AS period,
    COUNT(*) AS completed_count,
    COUNT(DISTINCT t.assigned_technician_id) AS technician_count,
    ROUND(
        AVG(TIMESTAMPDIFF(MINUTE, t.created_at, t.closed_at)) / 60.0,
        2
    ) AS average_resolution_hours
FROM tickets AS t
WHERE
    t.status = 'COMPLETED'
    AND t.closed_at >= '2026-01-01 00:00:00'
    AND t.closed_at < '2027-01-01 00:00:00'
GROUP BY
    YEAR(t.closed_at),
    MONTH(t.closed_at),
    DATE_FORMAT(t.closed_at, '%Y-%m')
ORDER BY report_year ASC, report_month ASC;
