import {
  CalendarDays,
  ListChecks,
  Share2,
  Bell,
  Fingerprint,
  CalendarPlus,
  Filter,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  summary: string;
  details: string;
}

export const features: Feature[] = [
  {
    icon: CalendarDays,
    title: "Eventos com contagem",
    summary: "Veja quanto tempo faz ou quanto falta para cada data.",
    details:
      "Crie eventos passados ou futuros. O Chronosbot calcula automaticamente anos, meses e dias, atualizando em tempo real. Use o botão Novo evento no header para começar.",
  },
  {
    icon: ListChecks,
    title: "Listas organizadas",
    summary: "Agrupe eventos em listas temáticas (família, trabalho, viagens).",
    details:
      "Acesse Listas no menu para criar coleções. Eventos criados dentro de uma lista são automaticamente vinculados. Cada lista pode ter dezenas de eventos.",
  },
  {
    icon: Share2,
    title: "Compartilhamento",
    summary: "Convide outras pessoas para acompanhar suas datas.",
    details:
      "Em qualquer lista que você criou, copie o link e envie. Quem abrir o link entra automaticamente na lista e passa a ver os eventos compartilhados.",
  },
  {
    icon: CalendarPlus,
    title: "Google Calendar",
    summary: "Exporte eventos para seu calendário pessoal.",
    details:
      "Conecte sua conta Google e envie eventos individuais ou listas inteiras para o Google Calendar, com lembretes anuais opcionais.",
  },
  {
    icon: Filter,
    title: "Filtros e ordenação",
    summary: "Encontre rapidamente o que importa agora.",
    details:
      "Filtre por categoria e alterne entre eventos mais próximos ou mais distantes. Eventos futuros sempre aparecem no topo.",
  },
  {
    icon: LayoutGrid,
    title: "Visualização flexível",
    summary: "Alterne entre cartões e lista compacta.",
    details:
      "Use o botão de visualização no header para alternar entre cartões (mais visual) e lista compacta (mais densa) conforme sua preferência.",
  },
  {
    icon: Fingerprint,
    title: "Login com biometria",
    summary: "Entre com Face ID, Touch ID ou impressão digital.",
    details:
      "Em Segurança você pode registrar dispositivos com passkeys para logar sem digitar senha. Ideal para celular.",
  },
  {
    icon: Bell,
    title: "Atualização em tempo real",
    summary: "Contagens recalculadas automaticamente.",
    details:
      "Não precisa atualizar a página: o app recalcula tempos decorridos e tempos restantes a cada renderização.",
  },
];

export interface GuideSection {
  id: string;
  title: string;
  items: string[];
}

export const guideSections: GuideSection[] = [
  {
    id: "first-steps",
    title: "Primeiros passos",
    items: [
      "Crie sua conta com e-mail e senha, ou use o login social.",
      "Confirme seu e-mail caso solicitado.",
      "Na tela inicial, clique em Novo evento para cadastrar sua primeira data.",
    ],
  },
  {
    id: "initial-setup",
    title: "Configuração inicial",
    items: [
      "Adicione 2 ou 3 eventos importantes para sentir como funciona.",
      "Defina uma categoria em cada evento para facilitar filtros futuros.",
      "Acesse Segurança para registrar a biometria do seu dispositivo (opcional).",
    ],
  },
  {
    id: "recommended-flow",
    title: "Fluxo recomendado de uso",
    items: [
      "Cadastre os eventos individuais na tela inicial.",
      "Crie listas para agrupar eventos por contexto (família, trabalho).",
      "Compartilhe a lista com pessoas próximas via link.",
      "Exporte para o Google Calendar quando quiser lembretes nativos.",
    ],
  },
  {
    id: "tips",
    title: "Dicas rápidas",
    items: [
      "Use categorias curtas e padronizadas — facilitam o filtro.",
      "Eventos futuros aparecem sempre no topo, ordenados por proximidade.",
      "O link de uma lista funciona como convite: qualquer pessoa logada entra ao abrir.",
      "Para instalar como app, use Adicionar à tela inicial no navegador.",
    ],
  },
  {
    id: "faq",
    title: "Perguntas frequentes",
    items: [
      "Posso usar offline? Sim, depois do primeiro login os dados ficam acessíveis.",
      "Meus dados são privados? Sim, somente você (e quem entrar nas suas listas) vê seus eventos.",
      "Posso editar um evento? Sim, abra o menu do evento e escolha Editar.",
      "Como excluo uma lista? Apenas o criador da lista pode excluí-la.",
    ],
  },
  {
    id: "troubleshooting",
    title: "Resolução de problemas",
    items: [
      "Tela em branco: atualize a página (Ctrl+F5) e verifique a conexão.",
      "Não recebi e-mail de confirmação: cheque a caixa de spam ou solicite um novo.",
      "Biometria não funciona: refaça o cadastro do dispositivo em Segurança.",
      "Persistindo o problema, fale com o desenvolvedor pelo WhatsApp.",
    ],
  },
];