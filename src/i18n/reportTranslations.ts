import { ptBR, enUS, it, es, sv } from "date-fns/locale";
import type { Locale } from "date-fns";

export type ReportLocale = "pt" | "en" | "it" | "es" | "sv";

export interface ReportTranslations {
  report: string;
  notFound: string;
  publishAndSend: string;
  sentToClient: string;
  published: string;
  draft: string;
  strategicAnalysis: string;
  mainMetrics: string;
  previous: string;
  bestContent: string;
  worstContent: string;
  bestFormat: string;
  observations: string;
  topResultsTitle: string;
  topPosts: string;
  topReels: string;
  topStories: string;
  recommendations: string;
  metricLabels: Record<string, string>;
}

const PT: ReportTranslations = {
  report: "Relatório",
  notFound: "Relatório não encontrado",
  publishAndSend: "Publicar e Enviar",
  sentToClient: "Enviado ao cliente",
  published: "Publicado",
  draft: "Rascunho",
  strategicAnalysis: "Análise Estratégica",
  mainMetrics: "Métricas Principais",
  previous: "Anterior",
  bestContent: "Melhor Conteúdo",
  worstContent: "Pior Conteúdo",
  bestFormat: "Melhor Formato",
  observations: "Observações",
  topResultsTitle: "Conteúdos com mais resultados",
  topPosts: "Top 3 Posts",
  topReels: "Top 3 Reels",
  topStories: "Top 3 Stories",
  recommendations: "Recomendações e Próximos Passos",
  metricLabels: {
    views: "Visualizações",
    reach: "Alcance",
    content_interactions: "Interações com o conteúdo",
    profile_visits: "Visitas ao Perfil",
    link_clicks: "Cliques no link",
    followers: "Seguidores",
    impressions: "Impressões",
    engagement: "Engajamento",
    interactions: "Interações",
    clicks: "Cliques",
    followers_gained: "Seguidores Ganhos",
    followers_lost: "Seguidores Perdidos",
    posts_published: "Posts Publicados",
    reels_published: "Reels Publicados",
    spend: "Investimento",
  },
};

const EN: ReportTranslations = {
  report: "Report",
  notFound: "Report not found",
  publishAndSend: "Publish & Send",
  sentToClient: "Sent to client",
  published: "Published",
  draft: "Draft",
  strategicAnalysis: "Strategic Analysis",
  mainMetrics: "Main Metrics",
  previous: "Previous",
  bestContent: "Best Content",
  worstContent: "Worst Content",
  bestFormat: "Best Format",
  observations: "Notes",
  topResultsTitle: "Top performing content",
  topPosts: "Top 3 Posts",
  topReels: "Top 3 Reels",
  topStories: "Top 3 Stories",
  recommendations: "Recommendations & Next Steps",
  metricLabels: {
    views: "Views",
    reach: "Reach",
    content_interactions: "Content interactions",
    profile_visits: "Profile visits",
    link_clicks: "Link clicks",
    followers: "Followers",
    impressions: "Impressions",
    engagement: "Engagement",
    interactions: "Interactions",
    clicks: "Clicks",
    followers_gained: "Followers gained",
    followers_lost: "Followers lost",
    posts_published: "Posts published",
    reels_published: "Reels published",
    spend: "Spend",
  },
};

const IT: ReportTranslations = {
  report: "Report",
  notFound: "Report non trovato",
  publishAndSend: "Pubblica e invia",
  sentToClient: "Inviato al cliente",
  published: "Pubblicato",
  draft: "Bozza",
  strategicAnalysis: "Analisi strategica",
  mainMetrics: "Metriche principali",
  previous: "Precedente",
  bestContent: "Miglior contenuto",
  worstContent: "Peggior contenuto",
  bestFormat: "Miglior formato",
  observations: "Note",
  topResultsTitle: "Contenuti con più risultati",
  topPosts: "Top 3 Post",
  topReels: "Top 3 Reel",
  topStories: "Top 3 Storie",
  recommendations: "Raccomandazioni e prossimi passi",
  metricLabels: {
    views: "Visualizzazioni",
    reach: "Copertura",
    content_interactions: "Interazioni con i contenuti",
    profile_visits: "Visite al profilo",
    link_clicks: "Clic sul link",
    followers: "Follower",
    impressions: "Impressioni",
    engagement: "Coinvolgimento",
    interactions: "Interazioni",
    clicks: "Clic",
    followers_gained: "Follower acquisiti",
    followers_lost: "Follower persi",
    posts_published: "Post pubblicati",
    reels_published: "Reel pubblicati",
    spend: "Investimento",
  },
};

