export type ProposalLocale = "pt" | "en" | "es" | "it" | "sv";

export const PROPOSAL_LOCALE_LABELS: Record<ProposalLocale, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
  it: "Italiano",
  sv: "Svenska",
};

export const PROPOSAL_LOCALE_FLAGS: Record<ProposalLocale, string> = {
  pt: "🇧🇷",
  en: "🇺🇸",
  es: "🇪🇸",
  it: "🇮🇹",
  sv: "🇸🇪",
};

interface ProposalTranslationKeys {
  proposalFor: string;
  projectScope: string;
  services: string;
  investment: string;
  total: string;
  expiresIn: string;
  acceptProposal: string;
  acceptTitle: string;
  acceptDescription: string;
  fullName: string;
  fullNamePlaceholder: string;
  digitalSignature: string;
  signaturePlaceholder: string;
  confirmAccept: string;
  processing: string;
  enterFullName: string;
  errorAccepting: string;
  proposalAccepted: string;
  proposalExpired: string;
  expiredMessage: string;
  proposalNotFound: string;
  notFoundMessage: string;
  acceptedTitle: string;
  acceptedBy: string;
  acceptedGeneric: string;
  days: string;
  day: string;
  hours: string;
  hour: string;
  minutes: string;
  minute: string;
  proposal: string;
}

const pt: ProposalTranslationKeys = {
  proposalFor: "Proposta para",
  projectScope: "Escopo do Projeto",
  services: "Serviços",
  investment: "Investimento",
  total: "Total",
  expiresIn: "Expira em",
  acceptProposal: "Aceitar Proposta",
  acceptTitle: "Aceitar Proposta",
  acceptDescription: "Preencha seus dados para confirmar a aceitação.",
  fullName: "Nome completo *",
  fullNamePlaceholder: "Seu nome completo",
  digitalSignature: "Assinatura digital (digite seu nome)",
  signaturePlaceholder: "Sua assinatura",
  confirmAccept: "Confirmar Aceitação",
  processing: "Processando...",
  enterFullName: "Informe seu nome completo",
  errorAccepting: "Erro ao aceitar proposta",
  proposalAccepted: "Proposta aceita com sucesso!",
  proposalExpired: "Proposta Expirada",
  expiredMessage: "O prazo de validade desta proposta foi encerrado. Entre em contato para solicitar uma nova proposta.",
  proposalNotFound: "Proposta não encontrada",
  notFoundMessage: "O link pode estar incorreto ou a proposta foi removida.",
  acceptedTitle: "Proposta Aceita",
  acceptedBy: "Aceita por {name}. Entraremos em contato em breve.",
  acceptedGeneric: "Obrigado! Entraremos em contato em breve para os próximos passos.",
  days: "dias",
  day: "dia",
  hours: "horas",
  hour: "hora",
  minutes: "minutos",
  minute: "minuto",
  proposal: "Proposta",
};

const en: ProposalTranslationKeys = {
  proposalFor: "Proposal for",
  projectScope: "Project Scope",
  services: "Services",
  investment: "Investment",
  total: "Total",
  expiresIn: "Expires in",
  acceptProposal: "Accept Proposal",
  acceptTitle: "Accept Proposal",
  acceptDescription: "Fill in your details to confirm acceptance.",
  fullName: "Full name *",
  fullNamePlaceholder: "Your full name",
  digitalSignature: "Digital signature (type your name)",
  signaturePlaceholder: "Your signature",
  confirmAccept: "Confirm Acceptance",
  processing: "Processing...",
  enterFullName: "Please enter your full name",
  errorAccepting: "Error accepting proposal",
  proposalAccepted: "Proposal accepted successfully!",
  proposalExpired: "Proposal Expired",
  expiredMessage: "This proposal has expired. Please contact us to request a new proposal.",
  proposalNotFound: "Proposal not found",
  notFoundMessage: "The link may be incorrect or the proposal has been removed.",
  acceptedTitle: "Proposal Accepted",
  acceptedBy: "Accepted by {name}. We will be in touch soon.",
  acceptedGeneric: "Thank you! We will contact you shortly with the next steps.",
  days: "days",
  day: "day",
  hours: "hours",
  hour: "hour",
  minutes: "minutes",
  minute: "minute",
  proposal: "Proposal",
};

