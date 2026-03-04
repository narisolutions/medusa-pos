import React from "react";
import { AdminOrder } from "@medusajs/types";
import { formatTimeAgo, formatExactTime } from "@/utils/helpers";
import { Clock } from "lucide-react";
import { useActivityEvents } from "./hooks";

interface Props {
  order: AdminOrder;
}

const Activity: React.FC<Props> = ({ order }) => {
  const events = useActivityEvents(order);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
        {events.map((event) => (
          <div key={event.id} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
            <div className="mb-2">
              <h3 className="text-base font-medium text-gray-900">{event.title}</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formatTimeAgo(event.timestamp)}</span>
              <span className="text-gray-300">•</span>
              <span>{formatExactTime(event.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Activity;

