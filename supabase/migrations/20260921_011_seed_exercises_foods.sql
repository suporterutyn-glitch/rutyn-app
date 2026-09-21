-- Seed: Ejercicios y Alimentos Básicos (Catálogo Global)
-- Este archivo crea un catálogo inicial de ejercicios y alimentos
-- owner_id = NULL indica que son disponibles globalmente para todos los profesores

-- ========== EJERCICIOS ==========

INSERT INTO public.exercises (owner_id, name_pt, name_es, muscle_groups, category, is_active) VALUES
-- Pecho
(NULL, 'Supino Reto', 'Press de Banca', ARRAY['Pecho'], 'Push', true),
(NULL, 'Supino Inclinado', 'Press Inclinado', ARRAY['Pecho'], 'Push', true),
(NULL, 'Supino Declinado', 'Press Declinado', ARRAY['Pecho'], 'Push', true),
(NULL, 'Flexão de Braços', 'Flexiones', ARRAY['Pecho'], 'Push', true),
(NULL, 'Peck Deck', 'Aperturas en Máquina', ARRAY['Pecho'], 'Push', true),
-- Costas
(NULL, 'Puxada na Frente', 'Jalón Frontal', ARRAY['Costas'], 'Pull', true),
(NULL, 'Puxada Atrás', 'Jalón Nuca', ARRAY['Costas'], 'Pull', true),
(NULL, 'Remada Curvada', 'Remo Inclinado', ARRAY['Costas'], 'Pull', true),
(NULL, 'Remada Máquina', 'Remo en Máquina', ARRAY['Costas'], 'Pull', true),
(NULL, 'Barra Fixa', 'Dominadas', ARRAY['Costas'], 'Pull', true),
-- Ombros
(NULL, 'Desenvolvimento Militar', 'Press Militar', ARRAY['Ombros'], 'Push', true),
(NULL, 'Desenvolvimento Máquina', 'Press en Máquina', ARRAY['Ombros'], 'Push', true),
(NULL, 'Elevação Lateral', 'Aperturas Laterales', ARRAY['Ombros'], 'Push', true),
(NULL, 'Elevação Frontal', 'Elevación Frontal', ARRAY['Ombros'], 'Push', true),
(NULL, 'Rosca Inversa', 'Curl Reverso', ARRAY['Ombros'], 'Pull', true),
-- Braços - Bíceps
(NULL, 'Rosca Direta', 'Curl Directo', ARRAY['Bíceps'], 'Pull', true),
(NULL, 'Rosca Alternada', 'Curl Alterno', ARRAY['Bíceps'], 'Pull', true),
(NULL, 'Rosca Máquina', 'Curl en Máquina', ARRAY['Bíceps'], 'Pull', true),
(NULL, 'Rosca Martelo', 'Curl Martillo', ARRAY['Bíceps'], 'Pull', true),
-- Braços - Tríceps
(NULL, 'Tríceps Corda', 'Tríceps en Cuerda', ARRAY['Tríceps'], 'Push', true),
(NULL, 'Tríceps Máquina', 'Tríceps en Máquina', ARRAY['Tríceps'], 'Push', true),
(NULL, 'Mergulho', 'Fondos', ARRAY['Tríceps'], 'Push', true),
(NULL, 'Tríceps Francês', 'Press Francés', ARRAY['Tríceps'], 'Push', true),
-- Pernas
(NULL, 'Agachamento', 'Sentadilla', ARRAY['Quadríceps'], 'Legs', true),
(NULL, 'Leg Press', 'Prensa de Piernas', ARRAY['Quadríceps'], 'Legs', true),
(NULL, 'Extensão de Perna', 'Extensión de Cuádriceps', ARRAY['Quadríceps'], 'Legs', true),
(NULL, 'Flexão de Perna', 'Flexión de Piernas', ARRAY['Isquiotibiales'], 'Legs', true),
(NULL, 'Rosca Direta em Pé', 'Curl de Isquiotibiales', ARRAY['Isquiotibiales'], 'Legs', true),
(NULL, 'Adução de Perna', 'Aducción', ARRAY['Adutores'], 'Legs', true),
(NULL, 'Abdução de Perna', 'Abducción', ARRAY['Abductores'], 'Legs', true),
(NULL, 'Panturrilha em Pé', 'Elevación de Talones', ARRAY['Panturrilhas'], 'Legs', true),
-- Core
(NULL, 'Abdominal Máquina', 'Abdominales en Máquina', ARRAY['Core'], 'Core', true),
(NULL, 'Abdominal Solo', 'Abdominales', ARRAY['Core'], 'Core', true),
(NULL, 'Prancha', 'Planchas', ARRAY['Core'], 'Core', true),
(NULL, 'Encaixe', 'Encogimientos', ARRAY['Core'], 'Core', true);

