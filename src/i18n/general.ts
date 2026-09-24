import { textos } from './textos'

// Pantallas y componentes compartidos por profesor y alumno.
export default textos({
  pt: {
    showPassword: 'Mostrar senha', acceptTerms: 'Aceite os termos', chooseGender: 'Selecione o gênero',
    rs: {
      title: 'Redefinir senha', tooShort: 'Senha muito curta (mínimo 6 caracteres)', mismatch: 'Senhas não coincidem',
      expired: 'Este link expirou ou já foi usado. Peça um novo na tela de login.',
      invalid: 'Este link não é válido. Peça um novo na tela de login.',
      openLink: 'Abra o link enviado ao seu e-mail para redefinir a senha.', backToLogin: 'Voltar ao login',
      done: 'Senha atualizada com sucesso.', newPassword: 'Nova senha', confirmPassword: 'Confirmar senha', save: 'Salvar nova senha',
    },
    cfg: {
      push: 'Notificações push', togglePush: 'Ativar ou desativar notificações push', pushError: 'Erro ao ativar',
      deleteQ: 'Excluir sua conta?', deleteDetail: 'Sua conta fica marcada para exclusão e você sai do aplicativo.', delete: 'Excluir',
    },
    pushErr: { unsupported: 'Este navegador não suporta notificações push', notConfigured: 'Notificações push ainda não configuradas', denied: 'Permissão negada', invalid: 'Não foi possível ativar as notificações' },
    chat: { title: 'Mensagens', none: 'Sem conversas', noneTeacher: 'Assim que você tiver alunos ativos aparecerão aqui.', noneStudent: 'Aguarde ser vinculado a um professor.', placeholder: 'Digite sua mensagem…' },
    ui: {
      confirm: 'Confirmar', cancel: 'Cancelar', search: 'Buscar...', nothingFound: 'Nenhum dado encontrado',
      maxSize: 'Máximo 2MB', changePhoto: 'Alterar foto', learnMore: 'Saber mais', later: 'Depois', switchLang: 'Alternar idioma',
      back: 'Voltar', min: '{{label}} — mínimo', max: '{{label}} — máximo', copy: '{{name}} (cópia)', workoutName: 'TREINO - A',
    },
  },
  es: {
    showPassword: 'Mostrar contraseña', acceptTerms: 'Aceptá los términos', chooseGender: 'Seleccioná el género',
    rs: {
      title: 'Restablecer contraseña', tooShort: 'Contraseña muy corta (mínimo 6 caracteres)', mismatch: 'Las contraseñas no coinciden',
      expired: 'Este enlace venció o ya se usó. Pedí uno nuevo en la pantalla de inicio de sesión.',
      invalid: 'Este enlace no es válido. Pedí uno nuevo en la pantalla de inicio de sesión.',
      openLink: 'Abrí el enlace que te enviamos por correo para restablecer la contraseña.', backToLogin: 'Volver al inicio de sesión',
      done: 'Contraseña actualizada.', newPassword: 'Nueva contraseña', confirmPassword: 'Confirmar contraseña', save: 'Guardar nueva contraseña',
    },
    cfg: {
      push: 'Notificaciones push', togglePush: 'Activar o desactivar notificaciones push', pushError: 'Error al activar',
      deleteQ: '¿Eliminar tu cuenta?', deleteDetail: 'Tu cuenta queda marcada para eliminación y salís de la aplicación.', delete: 'Eliminar',
    },
    pushErr: { unsupported: 'Este navegador no admite notificaciones push', notConfigured: 'Las notificaciones push todavía no están configuradas', denied: 'Permiso denegado', invalid: 'No se pudieron activar las notificaciones' },
    chat: { title: 'Mensajes', none: 'Sin conversaciones', noneTeacher: 'Cuando tengas alumnos activos aparecerán acá.', noneStudent: 'Esperá a que un profesor te vincule.', placeholder: 'Escribí tu mensaje…' },
    ui: {
      confirm: 'Confirmar', cancel: 'Cancelar', search: 'Buscar...', nothingFound: 'No se encontraron datos',
      maxSize: 'Máximo 2MB', changePhoto: 'Cambiar foto', learnMore: 'Saber más', later: 'Después', switchLang: 'Cambiar idioma',
      back: 'Volver', min: '{{label}} — mínimo', max: '{{label}} — máximo', copy: '{{name}} (copia)', workoutName: 'ENTRENO - A',
    },
  },
  en: {
    showPassword: 'Show password', acceptTerms: 'Please accept the terms', chooseGender: 'Please select a gender',
    rs: {
      title: 'Reset password', tooShort: 'Password too short (minimum 6 characters)', mismatch: "Passwords don't match",
      expired: 'This link has expired or was already used. Request a new one from the login screen.',
      invalid: 'This link is not valid. Request a new one from the login screen.',
      openLink: 'Open the link we sent to your email to reset your password.', backToLogin: 'Back to login',
      done: 'Password updated.', newPassword: 'New password', confirmPassword: 'Confirm password', save: 'Save new password',
    },
    cfg: {
      push: 'Push notifications', togglePush: 'Turn push notifications on or off', pushError: 'Could not turn on',
      deleteQ: 'Delete your account?', deleteDetail: 'Your account will be marked for deletion and you will be logged out.', delete: 'Delete',
    },
    pushErr: { unsupported: "This browser doesn't support push notifications", notConfigured: "Push notifications aren't set up yet", denied: 'Permission denied', invalid: 'Could not turn on notifications' },
    chat: { title: 'Messages', none: 'No conversations', noneTeacher: 'Your active students will show up here.', noneStudent: 'Wait until a trainer links you.', placeholder: 'Type your message…' },
    ui: {
      confirm: 'Confirm', cancel: 'Cancel', search: 'Search...', nothingFound: 'Nothing found',
      maxSize: 'Max 2MB', changePhoto: 'Change photo', learnMore: 'Learn more', later: 'Later', switchLang: 'Switch language',
      back: 'Back', min: '{{label}} — minimum', max: '{{label}} — maximum', copy: '{{name}} (copy)', workoutName: 'WORKOUT - A',
    },
  },
})
