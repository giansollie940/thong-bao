// core.js — Cấu hình Supabase, trạng thái dùng chung (state) và tham chiếu DOM (el).

const config = window.APP_CONFIG || {};

export const isConfigured =
  config.SUPABASE_URL &&
  config.SUPABASE_KEY &&
  !config.SUPABASE_URL.includes("YOUR_") &&
  !config.SUPABASE_KEY.includes("YOUR_");

function clearLegacyPersistentAuth() {
  if (!isConfigured) return;

  try {
    const projectRef = new URL(config.SUPABASE_URL).hostname.split(".")[0];
    const legacyKey = `sb-${projectRef}-auth-token`;
    localStorage.removeItem(legacyKey);
  } catch (error) {
    console.warn("Không thể dọn session Supabase cũ trong localStorage.", error);
  }
}

clearLegacyPersistentAuth();

export const client = isConfigured
  ? window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.sessionStorage
        }
      }
    )
  : null;

export const IMAGE_BUCKET = "announcement-images";

export const contentRenderer = window.WeeklyContent;

if (!contentRenderer) {
  throw new Error("Thiếu content-renderer.js.");
}

export const contentInteractions = window.WeeklyInteractions;

if (!contentInteractions) {
  throw new Error("Thiếu content-interactions.js.");
}

export const appLoader = window.WeeklyLoader;

export const state = {
  user: null,
  weeks: [],
  announcements: [],
  categories: [],
  currentWeek: null,
  currentWeekState: "none",
  categoryFilter: "all",
  // id -> true/false for cards the reader opened or closed; others use the default.
  announcementOpen: new Map(),
  // Week picked in the sidebar; null = follow the featured (today's) week.
  selectedWeekId: null,
  viewMode: "agenda",
  readerId: null,
  readerOpen: false,
  schoolYearPreview: [],
  activeSchoolYear: "",
  yearFilter: "",
  archiveYearFilter: ""
};

export const $ = selector => document.querySelector(selector);

export const el = {
  currentWeekCard: $("#current-week-card"),
  currentAnnouncements: $("#current-announcements"),
  toggleAllAnnouncements: $("#toggle-all-announcements"),
  globalWeekFilter: $("#global-week-filter"),
  backToCurrentWeek: $("#back-to-current-week"),
  currentHeading: $("#current-heading"),
  currentSection: $("#current-section"),
  viewStage: $("#view-stage"),
  viewSwitcher: $("#view-switcher"),
  categoryDashboard: $("#category-dashboard"),
  globalSchoolYearFilter: $("#global-school-year-filter"),
  categoryDialog: $("#categories-dialog"),
  categoryForm: $("#category-form"),
  categoryManagerList: $("#category-manager-list"),
  categoryMessage: $("#category-message"),
  archiveGrid: $("#archive-grid"),
  archiveCount: $("#archive-count"),
  archiveYearFilter: $("#archive-year-filter"),
  archiveYearSummary: $("#archive-year-summary"),
  yearStrip: $("#year-strip"),
  yearCount: $("#year-count"),
  yearFilter: $("#year-filter"),
  yearSummary: $("#year-summary"),
  weekStateBadge: $("#week-state-badge"),
  adminToolbar: $("#admin-toolbar"),
  loginButton: $("#login-button"),
  logoutButton: $("#logout-button"),
  connectionBanner: $("#connection-banner"),
  searchForm: $("#search-form"),
  searchInput: $("#search-input"),
  searchResultsSection: $("#search-results-section"),
  searchResults: $("#search-results"),
  clearSearchButton: $("#clear-search-button"),
  themeToggle: $("#theme-toggle"),
  toast: $("#toast"),

  loginDialog: $("#login-dialog"),
  loginForm: $("#login-form"),
  loginMessage: $("#login-message"),

  announcementDialog: $("#announcement-dialog"),
  announcementForm: $("#announcement-form"),
  announcementDialogTitle: $("#announcement-dialog-title"),
  announcementMessage: $("#announcement-message"),

  weekDialog: $("#week-dialog"),
  weekForm: $("#week-form"),
  weekDialogTitle: $("#week-dialog-title"),
  weekMessage: $("#week-message"),

  bulkDialog: $("#bulk-dialog"),
  bulkForm: $("#bulk-form"),
  bulkMessage: $("#bulk-message"),
  bulkPreviewCount: $("#bulk-preview-count"),

  schoolYearDialog: $("#school-year-dialog"),
  schoolYearForm: $("#school-year-form"),
  schoolYearMessage: $("#school-year-message"),
  schoolYearPreview: $("#school-year-preview"),
  schoolYearPreviewSummary: $("#school-year-preview-summary"),

  archiveDialog: $("#archive-dialog"),
  archiveDialogTitle: $("#archive-dialog-title"),
  archiveDialogContent: $("#archive-dialog-content")
};

export function isAdmin() {
  return Boolean(state.user);
}
