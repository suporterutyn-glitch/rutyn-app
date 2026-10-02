import { textos } from './textos'

// Pantallas y componentes compartidos por profesor y alumno.
export default textos({
  pt: {
    install: { title: 'Instale o Rutyn no celular', subtitle: 'Abra direto da tela inicial, como um app.', now: 'Instalar', how: 'Ver como', hide: 'Fechar', ok: 'Entendi', iosSafari: 'No iPhone, abra app.rutyn.com.br no Safari para poder instalar.', ios1: 'Toque no botão Compartilhar (o quadrado com a seta para cima), embaixo da tela.', ios2: 'Role e toque em "Adicionar à Tela de Início".', ios3: 'Toque em "Adicionar" no canto superior.', and1: 'Toque no menu ⋮ do Chrome, no canto superior direito.', and2: 'Toque em "Instalar app" ou "Adicionar à tela inicial".', and3: 'Confirme em "Instalar".', after: 'Pronto: o ícone do Rutyn aparece na tela inicial do seu celular.' },
    openApp: 'Abrir o Rutyn',
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
      maxSize: 'Máximo 2MB', photoFormat: 'Não foi possível ler essa imagem. Use uma foto JPG ou PNG.', changePhoto: 'Alterar foto', learnMore: 'Saber mais', later: 'Depois', switchLang: 'Alternar idioma',
      back: 'Voltar', min: '{{label}} — mínimo', max: '{{label}} — máximo', copy: '{{name}} (cópia)', workoutName: 'TREINO - A',
    },
    extra: { tapToChat: 'Toque para conversar', pricesIn: 'Preços na sua moeda ({{c}}). Cobrança mensal via provedor.', perMonth: 'mês', notes: 'Observações: (alguma coisa que queira me contar?)' },
  },
  es: {
    install: { title: 'Instalá Rutyn en tu celular', subtitle: 'Abrila directo desde la pantalla de inicio, como una app.', now: 'Instalar', how: 'Ver cómo', hide: 'Cerrar', ok: 'Entendido', iosSafari: 'En iPhone, abrí app.rutyn.com.br en Safari para poder instalarla.', ios1: 'Tocá el botón Compartir (el cuadrado con la flecha hacia arriba), abajo de la pantalla.', ios2: 'Bajá y tocá "Agregar a pantalla de inicio".', ios3: 'Tocá "Agregar" arriba a la derecha.', and1: 'Tocá el menú ⋮ de Chrome, arriba a la derecha.', and2: 'Tocá "Instalar app" o "Agregar a la pantalla principal".', and3: 'Confirmá en "Instalar".', after: 'Listo: el ícono de Rutyn aparece en la pantalla de inicio de tu celular.' },
    openApp: 'Abrir Rutyn',
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
      maxSize: 'Máximo 2MB', photoFormat: 'No se pudo leer esa imagen. Usá una foto JPG o PNG.', changePhoto: 'Cambiar foto', learnMore: 'Saber más', later: 'Después', switchLang: 'Cambiar idioma',
      back: 'Volver', min: '{{label}} — mínimo', max: '{{label}} — máximo', copy: '{{name}} (copia)', workoutName: 'ENTRENO - A',
    },
    extra: { tapToChat: 'Tocá para conversar', pricesIn: 'Precios en tu moneda ({{c}}). Cobro mensual a través del proveedor.', perMonth: 'mes', notes: 'Observaciones: (¿algo que quieras contarme?)' },
  },
  en: {
    install: { title: 'Install Rutyn on your phone', subtitle: 'Open it straight from your home screen, like an app.', now: 'Install', how: 'Show me', hide: 'Close', ok: 'Got it', iosSafari: 'On iPhone, open app.rutyn.com.br in Safari to install it.', ios1: 'Tap the Share button (the square with the up arrow) at the bottom of the screen.', ios2: 'Scroll and tap "Add to Home Screen".', ios3: 'Tap "Add" in the top corner.', and1: 'Tap Chrome\'s ⋮ menu in the top right corner.', and2: 'Tap "Install app" or "Add to Home screen".', and3: 'Confirm with "Install".', after: 'Done: the Rutyn icon appears on your phone\'s home screen.' },
    openApp: 'Open Rutyn',
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
      maxSize: 'Max 2MB', photoFormat: "Couldn't read that image. Use a JPG or PNG photo.", changePhoto: 'Change photo', learnMore: 'Learn more', later: 'Later', switchLang: 'Switch language',
      back: 'Back', min: '{{label}} — minimum', max: '{{label}} — maximum', copy: '{{name}} (copy)', workoutName: 'WORKOUT - A',
    },
    extra: { tapToChat: 'Tap to chat', pricesIn: 'Prices in your currency ({{c}}). Billed monthly through the provider.', perMonth: 'month', notes: 'Notes: (anything you want to tell me?)' },
  },
})
