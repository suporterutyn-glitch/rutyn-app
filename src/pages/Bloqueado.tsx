import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ban, UserX, CreditCard, MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { DialogoEstado, BotonVerde, BotonWhatsapp, BotonSuave, EnlaceTexto } from '@/components/DialogoEstado'

type Profesor = { full_name: string | null; phone: string | null }

/**
 * Cuentas bloqueadas: suspensa, removida de la lista, desactivada, en
 * exclusión y assinatura expirada. Cada motivo tiene su propio diálogo,
 * como en los prints 022, 023 y 024 del módulo 01.
 */
export function BloqueadoPage() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { profile, signOut } = useAuth()
  const motivo = sp.get('motivo') || 'desativada'

  const [profesor, setProfesor] = useState<Profesor | null>(null)

  useEffect(() => {
    void (async () => {
      if (motivo === 'removido') {
        // Ya no es su profesor, así que no puede leer ese perfil: una función
        // acotada devuelve solo el nombre y el teléfono para el diálogo.
        const { data } = await supabase.rpc('quien_me_desvinculou')
        setProfesor((data as Profesor[] | null)?.[0] ?? null)
        return
      }
      if (!profile?.teacher_id) return
      const { data } = await supabase.from('profiles').select('full_name,phone').eq('id', profile.teacher_id).maybeSingle()
      setProfesor(data as Profesor | null)
    })()
  }, [motivo, profile?.teacher_id])

  function hablarConProfesor() {
    const tel = (profesor?.phone ?? '').replace(/\D/g, '')
    window.open(tel ? `https://wa.me/${tel}` : 'https://wa.me/', '_blank')
  }

  if (motivo === 'suspenso') {
    return (
      <Fondo>
        <DialogoEstado
          icono={<Ban size={38} className="text-danger" />}
          tonoIcono="rojo"
          titulo="Conta Suspensa"
          destacado="Sua conta foi suspensa pelo seu professor."
          cuerpo={profile?.link_message
            ? undefined
            : 'Entre em contato com o seu professor para regularizar a situação e voltar a acessar o app.'}
          acciones={
            <>
              <BotonWhatsapp onClick={hablarConProfesor}>
                <MessageCircle size={18} /> Falar com Professor
              </BotonWhatsapp>
              <BotonSuave onClick={signOut}>Sair</BotonSuave>
            </>
          }
        >
          {profile?.link_message && (
            <CajaMensaje titulo="Mensagem do professor:" texto={profile.link_message} />
          )}
          {profesor?.full_name && <ChipProfesor nombre={profesor.full_name} />}
        </DialogoEstado>
      </Fondo>
    )
  }

  if (motivo === 'removido') {
    return (
      <Fondo>
        <DialogoEstado
          icono={<UserX size={38} className="text-warning" />}
          tonoIcono="naranja"
          titulo="Removido da Lista"
          destacado={`${profesor?.full_name ?? 'Seu professor'} removeu você da lista de alunos.`}
          cuerpo="Você pode buscar outro professor para continuar treinando."
          acciones={
            <>
              <BotonVerde onClick={() => nav('/aluno/encontrar-professor', { replace: true })}>
                Buscar Novo Professor
              </BotonVerde>
              <EnlaceTexto onClick={signOut}>Sair</EnlaceTexto>
            </>
          }
        >
          {profile?.link_message && (
            <CajaMensaje titulo="Mensagem do professor:" texto={profile.link_message} />
          )}
        </DialogoEstado>
      </Fondo>
    )
  }

  if (motivo === 'assinatura') {
    return (
      <Fondo>
        <DialogoEstado
          icono={<CreditCard size={30} className="text-danger" />}
          tonoIcono="rojo"
          tituloEnLinea
          titulo="Assinatura Expirada"
          destacado="Sua assinatura expirou!"
          cuerpo="Para continuar utilizando o app e gerenciar seus alunos, é necessário regularizar seu pagamento."
          acciones={
            <>
              <BotonVerde onClick={() => nav('/professor/assinatura')}>Regularizar Pagamento</BotonVerde>
              <EnlaceTexto onClick={() => window.open('https://wa.me/', '_blank')}>Falar com Suporte</EnlaceTexto>
            </>
          }
        />
      </Fondo>
    )
  }

  const textos = motivo === 'exclusao'
    ? { titulo: 'Conta em Exclusão', cuerpo: 'Sua conta está em processo de exclusão.' }
    : { titulo: 'Conta Desativada', cuerpo: 'Entre em contato com o suporte para reativar sua conta.' }

  return (
    <Fondo>
      <DialogoEstado
        icono={<Ban size={38} className="text-danger" />}
        tonoIcono="rojo"
        titulo={textos.titulo}
        cuerpo={textos.cuerpo}
        acciones={
          <>
            <BotonWhatsapp onClick={() => window.open('https://wa.me/', '_blank')}>
              <MessageCircle size={18} /> Falar com Suporte
            </BotonWhatsapp>
            <EnlaceTexto onClick={signOut}>Sair</EnlaceTexto>
          </>
        }
      />
    </Fondo>
  )
}

function Fondo({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell app-bg-pro">
      <div className="relative z-10 min-h-dvh" />
      {children}
    </div>
  )
}

function ChipProfesor({ nombre }: { nombre: string }) {
  return (
    <div className="mt-4 mx-auto w-fit px-5 py-2.5 rounded-[10px] bg-white flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-brand/15 flex items-center justify-center text-brand text-rt-12 font-bold">
        {nombre[0]?.toUpperCase()}
      </span>
      <span className="text-grey-900 text-rt-15 font-semibold">{nombre}</span>
    </div>
  )
}

function CajaMensaje({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mt-4 rounded-[12px] bg-[#FDF3E3] border border-warning/40 px-4 py-3">
      <div className="text-warning text-rt-13 font-semibold">{titulo}</div>
      <p className="text-grey-600 text-rt-14 italic leading-[1.5] mt-1">“{texto}”</p>
    </div>
  )
}
