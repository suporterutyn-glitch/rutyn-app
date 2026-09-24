import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { FeedbackDialog } from '@/components/FeedbackDialog'

export function DadosBancariosPage() {
  const { profile, refresh } = useAuth()
  const nav = useNavigate()
  const isBR = profile?.country === 'BR'
  const [holder, setHolder] = useState('')
  const [bank, setBank] = useState('')
  const [agency, setAgency] = useState('')
  const [account, setAccount] = useState('')
  const [pix, setPix] = useState('')
  const [accountType, setAccountType] = useState('')
  const [pixType, setPixType] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHolder(profile?.bank_holder ?? '')
    setBank(profile?.bank_name ?? '')
    setAgency(profile?.bank_agency ?? '')
    setAccount(profile?.bank_account ?? '')
    setPix(profile?.pix_key ?? '')
    setAccountType(profile?.bank_account_type ?? '')
    setPixType(profile?.pix_key_type ?? '')
  }, [profile?.id])

  async function save() {
    if (!profile?.id) return
    setSaving(true)
    const { error: e } = await supabase.from('profiles').update({
      bank_holder: holder || null, bank_name: bank || null, bank_agency: agency || null, bank_account: account || null,
      bank_account_type: accountType || null,
      pix_key: isBR ? (pix || null) : null,
      pix_key_type: isBR ? (pixType || null) : null,
    }).eq('id', profile.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    await refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full bg-surface-line flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-rt-20 font-bold">Dados bancários</h1>
      </div>

      <div className="flex flex-col gap-6">
        <UnderlineField label="Titular" value={holder} onChange={setHolder} />
        <UnderlineField label="Banco" value={bank} onChange={setBank} />
        <div className="grid grid-cols-2 gap-3">
          <UnderlineField label="Agência" value={agency} onChange={setAgency} />
          <UnderlineField label="Conta" value={account} onChange={setAccount} />
        </div>
        <Opciones
          label="Tipo de Conta"
          value={accountType}
          options={['Conta Corrente', 'Conta Poupança']}
          onChange={setAccountType}
        />
        {isBR && (
          <>
            <Opciones
              label="Tipo de Chave"
              value={pixType}
              options={['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Aleatória']}
              onChange={setPixType}
            />
            <UnderlineField label="Chave PIX" value={pix} onChange={setPix} />
          </>
        )}
      </div>

      <div className="mt-10">
        <button className="btn-save" disabled={saving} onClick={save}>
          {saving ? 'Salvando…' : saved ? 'Salvo ✓' : 'Salvar'}
        </button>
      </div>
      {error && <FeedbackDialog kind="error" message={error} onClose={() => setError(null)} />}
    </div>
  )
}

function UnderlineField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-surface-nav text-rt-12 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent border-b border-surface-divider text-grey-300 text-rt-13 py-2 outline-none focus:border-brand" />
    </div>
  )
}

/** Elección corta en línea: el alumno necesita saber de qué cuenta y qué clave se trata. */
function Opciones({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-white/60 text-rt-11 mb-2">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o === value ? '' : o)}
            className={
              'h-9 px-4 rounded-btn-pill border text-rt-12 font-semibold ' +
              (value === o ? 'bg-brand border-brand text-white' : 'bg-transparent border-grey-700 text-grey-400')
            }
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