const es: ProposalTranslationKeys = {
  proposalFor: "Propuesta para",
  projectScope: "Alcance del Proyecto",
  services: "Servicios",
  investment: "Inversión",
  total: "Total",
  expiresIn: "Expira en",
  acceptProposal: "Aceptar Propuesta",
  acceptTitle: "Aceptar Propuesta",
  acceptDescription: "Complete sus datos para confirmar la aceptación.",
  fullName: "Nombre completo *",
  fullNamePlaceholder: "Su nombre completo",
  digitalSignature: "Firma digital (escriba su nombre)",
  signaturePlaceholder: "Su firma",
  confirmAccept: "Confirmar Aceptación",
  processing: "Procesando...",
  enterFullName: "Ingrese su nombre completo",
  errorAccepting: "Error al aceptar la propuesta",
  proposalAccepted: "¡Propuesta aceptada con éxito!",
  proposalExpired: "Propuesta Expirada",
  expiredMessage: "El plazo de validez de esta propuesta ha finalizado. Contáctenos para solicitar una nueva propuesta.",
  proposalNotFound: "Propuesta no encontrada",
  notFoundMessage: "El enlace puede ser incorrecto o la propuesta fue eliminada.",
  acceptedTitle: "Propuesta Aceptada",
  acceptedBy: "Aceptada por {name}. Nos pondremos en contacto pronto.",
  acceptedGeneric: "¡Gracias! Nos pondremos en contacto pronto con los próximos pasos.",
  days: "días",
  day: "día",
  hours: "horas",
  hour: "hora",
  minutes: "minutos",
  minute: "minuto",
  proposal: "Propuesta",
};

const it: ProposalTranslationKeys = {
  proposalFor: "Proposta per",
  projectScope: "Ambito del Progetto",
  services: "Servizi",
  investment: "Investimento",
  total: "Totale",
  expiresIn: "Scade tra",
  acceptProposal: "Accetta Proposta",
  acceptTitle: "Accetta Proposta",
  acceptDescription: "Compila i tuoi dati per confermare l'accettazione.",
  fullName: "Nome completo *",
  fullNamePlaceholder: "Il tuo nome completo",
  digitalSignature: "Firma digitale (digita il tuo nome)",
  signaturePlaceholder: "La tua firma",
  confirmAccept: "Conferma Accettazione",
  processing: "Elaborazione...",
  enterFullName: "Inserisci il tuo nome completo",
  errorAccepting: "Errore nell'accettare la proposta",
  proposalAccepted: "Proposta accettata con successo!",
  proposalExpired: "Proposta Scaduta",
  expiredMessage: "Il termine di validità di questa proposta è scaduto. Contattaci per richiedere una nuova proposta.",
  proposalNotFound: "Proposta non trovata",
  notFoundMessage: "Il link potrebbe essere errato o la proposta è stata rimossa.",
  acceptedTitle: "Proposta Accettata",
  acceptedBy: "Accettata da {name}. Ti contatteremo presto.",
  acceptedGeneric: "Grazie! Ti contatteremo presto per i prossimi passi.",
  days: "giorni",
  day: "giorno",
  hours: "ore",
  hour: "ora",
  minutes: "minuti",
  minute: "minuto",
  proposal: "Proposta",
};

const sv: ProposalTranslationKeys = {
  proposalFor: "Förslag till",
  projectScope: "Projektomfattning",
  services: "Tjänster",
  investment: "Investering",
  total: "Totalt",
  expiresIn: "Förfaller om",
  acceptProposal: "Acceptera Förslag",
  acceptTitle: "Acceptera Förslag",
  acceptDescription: "Fyll i dina uppgifter för att bekräfta acceptansen.",
  fullName: "Fullständigt namn *",
  fullNamePlaceholder: "Ditt fullständiga namn",
  digitalSignature: "Digital signatur (skriv ditt namn)",
  signaturePlaceholder: "Din signatur",
  confirmAccept: "Bekräfta Acceptans",
  processing: "Bearbetar...",
  enterFullName: "Ange ditt fullständiga namn",
  errorAccepting: "Fel vid acceptans av förslag",
  proposalAccepted: "Förslaget har accepterats!",
  proposalExpired: "Förslaget Har Förfallit",
  expiredMessage: "Giltighetstiden för detta förslag har löpt ut. Kontakta oss för att begära ett nytt förslag.",
  proposalNotFound: "Förslaget hittades inte",
  notFoundMessage: "Länken kan vara felaktig eller förslaget har tagits bort.",
  acceptedTitle: "Förslag Accepterat",
  acceptedBy: "Accepterat av {name}. Vi hör av oss snart.",
  acceptedGeneric: "Tack! Vi kontaktar dig inom kort med nästa steg.",
  days: "dagar",
  day: "dag",
  hours: "timmar",
  hour: "timme",
  minutes: "minuter",
  minute: "minut",
  proposal: "Förslag",
};

export const proposalTranslations: Record<ProposalLocale, ProposalTranslationKeys> = {
  pt, en, es, it, sv,
};

export function getProposalT(locale: ProposalLocale) {
  return (key: keyof ProposalTranslationKeys) => proposalTranslations[locale]?.[key] || proposalTranslations.pt[key] || key;
}
