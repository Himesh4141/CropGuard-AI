/**
 * A short, in-memory history for the Android hardware Back button.
 * Never persists paths, tokens or user details. Changing the authenticated
 * account resets the trail so Back cannot cross between user sessions.
 */
export class AndroidBackTrail {
  private paths: string[] = [];
  private identity: string | null = null;

  observe(path: string, identity: string | null): void {
    if (this.identity !== identity) {
      this.paths = [];
      this.identity = identity;
    }
    if (this.paths[this.paths.length - 1] === path) return;
    this.paths.push(path);
    if (this.paths.length > 30) this.paths.shift();
  }

  /** null means remain on the current screen. */
  previous(path: string, identity: string | null, roleHome: string): string | null {
    this.observe(path, identity);
    if (path === roleHome) return null;
    // A deep link, login, or app restart may not have a usable previous page.
    this.paths.pop();
    while (this.paths.length) {
      const prior = this.paths.pop();
      if (prior && prior !== path && prior !== "/" && prior !== "/login" && prior !== "/register") {
        this.paths.push(prior);
        return prior;
      }
    }
    this.paths.push(roleHome);
    return roleHome;
  }
}
