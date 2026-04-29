import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#000000",
          "--normal-border": "#e5e7eb",
          "--success-bg": "#ffffff",
          "--success-text": "#000000",
          "--success-border": "#e5e7eb",
          "--error-bg": "#ffffff",
          "--error-text": "#000000",
          "--error-border": "#e5e7eb",
          "--warning-bg": "#ffffff",
          "--warning-text": "#000000",
          "--warning-border": "#e5e7eb",
          "--info-bg": "#ffffff",
          "--info-text": "#000000",
          "--info-border": "#e5e7eb",
        } as React.CSSProperties
      }
      toastOptions={{
        unstyled: false,
        style: {
          background: "#ffffff",
          color: "#000000",
          border: "1px solid #e5e7eb",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          opacity: 1,
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)",
        },
        classNames: {
          toast:
            "group toast !bg-white !text-black !border !border-gray-200 !shadow-xl !backdrop-blur-none !opacity-100 [&>*]:!bg-transparent",
          title: "!text-black font-semibold",
          description: "!text-gray-700",
          actionButton: "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground",
          cancelButton: "group-[.toast]:!bg-gray-100 group-[.toast]:!text-gray-700",
          closeButton: "!bg-white !text-black !border-gray-200",
          success: "!bg-white !text-black",
          error: "!bg-white !text-black",
          warning: "!bg-white !text-black",
          info: "!bg-white !text-black",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
