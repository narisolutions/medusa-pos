import { formatDateOnly, formatTimeOnly } from "@/utils/datetime";

const useHeader = () => {
  const formatDate = (date: Date) => {
    return `${formatDateOnly(date)}, ${formatTimeOnly(date)}`;
  };

  return { formatDate };
};

export { useHeader };
