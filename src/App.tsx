import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { SplashPage } from '@/pages/Splash'
import { IdentificacaoPage } from '@/pages/Identificacao'
import { LoginPage } from '@/pages/Login'
import { EsqueciSenhaPage } from '@/pages/EsqueciSenha'
import { RedefinirSenhaPage } from '@/pages/RedefinirSenha'
import { CadastroProfessorPage } from '@/pages/CadastroProfessor'
import { CadastroAlunoPage } from '@/pages/CadastroAluno'
import { AguardandoAprovacaoPage } from '@/pages/AguardandoAprovacao'
import { BloqueadoPage } from '@/pages/Bloqueado'
import { StatusGate } from '@/pages/StatusGate'
import { ProfessorShell } from '@/pages/professor/ProfessorShell'
import { ProfessorHome } from '@/pages/professor/Home'
import { MeusProjetosPage } from '@/pages/professor/MeusProjetos'
import { AlunosPage } from '@/pages/professor/Alunos'
import { AlunoPerfilPage } from '@/pages/professor/AlunoPerfil'
import { FinanceiroPage } from '@/pages/professor/Financeiro'
import { DadosBancariosPage } from '@/pages/professor/DadosBancarios'
import { AssinaturaPage } from '@/pages/professor/Assinatura'
import { CompletarPerfilPage } from '@/pages/professor/CompletarPerfil'
import { ConvitesPage } from '@/pages/professor/Convites'
import { AvaliacaoProfessorPage } from '@/pages/professor/Avaliacao'
import { EditorRotinaPage } from '@/pages/professor/EditorRotina'
import { EditorDietaPage } from '@/pages/professor/EditorDieta'
import { NovoCompromissoPage } from '@/pages/professor/NovoCompromisso'
import { CriarNotificacaoPage } from '@/pages/professor/CriarNotificacao'
import { ReceitaPage } from '@/pages/Receita'
import { ConversasPage, ConversaPage } from '@/pages/Chat'
import { NotificacoesPage as NotificacoesCentralPage } from '@/pages/Notificacoes'
import { ConfiguracoesPage } from '@/pages/Configuracoes'
import { MeuPerfilPage } from '@/pages/MeuPerfil'
import { AnamneseProfessorPage, AnamneseAlunoListaPage, AnamneseResponderPage } from '@/pages/Anamnese'
import { AlunoShell } from '@/pages/aluno/AlunoShell'
import { AlunoHome } from '@/pages/aluno/Home'
import { TreinosPage } from '@/pages/aluno/Treinos'
import { TreinoDetalhePage } from '@/pages/aluno/TreinoDetalhe'
import { TreinoExecucaoPage } from '@/pages/aluno/TreinoExecucao'
import { TreinoResumoPage } from '@/pages/aluno/TreinoResumo'
import { NutricaoPage } from '@/pages/aluno/Nutricao'
import { MensalidadePage } from '@/pages/aluno/Mensalidade'
import { PerfilProfessorPublicoPage } from '@/pages/aluno/PerfilProfessor'
import { AvaliacaoAlunoPage } from '@/pages/aluno/Avaliacao'
import { EncontrarProfessorPage } from '@/pages/aluno/EncontrarProfessor'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/identificacao" element={<IdentificacaoPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
          <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
          <Route path="/cadastro/professor" element={<CadastroProfessorPage />} />
          <Route path="/cadastro/aluno" element={<CadastroAlunoPage />} />
          <Route path="/aguardando" element={<AguardandoAprovacaoPage />} />
          <Route path="/bloqueado" element={<BloqueadoPage />} />
          <Route path="/receita/:id" element={<ReceitaPage />} />

          <Route path="/professor" element={<StatusGate role="teacher"><ProfessorShell /></StatusGate>}>
            <Route index element={<ProfessorHome />} />
            <Route path="projetos" element={<MeusProjetosPage />} />
            <Route path="alunos" element={<AlunosPage />} />
            <Route path="alunos/:id" element={<AlunoPerfilPage />} />
            <Route path="mensagens" element={<ConversasPage />} />
            <Route path="mensagens/:id" element={<ConversaPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="dados-bancarios" element={<DadosBancariosPage />} />
            <Route path="notificacoes" element={<NotificacoesCentralPage />} />
            <Route path="convites" element={<ConvitesPage />} />
            <Route path="avaliacoes/:id" element={<AvaliacaoProfessorPage />} />
            <Route path="anamnese/:id" element={<AnamneseProfessorPage />} />
            <Route path="assinatura" element={<AssinaturaPage />} />
            <Route path="perfil/completar" element={<CompletarPerfilPage />} />
            <Route path="compromisso/novo" element={<NovoCompromissoPage />} />
            <Route path="rotinas/:id" element={<EditorRotinaPage />} />
            <Route path="dietas/:id" element={<EditorDietaPage />} />
            <Route path="notificar" element={<CriarNotificacaoPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="perfil" element={<MeuPerfilPage />} />
          </Route>

          <Route path="/aluno/encontrar-professor" element={<StatusGate role="student"><EncontrarProfessorPage /></StatusGate>} />
          <Route path="/aluno/encontrar-professor/:id" element={<StatusGate role="student"><PerfilProfessorPublicoPage /></StatusGate>} />
          <Route path="/aluno/treinos/:id/execucao" element={<StatusGate role="student"><TreinoExecucaoPage /></StatusGate>} />
          <Route path="/aluno/treinos/:id/resumo" element={<StatusGate role="student"><TreinoResumoPage /></StatusGate>} />

          <Route path="/aluno" element={<StatusGate role="student"><AlunoShell /></StatusGate>}>
            <Route index element={<AlunoHome />} />
            <Route path="treinos" element={<TreinosPage />} />
            <Route path="treinos/:id" element={<TreinoDetalhePage />} />
            <Route path="nutricao" element={<NutricaoPage />} />
            <Route path="chat" element={<ConversasPage />} />
            <Route path="chat/:id" element={<ConversaPage />} />
            <Route path="avaliacao" element={<AvaliacaoAlunoPage />} />
            <Route path="notificacoes" element={<NotificacoesCentralPage />} />
            <Route path="mensalidade" element={<MensalidadePage />} />
            <Route path="anamneses" element={<AnamneseAlunoListaPage />} />
            <Route path="anamnese/:id" element={<AnamneseResponderPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="perfil" element={<MeuPerfilPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
