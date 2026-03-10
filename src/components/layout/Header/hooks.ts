import { formatDateOnly, formatTimeOnly } from "@/utils/preferences";

const useHeader = () => {
  const formatDate = (date: Date) => {
    return `${formatDateOnly(date)}, ${formatTimeOnly(date)}`;
  };

  return { formatDate };
};

export { useHeader };
