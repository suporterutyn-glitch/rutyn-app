/**
 * Script para configurar el primer admin
 * Ejecutar una sola vez después de desplegar la migración
 *
 * En la consola de Supabase, ejecutar:
 * INSERT INTO admins (user_id, email, role)
 * SELECT id, email, 'super_admin'
 * FROM auth.users
 * WHERE email = 'suporte.rutyn@gmail.com'
 *
 * O usar esta función desde el cliente:
 */

import { supabase } from './supabase'

export async function setupAdmin(email: string) {
  try {
    // 1. Obtener el user_id del email
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers()

    if (getUserError) {
      console.error('Error listando usuarios:', getUserError)
      return { error: getUserError.message }
    }

    const user = users.find((u) => u.email === email)
    if (!user) {
      return { error: `Usuario con email ${email} no encontrado` }
    }

    // 2. Crear el record en admins
    const { error } = await supabase
      .from('admins')
      .insert({
        user_id: user.id,
        email: email,
        role: 'super_admin',
      })

    if (error) {
      return { error: error.message }
    }

    return { success: true, message: `Admin ${email} creado exitosamente` }
  } catch (err: any) {
    return { error: err.message }
  }
}
