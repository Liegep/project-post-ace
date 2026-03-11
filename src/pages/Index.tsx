import { Link, useLocation } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">ContentFlow</h1>
          <p className="mt-2 text-muted-foreground">Aprovação de conteúdo simplificada</p>
        </div>

        <div className="space-y-3">
          <Link
            to="/admin"
            className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Painel do Admin
          </Link>
          <Link
            to="/client"
            className="flex w-full items-center justify-center rounded-xl border-2 border-accent bg-card px-6 py-4 text-lg font-semibold text-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Portal do Cliente
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Gerencie posts, legendas e aprovações em um só lugar.
        </p>
      </div>
    </div>
  );
};

export default Index;
