import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-white !text-black !border !border-gray-200 shadow-xl !backdrop-blur-none",
          title: "!text-black font-semibold",
          description: "!text-gray-700",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-700",
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
