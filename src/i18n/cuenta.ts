import { textos } from './textos'

// Marketplace de profesores, mensualidad y cuentas bloqueadas (lado alumno).
export default textos({
  pt: {
    mk: { student: 'Aluno', notifications: 'Notificações', filters: 'Filtros', exit: 'Sair', instructor: 'Instrutor', inviteSent: 'Convite enviado', perMonth: 'mês' },
    pp: {
      about: 'Sobre', specialties: 'Especialidades', prices: 'Valores', perHour: 'Por hora:', monthly: 'Mensal:',
      inv_pending: 'Convite enviado', inv_accepted: 'Convite aceito', inv_countered: 'Convite com contraproposta', inv_other: 'Convite: {{s}}',
      sendProposal: 'Enviar proposta', format: 'Formato', fmtMonthly: 'Mensal', fmtHourly: 'Por hora', amount: 'Valor ({{c}})',
      frequency: 'Frequência semanal', days: 'Dias (escolha {{n}})', model: 'Modelo',
      objectives: 'Objetivos (separados por vírgula)', objectivesHint: 'Ex: emagrecer, hipertrofia', sending: 'Enviando…',
    },
    mens: {
      title: 'Mensalidade', proposal: 'Proposta de alteração', month: 'mês', hour: 'hora', reject: 'Recusar', accept: 'Aceitar',
      none: 'Nenhuma cobrança pendente 🎉', awaiting: 'Aguardando confirmação', due: 'Vence em',
      payData: 'Dados para pagamento', pix: 'Chave PIX', holder: 'Titular', bank: 'Banco', agency: 'Agência', account: 'Conta',
      sending: 'Enviando…', paid: 'Já Paguei', waitingTeacher: 'Aguardando o professor confirmar o pagamento.',
    },
    bloq: {
      suspended: 'Conta Suspensa', suspendedHi: 'Sua conta foi suspensa pelo seu professor.',
      suspendedBody: 'Entre em contato com o seu professor para regularizar a situação e voltar a acessar o app.',
      talkTeacher: 'Falar com Professor', exit: 'Sair', teacherMsg: 'Mensagem do professor:',
      removed: 'Removido da Lista', removedHi: '{{who}} removeu você da lista de alunos.', yourTeacher: 'Seu professor',
      removedBody: 'Você pode buscar outro professor para continuar treinando.', findNew: 'Buscar Novo Professor',
      expired: 'Assinatura Expirada', expiredHi: 'Sua assinatura expirou!',
      expiredBody: 'Para continuar utilizando o app e gerenciar seus alunos, é necessário regularizar seu pagamento.',
      pay: 'Regularizar Pagamento', support: 'Falar com Suporte',
      deleting: 'Conta em Exclusão', deletingBody: 'Sua conta está em processo de exclusão.',
      disabled: 'Conta Desativada', disabledBody: 'Entre em contato com o suporte para reativar sua conta.',
    },
  },
  es: {
    mk: { student: 'Alumno', notifications: 'Notificaciones', filters: 'Filtros', exit: 'Salir', instructor: 'Instructor', inviteSent: 'Invitación enviada', perMonth: 'mes' },
    pp: {
      about: 'Sobre mí', specialties: 'Especialidades', prices: 'Valores', perHour: 'Por hora:', monthly: 'Mensual:',
      inv_pending: 'Invitación enviada', inv_accepted: 'Invitación aceptada', inv_countered: 'Invitación con contrapropuesta', inv_other: 'Invitación: {{s}}',
      sendProposal: 'Enviar propuesta', format: 'Formato', fmtMonthly: 'Mensual', fmtHourly: 'Por hora', amount: 'Valor ({{c}})',
      frequency: 'Frecuencia semanal', days: 'Días (elegí {{n}})', model: 'Modalidad',
      objectives: 'Objetivos (separados por coma)', objectivesHint: 'Ej: adelgazar, hipertrofia', sending: 'Enviando…',
    },
    mens: {
      title: 'Mensualidad', proposal: 'Propuesta de cambio', month: 'mes', hour: 'hora', reject: 'Rechazar', accept: 'Aceptar',
      none: 'Ningún cobro pendiente 🎉', awaiting: 'Esperando confirmación', due: 'Vence el',
      payData: 'Datos para el pago', pix: 'Clave PIX', holder: 'Titular', bank: 'Banco', agency: 'Sucursal', account: 'Cuenta',
      sending: 'Enviando…', paid: 'Ya pagué', waitingTeacher: 'Esperando que el profesor confirme el pago.',
    },
    bloq: {
      suspended: 'Cuenta suspendida', suspendedHi: 'Tu profesor suspendió tu cuenta.',
      suspendedBody: 'Contactá a tu profesor para regularizar la situación y volver a usar la app.',
      talkTeacher: 'Hablar con el profesor', exit: 'Salir', teacherMsg: 'Mensaje del profesor:',
      removed: 'Eliminado de la lista', removedHi: '{{who}} te eliminó de su lista de alumnos.', yourTeacher: 'Tu profesor',
      removedBody: 'Podés buscar otro profesor para seguir entrenando.', findNew: 'Buscar nuevo profesor',
      expired: 'Suscripción vencida', expiredHi: '¡Tu suscripción venció!',
      expiredBody: 'Para seguir usando la app y gestionar a tus alumnos, tenés que regularizar tu pago.',
      pay: 'Regularizar pago', support: 'Hablar con soporte',
      deleting: 'Cuenta en eliminación', deletingBody: 'Tu cuenta está en proceso de eliminación.',
      disabled: 'Cuenta desactivada', disabledBody: 'Contactá a soporte para reactivar tu cuenta.',
    },
  },
  en: {
    mk: { student: 'Student', notifications: 'Notifications', filters: 'Filters', exit: 'Log out', instructor: 'Instructor', inviteSent: 'Invite sent', perMonth: 'mo' },
    pp: {
      about: 'About', specialties: 'Specialties', prices: 'Prices', perHour: 'Per hour:', monthly: 'Monthly:',
      inv_pending: 'Invite sent', inv_accepted: 'Invite accepted', inv_countered: 'Invite with counter-proposal', inv_other: 'Invite: {{s}}',
      sendProposal: 'Send proposal', format: 'Format', fmtMonthly: 'Monthly', fmtHourly: 'Per hour', amount: 'Amount ({{c}})',
      frequency: 'Weekly frequency', days: 'Days (pick {{n}})', model: 'Mode',
      objectives: 'Goals (comma separated)', objectivesHint: 'E.g.: lose weight, hypertrophy', sending: 'Sending…',
    },
    mens: {
      title: 'Monthly fee', proposal: 'Change proposal', month: 'month', hour: 'hour', reject: 'Decline', accept: 'Accept',
      none: 'No pending charges 🎉', awaiting: 'Awaiting confirmation', due: 'Due on',
      payData: 'Payment details', pix: 'PIX key', holder: 'Account holder', bank: 'Bank', agency: 'Branch', account: 'Account',
      sending: 'Sending…', paid: "I've paid", waitingTeacher: 'Waiting for your trainer to confirm the payment.',
    },
    bloq: {
      suspended: 'Account suspended', suspendedHi: 'Your trainer suspended your account.',
      suspendedBody: 'Contact your trainer to sort it out and get back into the app.',
      talkTeacher: 'Talk to trainer', exit: 'Log out', teacherMsg: 'Message from your trainer:',
      removed: 'Removed from the list', removedHi: '{{who}} removed you from their student list.', yourTeacher: 'Your trainer',
      removedBody: 'You can look for another trainer to keep training.', findNew: 'Find a new trainer',
      expired: 'Subscription expired', expiredHi: 'Your subscription has expired!',
      expiredBody: 'To keep using the app and managing your students, please settle your payment.',
      pay: 'Settle payment', support: 'Contact support',
      deleting: 'Account being deleted', deletingBody: 'Your account is being deleted.',
      disabled: 'Account disabled', disabledBody: 'Contact support to reactivate your account.',
    },
  },
})
