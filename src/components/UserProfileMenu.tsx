import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { User, KeyRound, LogOut, Camera, CalendarDays, Shield, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale, LOCALE_LABELS, LOCALE_FLAGS } from "@/i18n/translations";

const UserProfileMenu = () => {
  const { t, locale, setLocale } = useI18n();
  const { role, isSuperAdmin } = useUserRole();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
      setAvatarPreview(data.avatar_url || "");
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError(t("passwordMinError"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(t("passwordUpdateError"));
        return;
      }
      toast({ title: t("passwordUpdated") });
      setPasswordOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setPasswordError(t("passwordUpdateError"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      let avatarUrl = profile?.avatar_url || "";
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const fileName = `avatars/${user.id}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(fileName, avatarFile, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("media").getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }

      await supabase.from("profiles").update({
        full_name: fullName,
        avatar_url: avatarUrl,
      } as any).eq("id", user.id);

      setProfile({ ...profile, full_name: fullName, avatar_url: avatarUrl });
      setAvatarFile(null);
      toast({ title: t("profileUpdated") });
      setProfileOpen(false);
    } catch (err: any) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2 group hover:btn-hover-gradient">
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground max-w-[120px] truncate hidden sm:block group-hover:text-primary-foreground transition-colors">
              {displayName}
            </span>
            {role && (
              <span className={cn(
                "hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
                isSuperAdmin ? "bg-amber-500/15 text-amber-600" : role === "admin" ? "bg-blue-500/15 text-blue-600" : "bg-emerald-500/15 text-emerald-600",
                "group-hover:bg-white/20 group-hover:text-white"
              )}>
                <Shield className="h-2.5 w-2.5" />
                {isSuperAdmin ? "Super Admin" : role === "admin" ? "Admin" : "Colaborador"}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            {t("myProfile")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            {t("changePassword")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/agenda")}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Agenda
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe className="mr-2 h-4 w-4" />
              {LOCALE_FLAGS[locale]} {LOCALE_LABELS[locale]}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => (
                <DropdownMenuItem key={loc} onClick={() => setLocale(loc)}>
                  {LOCALE_FLAGS[loc]} {LOCALE_LABELS[loc]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/login");
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("myProfile")}</DialogTitle>
            <DialogDescription>{t("editProfileDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow-md hover:bg-primary/90"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <Label>{t("fullName")}</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t("fullNamePlaceholder")} />
            </div>
            <Button onClick={handleSaveProfile} disabled={profileSaving} className="w-full">
              {profileSaving ? t("saving") : t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("changePassword")}</DialogTitle>
            <DialogDescription>{t("changePasswordDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("newPassword")}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t("minChars")}
              />
            </div>
            <div>
              <Label>{t("confirmNewPassword")}</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder={t("repeatPassword")}
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <Button onClick={handleChangePassword} disabled={passwordSaving} className="w-full">
              {passwordSaving ? t("saving") : t("saveNewPassword")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserProfileMenu;