const ES: ReportTranslations = {
  report: "Informe",
  notFound: "Informe no encontrado",
  publishAndSend: "Publicar y enviar",
  sentToClient: "Enviado al cliente",
  published: "Publicado",
  draft: "Borrador",
  strategicAnalysis: "Análisis estratégico",
  mainMetrics: "Métricas principales",
  previous: "Anterior",
  bestContent: "Mejor contenido",
  worstContent: "Peor contenido",
  bestFormat: "Mejor formato",
  observations: "Observaciones",
  topResultsTitle: "Contenidos con mejores resultados",
  topPosts: "Top 3 Posts",
  topReels: "Top 3 Reels",
  topStories: "Top 3 Stories",
  recommendations: "Recomendaciones y próximos pasos",
  metricLabels: {
    views: "Visualizaciones",
    reach: "Alcance",
    content_interactions: "Interacciones con el contenido",
    profile_visits: "Visitas al perfil",
    link_clicks: "Clics en el enlace",
    followers: "Seguidores",
    impressions: "Impresiones",
    engagement: "Interacción",
    interactions: "Interacciones",
    clicks: "Clics",
    followers_gained: "Seguidores ganados",
    followers_lost: "Seguidores perdidos",
    posts_published: "Publicaciones",
    reels_published: "Reels publicados",
    spend: "Inversión",
  },
};

const SV: ReportTranslations = {
  report: "Rapport",
  notFound: "Rapport hittades inte",
  publishAndSend: "Publicera och skicka",
  sentToClient: "Skickat till kunden",
  published: "Publicerad",
  draft: "Utkast",
  strategicAnalysis: "Strategisk analys",
  mainMetrics: "Huvudmått",
  previous: "Föregående",
  bestContent: "Bästa innehåll",
  worstContent: "Sämsta innehåll",
  bestFormat: "Bästa format",
  observations: "Anteckningar",
  topResultsTitle: "Innehåll med bästa resultat",
  topPosts: "Topp 3 Inlägg",
  topReels: "Topp 3 Reels",
  topStories: "Topp 3 Stories",
  recommendations: "Rekommendationer och nästa steg",
  metricLabels: {
    views: "Visningar",
    reach: "Räckvidd",
    content_interactions: "Innehållsinteraktioner",
    profile_visits: "Profilbesök",
    link_clicks: "Länkklick",
    followers: "Följare",
    impressions: "Visningar",
    engagement: "Engagemang",
    interactions: "Interaktioner",
    clicks: "Klick",
    followers_gained: "Nya följare",
    followers_lost: "Tappade följare",
    posts_published: "Publicerade inlägg",
    reels_published: "Publicerade reels",
    spend: "Investering",
  },
};

const MAP: Record<ReportLocale, ReportTranslations> = { pt: PT, en: EN, it: IT, es: ES, sv: SV };
const DATE_LOCALES: Record<ReportLocale, Locale> = { pt: ptBR, en: enUS, it, es, sv };
const NUMBER_LOCALES: Record<ReportLocale, string> = {
  pt: "pt-BR", en: "en-US", it: "it-IT", es: "es-ES", sv: "sv-SE",
};

export function getReportT(locale?: string): ReportTranslations {
  const key = (locale as ReportLocale) || "pt";
  return MAP[key] || PT;
}
export function getReportDateLocale(locale?: string): Locale {
  const key = (locale as ReportLocale) || "pt";
  return DATE_LOCALES[key] || ptBR;
}
export function getReportNumberLocale(locale?: string): string {
  const key = (locale as ReportLocale) || "pt";
  return NUMBER_LOCALES[key] || "pt-BR";
}
