/**
 * Configuração central do site NeuroRace v2.
 * Conteúdo reaproveitado/expandido do v1. Datas e links atualizados para o NEXT 2026.
 */

/** Deploy de produção na Vercel (projeto `neurorace-v2`). `neurorace.vercel.app` não existe mais (NEU-80). */
export const DEFAULT_SITE_URL = "https://neurorace-v2.vercel.app";

/** URL canônica: `NEXT_PUBLIC_SITE_URL` se for http(s) válida, senão o deploy de produção. Sem barra final. */
export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_SITE_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_SITE_URL;
    return value.replace(/\/+$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const site = {
  name: "NeuroRace",
  tagline: "Onde a sua mente é o controle",
  description:
    "Performance cognitiva gamificada: controle um jogo com o poder do seu foco. Neurofeedback em tempo real via EEG. Projeto do NEXT FIAP Festival.",
  url: siteUrl,
  /** Contato de privacidade / titular (LGPD). Mesmo e-mail do termo v1 (ADR 0003). */
  privacyContact: "breq@breq.com.br",
  event: {
    name: "NEXT FIAP 2026",
    /** Link de votação — ativar quando o NEXT 2026 publicar. Vazio => banner mostra "em breve". */
    voteUrl: "",
  },
  social: {
    linkedinShare:
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`,
    instagram: "https://instagram.com",
    twitterShare:
      `https://x.com/intent/tweet?url=${encodeURIComponent(siteUrl)}&text=Controlei%20um%20jogo%20com%20a%20mente%20no%20NeuroRace!%20%23NeuroRace%20%23NEXTFIAP`,
  },
} as const;

/** Links de navegação do header (top nav adaptativo). */
export const navLinks = [
  { href: "/sobre", label: "O Projeto" },
  { href: "/ranking", label: "Ranking" },
  { href: "/dashboard", label: "Meu Desempenho" },
  { href: "/equipe", label: "Desenvolvedores" },
] as const;

/** Frases do carrossel (migradas do v1). */
export const quotes = [
  "Sua mente no controle. O resto é só o jogo.",
  "Onde sua atenção está, sua vitória estará.",
  "Foco não é força. É direção.",
  "No NeuroRace, seu foco é o seu combustível.",
  "Concentre-se. Respire. Domine.",
  "A corrida mais difícil é a que acontece dentro da sua mente.",
  "Não é mágica, é neurociência. E você está no comando.",
  "Seu cérebro é o controle mais avançado já criado.",
  "Em um mundo de distrações, o foco é o seu superpoder.",
  "Domine sua mente. Domine a corrida.",
  "Vence quem aprende a silenciar o ruído.",
  "Seu maior oponente é a sua própria distração.",
  "A diferença entre o bom e o lendário é um segundo a mais de foco.",
] as const;

/** Equipe (migrada do v1). Fotos em /public/assets/team. */
export const team = [
  {
    name: "Ester Silva",
    role: "Desenvolvedora Front-End",
    course: "Sistemas de Informação",
    photo: "/assets/team/ester-silva.jpg",
    linkedin: "https://br.linkedin.com/in/ester-silvaa",
  },
  {
    name: "João Victor",
    role: "Desenvolvedor Front-End",
    course: "Desenvolvimento de Sistemas",
    photo: "/assets/team/joao-victor.png",
    linkedin: "https://br.linkedin.com/in/jvmadv",
  },
  {
    name: "Nikolas Santos",
    role: "Engenheiro de Dados",
    course: "Engenharia de Software",
    photo: "/assets/team/nikolas-santos.png",
    linkedin: "https://br.linkedin.com/in/nikolas-dos-santos",
  },
  {
    name: "Pedro Henrique",
    role: "Desenvolvedor Back-end",
    course: "Engenharia de Software",
    photo: "/assets/team/pedro-henrique.png",
    linkedin: "https://br.linkedin.com/in/phptavares",
  },
  {
    name: "Thiago Oliveira",
    role: "Desenvolvedor do Jogo (Unreal)",
    course: "Engenharia de Software",
    photo: "/assets/team/thiago-oliveira.jpeg",
    linkedin: "https://br.linkedin.com/in/thiago-jardim-de-oliveira-490164298",
  },
  {
    name: "Karlos Miguel",
    role: "Professor Orientador",
    course: "Docente FIAP",
    photo: "/assets/team/karlos-miguel.png",
    linkedin: "https://br.linkedin.com/in/karlosmiguell",
  },
] as const;

/**
 * Parâmetros de métricas derivadas da telemetria.
 * PROVISÓRIO — pendente da definição oficial do backend (PLANO §3 / D1).
 */
export const metricsConfig = {
  /** attention >= este valor conta como "em foco". */
  focusZoneThreshold: 60,
} as const;
