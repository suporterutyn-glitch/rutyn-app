import { textos } from './textos'

export default textos({
  pt: {
    c: { student: 'Aluno', monthly: 'Mensal', hourly: 'Por hora', monthlyLower: 'mensal', hourlyLower: 'por hora', format: 'Formato', sending: 'Enviando…', loading: 'Carregando…', newValue: 'Novo valor ({{cur}})', value: 'Valor ({{cur}})', reasonOpt: 'Motivo (opcional)' },
    fin: {
      title: 'Financeiro', bank: 'Dados bancários', received: 'Recebido no mês', all: 'Todos', pending: 'Pendente', awaiting: 'Aguardando', paid: 'Pago', suspended: 'Suspenso',
      none: 'Sem cobranças', noneBody: 'Cobre seu primeiro aluno para começar.', dueOn: 'Vence: {{date}}', confirm: 'Confirmar', markPaid: 'Marcar paga', change: 'Alterar',
      charge: 'Cobrar Aluno', proposeTitle: 'Propor alteração', current: 'Cobrança atual:', newFormat: 'Novo formato', sendProposal: 'Enviar proposta ao aluno',
      select: 'Selecione…', dueDate: 'Data de vencimento', sendCharge: 'Enviar cobrança', errStudent: 'Escolha o aluno.', errAmount: 'Digite um valor maior que zero.', errSave: 'Não foi possível criar a cobrança. Tente de novo.',
    },
    conv: {
      title: 'Convites Recebidos', none: 'Nenhum convite', noneBody: 'Você não tem convites pendentes.', counterSent: 'Contraproposta enviada', proposalSent: 'Proposta enviada: aguardando o aluno', noPrice: 'Ainda sem valor: envie sua proposta ao aluno.', propose: 'Enviar proposta', editProposal: 'Editar proposta', perWeekShort: '{{n}}x/sem',
      reject: 'Recusar', counter: 'Contrapor', accept: 'Aceitar', limit: 'Limite de alunos atingido. Faça upgrade do plano.', counterTitle: 'Contraproposta',
      studentProposal: 'Proposta do aluno:', weeklyFreq: 'Frequência semanal', sendCounter: 'Enviar contraproposta',
    },
  },
  es: {
    c: { student: 'Alumno', monthly: 'Mensual', hourly: 'Por hora', monthlyLower: 'mensual', hourlyLower: 'por hora', format: 'Formato', sending: 'Enviando…', loading: 'Cargando…', newValue: 'Nuevo valor ({{cur}})', value: 'Valor ({{cur}})', reasonOpt: 'Motivo (opcional)' },
    fin: {
      title: 'Finanzas', bank: 'Datos bancarios', received: 'Recibido en el mes', all: 'Todos', pending: 'Pendiente', awaiting: 'En espera', paid: 'Pagado', suspended: 'Suspendido',
      none: 'Sin cobros', noneBody: 'Cobrale a tu primer alumno para empezar.', dueOn: 'Vence: {{date}}', confirm: 'Confirmar', markPaid: 'Marcar pagado', change: 'Cambiar',
      charge: 'Cobrar Alumno', proposeTitle: 'Proponer cambio', current: 'Cobro actual:', newFormat: 'Nuevo formato', sendProposal: 'Enviar propuesta al alumno',
      select: 'Seleccioná…', dueDate: 'Fecha de vencimiento', sendCharge: 'Enviar cobro', errStudent: 'Elegí el alumno.', errAmount: 'Ingresá un monto mayor a cero.', errSave: 'No se pudo crear el cobro. Probá de nuevo.',
    },
    conv: {
      title: 'Invitaciones Recibidas', none: 'Ninguna invitación', noneBody: 'No tenés invitaciones pendientes.', counterSent: 'Contrapropuesta enviada', proposalSent: 'Propuesta enviada: esperando al alumno', noPrice: 'Todavía sin precio: enviale tu propuesta al alumno.', propose: 'Enviar propuesta', editProposal: 'Editar propuesta', perWeekShort: '{{n}}x/sem',
      reject: 'Rechazar', counter: 'Contraofertar', accept: 'Aceptar', limit: 'Llegaste al límite de alumnos. Mejorá tu plan.', counterTitle: 'Contrapropuesta',
      studentProposal: 'Propuesta del alumno:', weeklyFreq: 'Frecuencia semanal', sendCounter: 'Enviar contrapropuesta',
    },
  },
  en: {
    c: { student: 'Student', monthly: 'Monthly', hourly: 'Hourly', monthlyLower: 'monthly', hourlyLower: 'hourly', format: 'Format', sending: 'Sending…', loading: 'Loading…', newValue: 'New amount ({{cur}})', value: 'Amount ({{cur}})', reasonOpt: 'Reason (optional)' },
    fin: {
      title: 'Finances', bank: 'Bank details', received: 'Received this month', all: 'All', pending: 'Pending', awaiting: 'Awaiting', paid: 'Paid', suspended: 'Suspended',
      none: 'No charges', noneBody: 'Charge your first student to get started.', dueOn: 'Due: {{date}}', confirm: 'Confirm', markPaid: 'Mark as paid', change: 'Change',
      charge: 'Charge Student', proposeTitle: 'Propose change', current: 'Current charge:', newFormat: 'New format', sendProposal: 'Send proposal to student',
      select: 'Select…', dueDate: 'Due date', sendCharge: 'Send charge', errStudent: 'Choose the student.', errAmount: 'Enter an amount greater than zero.', errSave: 'The charge could not be created. Try again.',
    },
    conv: {
      title: 'Received Invitations', none: 'No invitations', noneBody: "You don't have pending invitations.", counterSent: 'Counteroffer sent', proposalSent: 'Proposal sent: waiting for the student', noPrice: 'No price yet: send your proposal to the student.', propose: 'Send proposal', editProposal: 'Edit proposal', perWeekShort: '{{n}}x/wk',
      reject: 'Decline', counter: 'Counteroffer', accept: 'Accept', limit: 'Student limit reached. Upgrade your plan.', counterTitle: 'Counteroffer',
      studentProposal: "Student's proposal:", weeklyFreq: 'Weekly frequency', sendCounter: 'Send counteroffer',
    },
  },
})
