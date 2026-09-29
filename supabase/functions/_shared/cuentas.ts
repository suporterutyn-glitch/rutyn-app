// deno-lint-ignore-file
// Borrado definitivo de una cuenta: archivos del usuario en Storage y el auth.user
// (las tablas caen en cascada desde auth.users / profiles).

const BUCKETS_CON_CARPETA_DE_USUARIO = ['avatars', 'assessment-photos', 'anamnesis-files']

async function borrarCarpeta(db: any, bucket: string, prefijo: string) {
  const { data } = await db.storage.from(bucket).list(prefijo, { limit: 1000 })
  if (!data?.length) return
  const archivos: string[] = []
  for (const it of data) {
    const ruta = `${prefijo}/${it.name}`
    if (it.id === null) await borrarCarpeta(db, bucket, ruta) // subcarpeta
    else archivos.push(ruta)
  }
  if (archivos.length) await db.storage.from(bucket).remove(archivos)
}

export async function borrarCuenta(db: any, userId: string) {
  for (const b of BUCKETS_CON_CARPETA_DE_USUARIO) {
    await borrarCarpeta(db, b, userId).catch((e: any) => console.error('storage', b, userId, e?.message))
  }
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) throw error
}
