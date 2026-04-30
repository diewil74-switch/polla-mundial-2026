-- ============================================
-- SEED SQL PARA POLLA MUNDIAL 2026
-- ============================================
-- Ejecutar DESPUÉS de schema.sql
-- ============================================

-- ============================================
-- EQUIPOS - 48 equipos organizados por grupos
-- ============================================

-- Grupo A
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('México', '🇲🇽', 'A', 'CONCACAF', 15),
('Corea del Sur', '🇰🇷', 'A', 'AFC', 23),
('República Checa', '🇨🇿', 'A', 'UEFA', 36),
('Sudáfrica', '🇿🇦', 'A', 'CAF', 58);

-- Grupo B
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Canadá', '🇨🇦', 'B', 'CONCACAF', 40),
('Suiza', '🇨🇭', 'B', 'UEFA', 14),
('Qatar', '🇶🇦', 'B', 'AFC', 61),
('Bosnia y Herzegovina', '🇧🇦', 'B', 'UEFA', 65);

-- Grupo C
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Brasil', '🇧🇷', 'C', 'CONMEBOL', 4),
('Marruecos', '🇲🇦', 'C', 'CAF', 13),
('Escocia', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C', 'UEFA', 39),
('Haití', '🇭🇹', 'C', 'CONCACAF', 85);

-- Grupo D
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Estados Unidos', '🇺🇸', 'D', 'CONCACAF', 11),
('Australia', '🇦🇺', 'D', 'AFC', 25),
('Turquía', '🇹🇷', 'D', 'UEFA', 28),
('Paraguay', '🇵🇾', 'D', 'CONMEBOL', 47);

-- Grupo E
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Alemania', '🇩🇪', 'E', 'UEFA', 12),
('Costa de Marfil', '🇨🇮', 'E', 'CAF', 31),
('Ecuador', '🇪🇨', 'E', 'CONMEBOL', 30),
('Curazao', '🇨🇼', 'E', 'CONCACAF', 82);

-- Grupo F
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Países Bajos', '🇳🇱', 'F', 'UEFA', 7),
('Japón', '🇯🇵', 'F', 'AFC', 18),
('Suecia', '🇸🇪', 'F', 'UEFA', 24),
('Túnez', '🇹🇳', 'F', 'CAF', 41);

-- Grupo G
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Bélgica', '🇧🇪', 'G', 'UEFA', 5),
('Irán', '🇮🇷', 'G', 'AFC', 21),
('Egipto', '🇪🇬', 'G', 'CAF', 33),
('Nueva Zelanda', '🇳🇿', 'G', 'OFC', 95);

-- Grupo H
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('España', '🇪🇸', 'H', 'UEFA', 8),
('Uruguay', '🇺🇾', 'H', 'CONMEBOL', 16),
('Arabia Saudita', '🇸🇦', 'H', 'AFC', 53),
('Cabo Verde', '🇨🇻', 'H', 'CAF', 73);

-- Grupo I
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Francia', '🇫🇷', 'I', 'UEFA', 2),
('Senegal', '🇸🇳', 'I', 'CAF', 19),
('Noruega', '🇳🇴', 'I', 'UEFA', 45),
('Irak', '🇮🇶', 'I', 'AFC', 70);

-- Grupo J
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Argentina', '🇦🇷', 'J', 'CONMEBOL', 1),
('Argelia', '🇩🇿', 'J', 'CAF', 37),
('Austria', '🇦🇹', 'J', 'UEFA', 26),
('Jordania', '🇯🇴', 'J', 'AFC', 68);

-- Grupo K (Colombia)
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Portugal', '🇵🇹', 'K', 'UEFA', 6),
('Colombia', '🇨🇴', 'K', 'CONMEBOL', 9),
('RD del Congo', '🇨🇩', 'K', 'CAF', 48),
('Uzbekistán', '🇺🇿', 'K', 'AFC', 63);

-- Grupo L
INSERT INTO teams (name, flag_emoji, group_id, confederation, fifa_ranking) VALUES
('Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L', 'UEFA', 3),
('Croacia', '🇭🇷', 'L', 'UEFA', 10),
('Panamá', '🇵🇦', 'L', 'CONCACAF', 52),
('Ghana', '🇬🇭', 'L', 'CAF', 64);

-- ============================================
-- PARTIDOS FASE DE GRUPOS (1-72)
-- ============================================
-- Fechas y horarios ya están en UTC
-- ============================================

-- Grupo A (Partidos 1-6)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(1, 'groups', 'A', (SELECT id FROM teams WHERE name = 'México'), (SELECT id FROM teams WHERE name = 'Sudáfrica'), '2026-06-11 19:00:00+00', 'Azteca', 'CDMX'),
(2, 'groups', 'A', (SELECT id FROM teams WHERE name = 'Corea del Sur'), (SELECT id FROM teams WHERE name = 'República Checa'), '2026-06-12 02:00:00+00', 'Akron', 'Guadalajara'),
(25, 'groups', 'A', (SELECT id FROM teams WHERE name = 'República Checa'), (SELECT id FROM teams WHERE name = 'Sudáfrica'), '2026-06-18 16:00:00+00', 'Mercedes-Benz', 'Atlanta'),
(28, 'groups', 'A', (SELECT id FROM teams WHERE name = 'México'), (SELECT id FROM teams WHERE name = 'Corea del Sur'), '2026-06-19 01:00:00+00', 'Akron', 'Guadalajara'),
(53, 'groups', 'A', (SELECT id FROM teams WHERE name = 'República Checa'), (SELECT id FROM teams WHERE name = 'México'), '2026-06-25 01:00:00+00', 'Azteca', 'CDMX'),
(54, 'groups', 'A', (SELECT id FROM teams WHERE name = 'Sudáfrica'), (SELECT id FROM teams WHERE name = 'Corea del Sur'), '2026-06-25 01:00:00+00', 'BBVA', 'Monterrey');

-- Grupo B (Partidos 7-12)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(3, 'groups', 'B', (SELECT id FROM teams WHERE name = 'Canadá'), (SELECT id FROM teams WHERE name = 'Bosnia y Herzegovina'), '2026-06-12 19:00:00+00', 'BMO Field', 'Toronto'),
(5, 'groups', 'B', (SELECT id FROM teams WHERE name = 'Qatar'), (SELECT id FROM teams WHERE name = 'Suiza'), '2026-06-13 19:00:00+00', 'Levi''s', 'San Francisco'),
(26, 'groups', 'B', (SELECT id FROM teams WHERE name = 'Suiza'), (SELECT id FROM teams WHERE name = 'Bosnia y Herzegovina'), '2026-06-18 19:00:00+00', 'SoFi', 'Los Ángeles'),
(27, 'groups', 'B', (SELECT id FROM teams WHERE name = 'Canadá'), (SELECT id FROM teams WHERE name = 'Qatar'), '2026-06-18 22:00:00+00', 'BC Place', 'Vancouver'),
(49, 'groups', 'B', (SELECT id FROM teams WHERE name = 'Suiza'), (SELECT id FROM teams WHERE name = 'Canadá'), '2026-06-24 19:00:00+00', 'BC Place', 'Vancouver'),
(50, 'groups', 'B', (SELECT id FROM teams WHERE name = 'Bosnia y Herzegovina'), (SELECT id FROM teams WHERE name = 'Qatar'), '2026-06-24 19:00:00+00', 'Lumen Field', 'Seattle');

-- Grupo C (Partidos 13-18)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(6, 'groups', 'C', (SELECT id FROM teams WHERE name = 'Brasil'), (SELECT id FROM teams WHERE name = 'Marruecos'), '2026-06-13 22:00:00+00', 'MetLife', 'Nueva York/NJ'),
(7, 'groups', 'C', (SELECT id FROM teams WHERE name = 'Haití'), (SELECT id FROM teams WHERE name = 'Escocia'), '2026-06-14 01:00:00+00', 'Gillette', 'Boston'),
(30, 'groups', 'C', (SELECT id FROM teams WHERE name = 'Escocia'), (SELECT id FROM teams WHERE name = 'Marruecos'), '2026-06-19 22:00:00+00', 'Gillette', 'Boston'),
(31, 'groups', 'C', (SELECT id FROM teams WHERE name = 'Brasil'), (SELECT id FROM teams WHERE name = 'Haití'), '2026-06-20 01:00:00+00', 'Lincoln', 'Filadelfia'),
(51, 'groups', 'C', (SELECT id FROM teams WHERE name = 'Escocia'), (SELECT id FROM teams WHERE name = 'Brasil'), '2026-06-24 22:00:00+00', 'Hard Rock', 'Miami'),
(52, 'groups', 'C', (SELECT id FROM teams WHERE name = 'Marruecos'), (SELECT id FROM teams WHERE name = 'Haití'), '2026-06-24 22:00:00+00', 'Mercedes-Benz', 'Atlanta');

-- Grupo D (Partidos 19-24)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(4, 'groups', 'D', (SELECT id FROM teams WHERE name = 'Estados Unidos'), (SELECT id FROM teams WHERE name = 'Paraguay'), '2026-06-13 01:00:00+00', 'SoFi', 'Los Ángeles'),
(8, 'groups', 'D', (SELECT id FROM teams WHERE name = 'Australia'), (SELECT id FROM teams WHERE name = 'Turquía'), '2026-06-14 04:00:00+00', 'BC Place', 'Vancouver'),
(29, 'groups', 'D', (SELECT id FROM teams WHERE name = 'Estados Unidos'), (SELECT id FROM teams WHERE name = 'Australia'), '2026-06-19 19:00:00+00', 'Lumen Field', 'Seattle'),
(32, 'groups', 'D', (SELECT id FROM teams WHERE name = 'Turquía'), (SELECT id FROM teams WHERE name = 'Paraguay'), '2026-06-20 04:00:00+00', 'Levi''s', 'San Francisco'),
(59, 'groups', 'D', (SELECT id FROM teams WHERE name = 'Turquía'), (SELECT id FROM teams WHERE name = 'Estados Unidos'), '2026-06-26 02:00:00+00', 'SoFi', 'Los Ángeles'),
(60, 'groups', 'D', (SELECT id FROM teams WHERE name = 'Paraguay'), (SELECT id FROM teams WHERE name = 'Australia'), '2026-06-26 02:00:00+00', 'Levi''s', 'San Francisco');

-- Grupo E (Partidos 25-30)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(9, 'groups', 'E', (SELECT id FROM teams WHERE name = 'Alemania'), (SELECT id FROM teams WHERE name = 'Curazao'), '2026-06-14 17:00:00+00', 'NRG', 'Houston'),
(11, 'groups', 'E', (SELECT id FROM teams WHERE name = 'Costa de Marfil'), (SELECT id FROM teams WHERE name = 'Ecuador'), '2026-06-14 23:00:00+00', 'Lincoln', 'Filadelfia'),
(34, 'groups', 'E', (SELECT id FROM teams WHERE name = 'Alemania'), (SELECT id FROM teams WHERE name = 'Costa de Marfil'), '2026-06-20 20:00:00+00', 'BMO Field', 'Toronto'),
(35, 'groups', 'E', (SELECT id FROM teams WHERE name = 'Ecuador'), (SELECT id FROM teams WHERE name = 'Curazao'), '2026-06-21 00:00:00+00', 'Arrowhead', 'Kansas City'),
(55, 'groups', 'E', (SELECT id FROM teams WHERE name = 'Ecuador'), (SELECT id FROM teams WHERE name = 'Alemania'), '2026-06-25 20:00:00+00', 'MetLife', 'Nueva York/NJ'),
(56, 'groups', 'E', (SELECT id FROM teams WHERE name = 'Curazao'), (SELECT id FROM teams WHERE name = 'Costa de Marfil'), '2026-06-25 20:00:00+00', 'Lincoln', 'Filadelfia');

-- Grupo F (Partidos 31-36)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(10, 'groups', 'F', (SELECT id FROM teams WHERE name = 'Países Bajos'), (SELECT id FROM teams WHERE name = 'Japón'), '2026-06-14 20:00:00+00', 'AT&T Stadium', 'Dallas'),
(12, 'groups', 'F', (SELECT id FROM teams WHERE name = 'Suecia'), (SELECT id FROM teams WHERE name = 'Túnez'), '2026-06-15 02:00:00+00', 'BBVA', 'Monterrey'),
(33, 'groups', 'F', (SELECT id FROM teams WHERE name = 'Países Bajos'), (SELECT id FROM teams WHERE name = 'Suecia'), '2026-06-20 17:00:00+00', 'NRG', 'Houston'),
(36, 'groups', 'F', (SELECT id FROM teams WHERE name = 'Túnez'), (SELECT id FROM teams WHERE name = 'Japón'), '2026-06-21 04:00:00+00', 'Akron', 'Guadalajara'),
(57, 'groups', 'F', (SELECT id FROM teams WHERE name = 'Japón'), (SELECT id FROM teams WHERE name = 'Suecia'), '2026-06-25 23:00:00+00', 'AT&T Stadium', 'Dallas'),
(58, 'groups', 'F', (SELECT id FROM teams WHERE name = 'Túnez'), (SELECT id FROM teams WHERE name = 'Países Bajos'), '2026-06-25 23:00:00+00', 'Arrowhead', 'Kansas City');

-- Grupo G (Partidos 37-42)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(14, 'groups', 'G', (SELECT id FROM teams WHERE name = 'Bélgica'), (SELECT id FROM teams WHERE name = 'Egipto'), '2026-06-15 19:00:00+00', 'Lumen Field', 'Seattle'),
(16, 'groups', 'G', (SELECT id FROM teams WHERE name = 'Irán'), (SELECT id FROM teams WHERE name = 'Nueva Zelanda'), '2026-06-16 01:00:00+00', 'SoFi', 'Los Ángeles'),
(38, 'groups', 'G', (SELECT id FROM teams WHERE name = 'Bélgica'), (SELECT id FROM teams WHERE name = 'Irán'), '2026-06-21 19:00:00+00', 'SoFi', 'Los Ángeles'),
(40, 'groups', 'G', (SELECT id FROM teams WHERE name = 'Nueva Zelanda'), (SELECT id FROM teams WHERE name = 'Egipto'), '2026-06-22 01:00:00+00', 'BC Place', 'Vancouver'),
(65, 'groups', 'G', (SELECT id FROM teams WHERE name = 'Egipto'), (SELECT id FROM teams WHERE name = 'Irán'), '2026-06-27 03:00:00+00', 'Lumen Field', 'Seattle'),
(66, 'groups', 'G', (SELECT id FROM teams WHERE name = 'Nueva Zelanda'), (SELECT id FROM teams WHERE name = 'Bélgica'), '2026-06-27 03:00:00+00', 'BC Place', 'Vancouver');

-- Grupo H (Partidos 43-48)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(13, 'groups', 'H', (SELECT id FROM teams WHERE name = 'España'), (SELECT id FROM teams WHERE name = 'Cabo Verde'), '2026-06-15 16:00:00+00', 'Mercedes-Benz', 'Atlanta'),
(15, 'groups', 'H', (SELECT id FROM teams WHERE name = 'Arabia Saudita'), (SELECT id FROM teams WHERE name = 'Uruguay'), '2026-06-15 22:00:00+00', 'Hard Rock', 'Miami'),
(37, 'groups', 'H', (SELECT id FROM teams WHERE name = 'España'), (SELECT id FROM teams WHERE name = 'Arabia Saudita'), '2026-06-21 16:00:00+00', 'Mercedes-Benz', 'Atlanta'),
(39, 'groups', 'H', (SELECT id FROM teams WHERE name = 'Uruguay'), (SELECT id FROM teams WHERE name = 'Cabo Verde'), '2026-06-21 22:00:00+00', 'Hard Rock', 'Miami'),
(63, 'groups', 'H', (SELECT id FROM teams WHERE name = 'Cabo Verde'), (SELECT id FROM teams WHERE name = 'Arabia Saudita'), '2026-06-27 00:00:00+00', 'NRG', 'Houston'),
(64, 'groups', 'H', (SELECT id FROM teams WHERE name = 'Uruguay'), (SELECT id FROM teams WHERE name = 'España'), '2026-06-27 00:00:00+00', 'Akron', 'Guadalajara');

-- Grupo I (Partidos 49-54)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(17, 'groups', 'I', (SELECT id FROM teams WHERE name = 'Francia'), (SELECT id FROM teams WHERE name = 'Senegal'), '2026-06-16 19:00:00+00', 'MetLife', 'Nueva York/NJ'),
(18, 'groups', 'I', (SELECT id FROM teams WHERE name = 'Irak'), (SELECT id FROM teams WHERE name = 'Noruega'), '2026-06-16 22:00:00+00', 'Gillette', 'Boston'),
(42, 'groups', 'I', (SELECT id FROM teams WHERE name = 'Francia'), (SELECT id FROM teams WHERE name = 'Irak'), '2026-06-22 21:00:00+00', 'Lincoln', 'Filadelfia'),
(43, 'groups', 'I', (SELECT id FROM teams WHERE name = 'Noruega'), (SELECT id FROM teams WHERE name = 'Senegal'), '2026-06-23 00:00:00+00', 'MetLife', 'Nueva York/NJ'),
(61, 'groups', 'I', (SELECT id FROM teams WHERE name = 'Noruega'), (SELECT id FROM teams WHERE name = 'Francia'), '2026-06-26 19:00:00+00', 'Gillette', 'Boston'),
(62, 'groups', 'I', (SELECT id FROM teams WHERE name = 'Senegal'), (SELECT id FROM teams WHERE name = 'Irak'), '2026-06-26 19:00:00+00', 'BMO Field', 'Toronto');

-- Grupo J (Partidos 55-60)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(19, 'groups', 'J', (SELECT id FROM teams WHERE name = 'Argentina'), (SELECT id FROM teams WHERE name = 'Argelia'), '2026-06-17 01:00:00+00', 'Arrowhead', 'Kansas City'),
(20, 'groups', 'J', (SELECT id FROM teams WHERE name = 'Austria'), (SELECT id FROM teams WHERE name = 'Jordania'), '2026-06-17 04:00:00+00', 'Levi''s', 'San Francisco'),
(41, 'groups', 'J', (SELECT id FROM teams WHERE name = 'Argentina'), (SELECT id FROM teams WHERE name = 'Austria'), '2026-06-22 17:00:00+00', 'AT&T Stadium', 'Dallas'),
(44, 'groups', 'J', (SELECT id FROM teams WHERE name = 'Jordania'), (SELECT id FROM teams WHERE name = 'Argelia'), '2026-06-23 03:00:00+00', 'Levi''s', 'San Francisco'),
(71, 'groups', 'J', (SELECT id FROM teams WHERE name = 'Argelia'), (SELECT id FROM teams WHERE name = 'Austria'), '2026-06-28 02:00:00+00', 'Arrowhead', 'Kansas City'),
(72, 'groups', 'J', (SELECT id FROM teams WHERE name = 'Jordania'), (SELECT id FROM teams WHERE name = 'Argentina'), '2026-06-28 02:00:00+00', 'AT&T Stadium', 'Dallas');

-- Grupo K - Colombia (Partidos 61-66)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(21, 'groups', 'K', (SELECT id FROM teams WHERE name = 'Portugal'), (SELECT id FROM teams WHERE name = 'RD del Congo'), '2026-06-17 17:00:00+00', 'NRG', 'Houston'),
(24, 'groups', 'K', (SELECT id FROM teams WHERE name = 'Uzbekistán'), (SELECT id FROM teams WHERE name = 'Colombia'), '2026-06-18 02:00:00+00', 'Azteca', 'CDMX'),
(45, 'groups', 'K', (SELECT id FROM teams WHERE name = 'Portugal'), (SELECT id FROM teams WHERE name = 'Uzbekistán'), '2026-06-23 17:00:00+00', 'NRG', 'Houston'),
(48, 'groups', 'K', (SELECT id FROM teams WHERE name = 'Colombia'), (SELECT id FROM teams WHERE name = 'RD del Congo'), '2026-06-24 02:00:00+00', 'Akron', 'Guadalajara'),
(69, 'groups', 'K', (SELECT id FROM teams WHERE name = 'Colombia'), (SELECT id FROM teams WHERE name = 'Portugal'), '2026-06-27 23:30:00+00', 'Hard Rock', 'Miami'),
(70, 'groups', 'K', (SELECT id FROM teams WHERE name = 'RD del Congo'), (SELECT id FROM teams WHERE name = 'Uzbekistán'), '2026-06-27 23:30:00+00', 'Mercedes-Benz', 'Atlanta');

-- Grupo L (Partidos 67-72)
INSERT INTO matches (match_number, phase, group_id, home_team_id, away_team_id, match_date, venue, city) VALUES
(22, 'groups', 'L', (SELECT id FROM teams WHERE name = 'Inglaterra'), (SELECT id FROM teams WHERE name = 'Croacia'), '2026-06-17 20:00:00+00', 'AT&T Stadium', 'Dallas'),
(23, 'groups', 'L', (SELECT id FROM teams WHERE name = 'Ghana'), (SELECT id FROM teams WHERE name = 'Panamá'), '2026-06-17 23:00:00+00', 'BMO Field', 'Toronto'),
(46, 'groups', 'L', (SELECT id FROM teams WHERE name = 'Inglaterra'), (SELECT id FROM teams WHERE name = 'Ghana'), '2026-06-23 20:00:00+00', 'Gillette', 'Boston'),
(47, 'groups', 'L', (SELECT id FROM teams WHERE name = 'Panamá'), (SELECT id FROM teams WHERE name = 'Croacia'), '2026-06-23 23:00:00+00', 'BMO Field', 'Toronto'),
(67, 'groups', 'L', (SELECT id FROM teams WHERE name = 'Panamá'), (SELECT id FROM teams WHERE name = 'Inglaterra'), '2026-06-27 21:00:00+00', 'MetLife', 'Nueva York/NJ'),
(68, 'groups', 'L', (SELECT id FROM teams WHERE name = 'Croacia'), (SELECT id FROM teams WHERE name = 'Ghana'), '2026-06-27 21:00:00+00', 'Lincoln', 'Filadelfia');

-- ============================================
-- PARTIDOS ELIMINATORIOS (73-104)
-- ============================================
-- Equipos aún no definidos, usar labels
-- ============================================

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
