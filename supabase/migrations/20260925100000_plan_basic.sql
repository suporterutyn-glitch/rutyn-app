-- Planes nuevos: free (1 alumno), basic (1 USD por alumno, mínimo 5), pro (ilimitado).
-- master/elite quedan en el enum por compatibilidad y cuentan como pro.
alter type public.plan_t add value if not exists 'basic';
