import { useEffect, useState, type FormEvent } from "react";
import { Camera, Download, KeyRound, LogOut, Save, Settings2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { routes } from "@/config/routes";
import { useAuthStore } from "@/features/auth/store";
import { profileApi } from "@/features/profile/api/profileApi";
import { ApiClientError } from "@/services/apiError";
import { applyPreferences, clearLocalProfile, defaultPreferences, loadAvatar, loadPreferences, prepareAvatar, saveAvatar, savePreferences, type ProfilePreferences } from "@/features/profile/localPreferences";
import { loadScans } from "@/features/homePlanters/localHistory";
import "@/features/profile/profile.css";

export default function ProfilePage() {
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [success, setSuccess] = useState("");
  const [avatar, setAvatar] = useState<string | null>(() => user ? loadAvatar(user.id) : null);
  const [avatarError, setAvatarError] = useState("");
  const [prefs, setPrefs] = useState<ProfilePreferences>(() => user ? loadPreferences(user.id) : defaultPreferences);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const userId = user?.id;
  const userName = user?.full_name;
  useEffect(() => {
    setFullName(userName ?? "");
    setAvatar(userId ? loadAvatar(userId) : null);
    const current = userId ? loadPreferences(userId) : defaultPreferences;
    setPrefs(current);
    applyPreferences(current);
  }, [userId, userName]);

  const profileMutation = useMutation({
    mutationFn: profileApi.update,
    onSuccess: updated => { updateUser(updated); setSuccess("Your name was saved to CropGuard."); },
  });
  const passwordMutation = useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: () => {
      setPassword({ current: "", next: "", confirm: "" });
      setPasswordError("");
      setPasswordSuccess("Password updated. Other refresh sessions have been revoked.");
    },
  });
  if (!user) return null;
  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSuccess("");
    if (fullName.trim().length < 2 || fullName.trim().length > 120) return;
    profileMutation.mutate({ full_name: fullName.trim() });
  }
  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordSuccess(""); setPasswordError("");
    if (password.next !== password.confirm) { setPasswordError("Passwords do not match."); return; }
    if (password.next.length < 8 || password.next.length > 72) { setPasswordError("Use a password between 8 and 72 characters."); return; }
    passwordMutation.mutate({ current_password: password.current, new_password: password.next });
  }
  async function handleAvatar(file?: File) {
    if (!file) return;
    setAvatarError("");
    try {
      const compressed = await prepareAvatar(file);
      saveAvatar(user!.id, compressed);
      setAvatar(compressed);
    } catch (error) { setAvatarError(error instanceof Error ? error.message : "Could not load picture."); }
  }
  function changePreference(key: keyof ProfilePreferences, enabled: boolean) {
    const next = { ...prefs, [key]: enabled };
    setPrefs(next); savePreferences(user!.id, next);
  }
  function exportSettings() {
    const data = { product: "CropGuard", exported_at: new Date().toISOString(),
      account: { name: user!.full_name, email: user!.email, role: user!.role },
      device_preferences: prefs, home_plant_scans: loadScans() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "cropguard-account-export.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const serverProfileError = profileMutation.error instanceof ApiClientError ? profileMutation.error.message : profileMutation.isError ? "Unable to save your name." : "";
  const serverPasswordError = passwordMutation.error instanceof ApiClientError ? passwordMutation.error.message : passwordMutation.isError ? "Unable to change your password." : "";

  return <div className="page">
    <PageHeader eyebrow="MY ACCOUNT" title="Your CropGuard profile" description="Customize your experience, protect your account, and manage your saved settings." />
    <div className="profile-grid">
      <article className="panel profile-card">
        <h2><UserRound size={20} /> Personal details</h2>
        <div className="cg-profile-hero">
          <div className="cg-profile-avatar">{avatar ? <img src={avatar} alt="Your saved profile picture" /> : user.full_name.slice(0,1).toUpperCase()}</div>
          <div><strong>{user.full_name}</strong><small>{user.email}</small><span className="cg-profile-chip">{user.role.replaceAll("_", " ")}</span></div>
        </div>
        <label className="button secondary cg-profile-upload"><Camera size={17} /> Change picture (this device)<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { void handleAvatar(e.target.files?.[0]); e.target.value=""; }} /></label>
        {avatar && <button className="button secondary" type="button" onClick={() => { saveAvatar(user.id,null); setAvatar(null); }}>Remove picture</button>}
        {avatarError && <p className="error-box" role="alert">{avatarError}</p>}
        <p className="profile-note">Your picture is saved on this device only, not uploaded to CropGuard.</p>
        <div className="profile-details">
          <div className="profile-detail"><span>Email</span><strong>{user.email}</strong></div>
          <div className="profile-detail"><span>Role</span><strong>{user.role.replaceAll("_", " ")}</strong></div>
          <div className="profile-detail"><span>Status</span><strong>{user.is_active ? "Active" : "Disabled"}</strong></div>
        </div>
        <form className="profile-form" onSubmit={submitProfile}>
          <label><span>Display name</span><input required minLength={2} maxLength={120} value={fullName} autoComplete="name" onChange={e => {setFullName(e.target.value);setSuccess("");}} /></label>
          {serverProfileError && <p className="error-box" role="alert">{serverProfileError}</p>}
          {success && <p className="success-box" role="status">{success}</p>}
          <button type="submit" className="button primary" disabled={profileMutation.isPending || fullName.trim() === user.full_name}><Save size={16} /> {profileMutation.isPending ? "Saving…" : "Save name"}</button>
        </form>
      </article>
      <article className="panel profile-card">
        <h2><Settings2 size={20} /> App preferences</h2>
        <p>These preferences stay on this device and can be changed anytime.</p>
        <div className="cg-settings-list">
          <label><span><strong>Compact layout</strong><small>Fit more content on mobile and desktop</small></span><input type="checkbox" checked={prefs.compactView} onChange={e => changePreference("compactView",e.target.checked)} /></label>
          <label><span><strong>Reduce animations</strong><small>Minimize movement and transitions</small></span><input type="checkbox" checked={prefs.reduceMotion} onChange={e => changePreference("reduceMotion",e.target.checked)} /></label>
          <label><span><strong>Auto-save Home Planters scans</strong><small>Save observations locally after each scan</small></span><input type="checkbox" checked={prefs.autoSaveScans} onChange={e => changePreference("autoSaveScans",e.target.checked)} /></label>
        </div>
        <div className="cg-settings-actions">
          <button type="button" className="button secondary" onClick={exportSettings}><Download size={16}/> Export account & local scans</button>
          <button type="button" className="button secondary" onClick={() => { clearLocalProfile(user.id); setAvatar(null); setPrefs(defaultPreferences); }}><Trash2 size={16}/> Reset local preferences & picture</button>
        </div>
        <p className="profile-note">Export contains your email and scan notes, but never passwords, photo bytes or authentication tokens.</p>
      </article>
      <article className="panel profile-card">
        <h2><KeyRound size={20}/> Password & security</h2>
        <p>Your password is changed through CropGuard's existing secured API.</p>
        <form className="profile-form" onSubmit={submitPassword}>
          <label><span>Current password</span><input type="password" autoComplete="current-password" required minLength={8} maxLength={72} value={password.current} onChange={e => setPassword(v => ({ ...v, current: e.target.value }))} /></label>
          <label><span>New password</span><input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password.next} onChange={e => setPassword(v => ({ ...v, next: e.target.value }))} /></label>
          <label><span>Confirm new password</span><input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password.confirm} onChange={e => setPassword(v => ({ ...v, confirm: e.target.value }))} /></label>
          {(passwordError || serverPasswordError) && <p className="error-box" role="alert">{passwordError || serverPasswordError}</p>}
          {passwordSuccess && <p className="success-box" role="status">{passwordSuccess}</p>}
          <button className="button primary" type="submit" disabled={passwordMutation.isPending}><ShieldCheck size={16}/>{passwordMutation.isPending ? "Updating…" : "Change password"}</button>
        </form>
        <p className="profile-note">After changing your password, sign out and sign in again to refresh this device's session.</p>
        <button type="button" className="button secondary" onClick={() => { void logout(); navigate(routes.login,{replace:true}); }}><LogOut size={16}/> Sign out</button>
      </article>
    </div>
  </div>;
}