-- ========== ALIMENTOS ==========

INSERT INTO public.foods (owner_id, name_pt, name_es, category, unit, portion, kcal, protein, carb, fat) VALUES
-- Proteínas
(NULL, 'Peito de Frango', 'Pechuga de Pollo', 'protein', 'g', 100, 165, 31, 0, 3.6),
(NULL, 'Ovos', 'Huevos', 'protein', 'un', 50, 78, 6.3, 0.6, 5.5),
(NULL, 'Carne Vermelha', 'Carne Roja', 'protein', 'g', 100, 250, 26, 0, 15),
(NULL, 'Peixe (Salmão)', 'Salmón', 'protein', 'g', 100, 208, 20, 0, 13),
(NULL, 'Iogurte Grego', 'Yogur Griego', 'protein', 'g', 150, 150, 20, 7, 5),
(NULL, 'Whey Protein', 'Suero de Leche', 'protein', 'scoops', 30, 110, 25, 2, 1),
-- Carboidratos
(NULL, 'Arroz Integral', 'Arroz Integral', 'carb', 'g', 150, 195, 4.5, 43, 1.5),
(NULL, 'Batata Doce', 'Papa Dulce', 'carb', 'g', 100, 86, 1.6, 20, 0.1),
(NULL, 'Pão Integral', 'Pan Integral', 'carb', 'fatia', 30, 79, 4, 14, 1),
(NULL, 'Aveia', 'Avena', 'carb', 'g', 40, 150, 5, 27, 3),
(NULL, 'Banana', 'Plátano', 'carb', 'un', 100, 89, 1.1, 23, 0.3),
(NULL, 'Maçã', 'Manzana', 'carb', 'un', 100, 52, 0.3, 14, 0.2),
-- Gorduras Saudáveis
(NULL, 'Azeite de Oliva', 'Aceite de Oliva', 'fat', 'ml', 10, 90, 0, 0, 10),
(NULL, 'Abacate', 'Aguacate', 'fat', 'un', 100, 160, 2, 9, 15),
(NULL, 'Amendoim', 'Cacahuete', 'fat', 'g', 30, 180, 7, 7, 15),
(NULL, 'Castanha do Brasil', 'Nueces de Brasil', 'fat', 'g', 30, 187, 4, 3, 19),
-- Neutros/Vegetais
(NULL, 'Brócolis', 'Brócoli', 'neutral', 'g', 100, 34, 2.8, 7, 0.4),
(NULL, 'Espinafre', 'Espinaca', 'neutral', 'g', 100, 23, 2.9, 3.6, 0.4),
(NULL, 'Alface', 'Lechuga', 'neutral', 'g', 100, 15, 1.2, 2.9, 0.2),
(NULL, 'Tomate', 'Tomate', 'neutral', 'g', 100, 18, 0.9, 3.9, 0.2),
(NULL, 'Cenoura', 'Zanahoria', 'neutral', 'g', 100, 41, 0.9, 10, 0.2);

-- ========== INSERÇÃO VERIFICADA ==========
-- Total esperado: 35 exercícios + 23 alimentos = 58 registros
SELECT COUNT(*) as total_exercises FROM public.exercises WHERE owner_id IS NULL;
SELECT COUNT(*) as total_foods FROM public.foods WHERE owner_id IS NULL;
