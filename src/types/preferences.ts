export type DateTimePreferences = {
  dateFormat: "system" | "DD.MM.YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
  timeFormat: "system" | "24h" | "12h";
};

export type DisplayPreferences = {
  startFullscreen: boolean;
};

export type UserPreferences = {
  dateTime: DateTimePreferences;
  display: DisplayPreferences;
};
