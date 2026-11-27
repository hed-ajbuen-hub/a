window.DONATION_API_URL = "";

(() => {
    const localFrontendHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    const apiBaseUrl = localFrontendHost
        ? `http://${window.location.hostname === "localhost" ? "localhost" : "127.0.0.1"}:3000`
        : String(window.DONATION_API_URL || "").trim().replace(/\/+$/, "");
    const hostedOnGitHubPages = window.location.hostname.endsWith(".github.io");

    window.apiRequest = (path, options = {}) => {
        if (hostedOnGitHubPages && !apiBaseUrl) {
            return Promise.reject(new Error("Set the API URL in api-config.js before using this GitHub Pages site."));
        }
        return fetch(`${apiBaseUrl}${path}`, { ...options, credentials: "include" });
    };
})();