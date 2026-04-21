import { Locale } from "./translations";

export type LoginTranslationKey =
  | "appName"
  | "loginSubtitle"
  | "forgotSubtitle"
  | "email"
  | "emailPlaceholder"
  | "password"
  | "passwordPlaceholder"
  | "signIn"
  | "signingIn"
  | "forgotPassword"
  | "sendResetLink"
  | "sending"
  | "backToLogin"
  | "errorInvalidCredentials"
  | "errorNoClientLinked"
  | "errorNoAccess"
  | "errorLogin"
  | "errorReset"
  | "successResetSent";

export const loginTranslations: Record<Locale, Record<LoginTranslationKey, string>> = {
  pt: {
    appName: "Design Hub",
    loginSubtitle: "Faça login para acessar o painel",
    forgotSubtitle: "Recupere sua senha",
    email: "E-mail",
    emailPlaceholder: "seu@email.com",
    password: "Senha",
    passwordPlaceholder: "••••••••",
    signIn: "Entrar",
    signingIn: "Entrando...",
    forgotPassword: "Esqueci minha senha",
    sendResetLink: "Enviar link de recuperação",
    sending: "Enviando...",
    backToLogin: "Voltar para login",
    errorInvalidCredentials: "E-mail ou senha inválidos",
    errorNoClientLinked: "Nenhum cliente vinculado à sua conta",
    errorNoAccess: "Seu usuário não tem acesso liberado",
    errorLogin: "Erro ao fazer login",
    errorReset: "Erro ao enviar e-mail de recuperação",
    successResetSent: "E-mail de recuperação enviado! Verifique sua caixa de entrada.",
  },
  en: {
    appName: "Design Hub",
    loginSubtitle: "Sign in to access the panel",
    forgotSubtitle: "Recover your password",
    email: "Email",
    emailPlaceholder: "you@email.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    signIn: "Sign in",
    signingIn: "Signing in...",
    forgotPassword: "Forgot my password",
    sendResetLink: "Send recovery link",
    sending: "Sending...",
    backToLogin: "Back to login",
    errorInvalidCredentials: "Invalid email or password",
    errorNoClientLinked: "No client linked to your account",
    errorNoAccess: "Your user does not have access",
    errorLogin: "Error signing in",
    errorReset: "Error sending recovery email",
    successResetSent: "Recovery email sent! Check your inbox.",
  },
  it: {
    appName: "Design Hub",
    loginSubtitle: "Accedi per entrare nel pannello",
    forgotSubtitle: "Recupera la tua password",
    email: "E-mail",
    emailPlaceholder: "tu@email.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    signIn: "Accedi",
    signingIn: "Accesso in corso...",
    forgotPassword: "Password dimenticata",
    sendResetLink: "Invia link di recupero",
    sending: "Invio in corso...",
    backToLogin: "Torna al login",
    errorInvalidCredentials: "Email o password non validi",
    errorNoClientLinked: "Nessun cliente collegato al tuo account",
    errorNoAccess: "Il tuo utente non ha accesso",
    errorLogin: "Errore durante l'accesso",
    errorReset: "Errore nell'invio dell'email di recupero",
    successResetSent: "Email di recupero inviata! Controlla la posta.",
  },
  es: {
    appName: "Design Hub",
    loginSubtitle: "Inicia sesión para acceder al panel",
    forgotSubtitle: "Recupera tu contraseña",
    email: "Correo",
    emailPlaceholder: "tu@email.com",
    password: "Contraseña",
    passwordPlaceholder: "••••••••",
    signIn: "Entrar",
    signingIn: "Entrando...",
    forgotPassword: "Olvidé mi contraseña",
    sendResetLink: "Enviar enlace de recuperación",
    sending: "Enviando...",
    backToLogin: "Volver al inicio",
    errorInvalidCredentials: "Correo o contraseña inválidos",
    errorNoClientLinked: "Ningún cliente vinculado a tu cuenta",
    errorNoAccess: "Tu usuario no tiene acceso",
    errorLogin: "Error al iniciar sesión",
    errorReset: "Error al enviar el correo de recuperación",
    successResetSent: "¡Correo de recuperación enviado! Revisa tu bandeja.",
  },
  sv: {
    appName: "Design Hub",
    loginSubtitle: "Logga in för att komma åt panelen",
    forgotSubtitle: "Återställ ditt lösenord",
    email: "E-post",
    emailPlaceholder: "du@email.com",
    password: "Lösenord",
    passwordPlaceholder: "••••••••",
    signIn: "Logga in",
    signingIn: "Loggar in...",
    forgotPassword: "Glömt lösenord",
    sendResetLink: "Skicka återställningslänk",
    sending: "Skickar...",
    backToLogin: "Tillbaka till login",
    errorInvalidCredentials: "Ogiltig e-post eller lösenord",
    errorNoClientLinked: "Ingen klient kopplad till ditt konto",
    errorNoAccess: "Din användare har ingen åtkomst",
    errorLogin: "Fel vid inloggning",
    errorReset: "Fel vid skickande av återställningsmejl",
    successResetSent: "Återställningsmejl skickat! Kolla din inkorg.",
  },
};
