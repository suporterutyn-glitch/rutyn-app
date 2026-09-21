-- Seed: Alimentos Básicos (Catálogo Global)
-- Este archivo crea un catálogo inicial de alimentos
-- owner_id = NULL indica que son disponibles globalmente para todos los profesores

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

-- Verificación
SELECT COUNT(*) as total_foods FROM public.foods WHERE owner_id IS NULL;
