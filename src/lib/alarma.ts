/**
 * Alarma del descanso: sonido + vibración cuando el cronómetro llega a cero.
 *
 * El sonido se genera con WebAudio en vez de un archivo: no hay que descargar
 * nada y funciona sin conexión, que es lo normal dentro de un gimnasio.
 *
 * iOS solo deja sonar si el audio nace de un gesto del usuario, por eso el
 * contexto se prepara cuando el alumno arranca el descanso, no al disparar.
 */
let contexto: AudioContext | null = null

export function prepararAlarma() {
  try {
    if (!contexto) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      contexto = new Ctor()
    }
    if (contexto.state === 'suspended') void contexto.resume()
  } catch {
    // Sin audio la alarma igual vibra y muestra el diálogo.
  }
}

/** Tres pitidos cortos, como un temporizador de cocina. */
export function sonarAlarma() {
  try {
    if (!contexto) prepararAlarma()
    if (!contexto) return
    if (contexto.state === 'suspended') void contexto.resume()

    const inicio = contexto.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = contexto.createOscillator()
      const vol = contexto.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      const t0 = inicio + i * 0.35
      vol.gain.setValueAtTime(0.0001, t0)
      vol.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
      vol.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25)
      osc.connect(vol).connect(contexto.destination)
      osc.start(t0)
      osc.stop(t0 + 0.28)
    }
  } catch {
    // ignorado a propósito
  }
}

/** Patrón corto-largo-corto. En iOS no existe y se ignora solo. */
export function vibrar() {
  try {
    navigator.vibrate?.([200, 100, 200, 100, 400])
  } catch {
    // ignorado a propósito
  }
}

export function alarmaDescanso() {
  sonarAlarma()
  vibrar()
}
