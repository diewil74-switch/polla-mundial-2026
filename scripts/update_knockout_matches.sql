-- ============================================
-- ACTUALIZAR PARTIDOS ELIMINATORIOS (73-104)
-- ============================================
-- Este script actualiza solo los partidos eliminatorios
-- con los cruces y fechas correctas
-- ============================================

-- Primero eliminar los partidos eliminatorios existentes
DELETE FROM matches WHERE match_number >= 73 AND match_number <= 104;

-- DIECISEISAVOS DE FINAL - Round of 32 (73-88)
INSERT INTO matches (match_number, phase, home_team_label, away_team_label, match_date, venue, city) VALUES
(73, 'r16', '2º Grupo A', '2º Grupo B', '2026-06-28 19:00:00+00', 'MetLife Stadium', 'Nueva York/Nueva Jersey'),
(74, 'r16', '1º Grupo A', '3º Mejor A/B/C/D', '2026-06-28 22:00:00+00', 'AT&T Stadium', 'Dallas'),
(75, 'r16', '1º Grupo B', '3º Mejor E/F/G/H', '2026-06-29 19:00:00+00', 'Lincoln Financial Field', 'Filadelfia'),
(76, 'r16', '1º Grupo C', '2º Grupo D', '2026-06-29 22:00:00+00', 'Rose Bowl', 'Los Ángeles'),
(77, 'r16', '1º Grupo D', '2º Grupo C', '2026-06-30 01:00:00+00', 'Arrowhead Stadium', 'Kansas City'),
(78, 'r16', '1º Grupo E', '2º Grupo F', '2026-06-30 19:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
(79, 'r16', '1º Grupo F', '2º Grupo E', '2026-06-30 22:00:00+00', 'Mercedes Benz Stadium', 'Atlanta'),
(80, 'r16', '1º Grupo G', '2º Grupo H', '2026-07-01 19:00:00+00', 'NRG Stadium', 'Houston'),
(81, 'r16', '1º Grupo H', '2º Grupo G', '2026-07-01 22:00:00+00', 'Levi''s Stadium', 'San Francisco Bay Area'),
(82, 'r16', '1º Grupo I', '2º Grupo J', '2026-07-02 01:00:00+00', 'Hard Rock Stadium', 'Miami'),
(83, 'r16', '1º Grupo J', '2º Grupo I', '2026-07-02 19:00:00+00', 'BMO Field', 'Toronto'),
(84, 'r16', '1º Grupo K', '2º Grupo L', '2026-07-02 22:00:00+00', 'BC Place', 'Vancouver'),
(85, 'r16', '1º Grupo L', '2º Grupo K', '2026-07-03 01:00:00+00', 'Lumen Field', 'Seattle'),
(86, 'r16', '3º Mejor I/J/K/L', '2º Grupo G', '2026-07-03 19:00:00+00', 'Azteca', 'Ciudad de México'),
(87, 'r16', '3º Mejor E/F/G/H', '2º Grupo I', '2026-07-03 22:00:00+00', 'BBVA', 'Monterrey'),
(88, 'r16', '3º Mejor A/B/C/D', '2º Grupo K', '2026-07-04 01:00:00+00', 'Akron', 'Guadalajara');

-- OCTAVOS DE FINAL - Round of 16 (89-96)
INSERT INTO matches (match_number, phase, home_team_label, away_team_label, match_date, venue, city) VALUES
(89, 'r8', 'Ganador P73', 'Ganador P74', '2026-07-06 19:00:00+00', 'AT&T Stadium', 'Dallas'),
(90, 'r8', 'Ganador P75', 'Ganador P76', '2026-07-06 22:00:00+00', 'Gillette Stadium', 'Boston'),
(91, 'r8', 'Ganador P77', 'Ganador P78', '2026-07-07 19:00:00+00', 'Hard Rock Stadium', 'Miami'),
(92, 'r8', 'Ganador P79', 'Ganador P80', '2026-07-07 22:00:00+00', 'Arrowhead Stadium', 'Kansas City'),
(93, 'r8', 'Ganador P81', 'Ganador P82', '2026-07-08 19:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
(94, 'r8', 'Ganador P83', 'Ganador P84', '2026-07-08 22:00:00+00', 'MetLife Stadium', 'Nueva York/Nueva Jersey'),
(95, 'r8', 'Ganador P85', 'Ganador P86', '2026-07-09 19:00:00+00', 'NRG Stadium', 'Houston'),
(96, 'r8', 'Ganador P87', 'Ganador P88', '2026-07-09 22:00:00+00', 'Mercedes Benz Stadium', 'Atlanta');

-- CUARTOS DE FINAL - Round of 8 (97-100)
INSERT INTO matches (match_number, phase, home_team_label, away_team_label, match_date, venue, city) VALUES
(97, 'r4', 'Ganador P89', 'Ganador P90', '2026-07-11 19:00:00+00', 'MetLife Stadium', 'Nueva York/Nueva Jersey'),
(98, 'r4', 'Ganador P91', 'Ganador P92', '2026-07-11 22:00:00+00', 'SoFi Stadium', 'Los Ángeles'),
(99, 'r4', 'Ganador P93', 'Ganador P94', '2026-07-12 19:00:00+00', 'AT&T Stadium', 'Dallas'),
(100, 'r4', 'Ganador P95', 'Ganador P96', '2026-07-12 22:00:00+00', 'Mercedes Benz Stadium', 'Atlanta');

-- SEMIFINALES (101-102)
INSERT INTO matches (match_number, phase, home_team_label, away_team_label, match_date, venue, city) VALUES
(101, 'sf', 'Ganador P97', 'Ganador P98', '2026-07-15 19:00:00+00', 'AT&T Stadium', 'Dallas'),
(102, 'sf', 'Ganador P99', 'Ganador P100', '2026-07-16 19:00:00+00', 'Mercedes Benz Stadium', 'Atlanta');

-- TERCER PUESTO (103)
INSERT INTO matches (match_number, phase, home_team_label, away_team_label, match_date, venue, city) VALUES
(103, '3rd', 'Perdedor P101', 'Perdedor P102', '2026-07-19 19:00:00+00', 'Hard Rock Stadium', 'Miami');

-- FINAL (104)
INSERT INTO matches (match_number, phase, home_team_label, away_team_label, match_date, venue, city) VALUES
(104, 'final', 'Ganador P101', 'Ganador P102', '2026-07-20 19:00:00+00', 'MetLife Stadium', 'Nueva York/Nueva Jersey');

-- Verificar que se crearon correctamente
SELECT match_number, phase, home_team_label, away_team_label,
       TO_CHAR(match_date AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI') as fecha_colombia,
       venue, city
FROM matches
WHERE match_number >= 73 AND match_number <= 104
ORDER BY match_number;
