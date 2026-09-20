/**
 * Single-flight refresh mutex preventing thundering herds on concurrent 401 Unauthorized responses.
 */
export class RefreshMutex {
  private activeRefreshPromise: Promise<string | null> | null = null;

  async executeSingleFlight(refreshFn: () => Promise<string | null>): Promise<string | null> {
    if (this.activeRefreshPromise) {
      return this.activeRefreshPromise;
    }

    this.activeRefreshPromise = (async () => {
      try {
        return await refreshFn();
      } finally {
        this.activeRefreshPromise = null;
      }
    })();

    return this.activeRefreshPromise;
  }

  isRefreshing(): boolean {
    return this.activeRefreshPromise !== null;
  }
}
